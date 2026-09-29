#!/usr/bin/env python3
"""한칸이야기 백엔드 스텁 — `docs/api-contract.md` 를 그대로 구현한 임시 서버.

버릴 물건이다. 팀원의 진짜 FastAPI 서버가 8000번을 차지하면 이 파일은 지운다.
있는 이유는 두 가지다.

1. 프론트의 실서버 분기(`src/api/index.ts` 의 `useMock` 아래)가 한 번도 실행된
   적이 없다. 목 엔진은 함수 첫 줄에서 리턴해 버리므로 프록시·multipart·SSE·
   오류 매핑이 전부 미검증 코드다. 그걸 통합 당일이 아니라 지금 돌려본다.
2. 계약서를 실행 가능한 형태로 만들어 팀원에게 넘긴다. 어떤 JSON 을 뱉어야
   하는지 돌려보고 확인할 수 있다.

하지 않는 것: DB, Alembic, Docker, Azure, 실제 AI, 실제 TTS. 전부 팀원 몫이다.
계약에 없는 필드는 만들지 않는다 — 프론트가 기대게 되면 진짜 서버에서 깨진다.

    py tools/stub-server/stub.py

띄운 뒤 http://localhost:8000/ 을 열면 시나리오 조작판이 나온다.
프론트는 `.env` 의 `VITE_ENGINE` 을 `mock` 이 아닌 값으로 바꾸면 이 서버를 본다.
"""

import json
import math
import re
import socket
import struct
import sys
import threading
import time
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PORT = 8000
HERE = Path(__file__).resolve().parent

# 콘솔이 cp949 여도 한국어 로그가 깨지지 않게 한다
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────
# 시나리오 설정. http://localhost:8000/ 조작판이나 /__stub/config 로 바꾼다
# ─────────────────────────────────────────────────────────────

CONFIG = {
    # 분석 실패 주입. None 이면 성공.
    # NO_CHARACTER MULTIPLE_CHARACTERS LOW_CONFIDENCE UNSUPPORTED_IMAGE
    # ENGINE_TIMEOUT ENGINE_ERROR
    "fail": None,
    # SSE 단계 사이 간격(ms). 목 엔진은 700 이다
    "stage_delay_ms": 700,
    # S-05-05 조건부 노출 경계는 0.6 이다
    "confidence": 0.82,
    # right_elbow 의 score 를 0.34 로 떨어뜨려 S-06 보정 유도를 켠다
    "low_score_joint": True,
    # 16 = 서버가 head 를 합성해 보낸다 (open-decisions 1번 B안)
    # 15 = head 없이 보낸다 (A안). 프론트가 깨지는 것을 눈으로 본다
    "joints": 16,
    # original = 좌표를 원본 이미지 기준으로 (지금 프론트가 가정하는 것)
    # crop     = 잘라낸 영역 기준으로 (통합 정리 문서의 통일안, open-decisions 2번)
    "coords": "original",
    # True 면 audioUrl 에 재생 가능한 wav 를 준다. False 면 null (부분 실패 경로)
    "audio": False,
    # 이 단계를 보낸 뒤 SSE 연결을 끊는다. 재연결 테스트용
    # uploaded segmenting estimating_pose building_skeleton
    "sse_drop_at": None,
    # HTTP 오류 주입. characters | steps | stories
    "http_fail": None,
    # 모든 응답에 지연(ms)
    "latency_ms": 0,
}

FAIL_CODES = [
    "NO_CHARACTER", "MULTIPLE_CHARACTERS", "LOW_CONFIDENCE",
    "UNSUPPORTED_IMAGE", "ENGINE_TIMEOUT", "ENGINE_ERROR",
]

# 프론트가 보내는 것을 눈으로 보려고 남긴다. 조작판이 읽어 간다
REQUEST_LOG = []
LOG_LOCK = threading.Lock()


def note(line):
    with LOG_LOCK:
        REQUEST_LOG.append({"t": time.strftime("%H:%M:%S"), "line": line})
        del REQUEST_LOG[:-80]
    print("  " + line, flush=True)


# ─────────────────────────────────────────────────────────────
# 고정값. `src/api/mock/fixtures.ts` 와 같은 값을 쓴다.
# 스텁이 목과 다른 값을 내면 "목에서는 됐는데" 가 생긴다
# ─────────────────────────────────────────────────────────────

REST_KEYPOINTS = {
    "hip":            (0.500, 0.536, 0.95),
    "torso":          (0.500, 0.366, 0.93),
    "neck":           (0.500, 0.307, 0.88),
    "head":           (0.500, 0.193, 0.92),
    "right_shoulder": (0.380, 0.357, 0.76),
    "right_elbow":    (0.320, 0.468, 0.34),
    "right_hand":     (0.295, 0.575, 0.81),
    "left_shoulder":  (0.620, 0.357, 0.89),
    "left_elbow":     (0.680, 0.468, 0.87),
    "left_hand":      (0.705, 0.575, 0.90),
    "right_hip":      (0.430, 0.550, 0.93),
    "right_knee":     (0.415, 0.711, 0.85),
    "right_foot":     (0.400, 0.868, 0.79),
    "left_hip":       (0.570, 0.550, 0.93),
    "left_knee":      (0.585, 0.711, 0.86),
    "left_foot":      (0.600, 0.868, 0.80),
}

# `root` 는 프론트가 hip 에서 파생시킨다. 서버는 보내지 않는다 (계약 1절)
EXPECTED_JOINTS = set(REST_KEYPOINTS)

BBOX = (0.22, 0.12, 0.56, 0.78)

# [id, 라벨, 임시 이모지]. id 는 kind 안에서만 유일하다 (docs/id-conventions.md 1절)
RAW_CHOICES = {
    "place": [
        ("space", "우주", "🪐"), ("forest", "숲", "🌳"), ("sea", "바다", "🌊"),
        ("school", "학교", "🏫"), ("town", "마을", "🏘"), ("cave", "동굴", "🕳"),
    ],
    "problem": [
        ("lost", "길을 잃었어요", "❓"), ("rain", "비가 내렸어요", "🌧"),
        ("hungry", "배가 고팠어요", "🍞"), ("dark", "어두워졌어요", "🌙"),
        ("fall", "넘어졌어요", "💥"), ("alone", "혼자가 됐어요", "😢"),
    ],
    "action": [
        ("ask", "물어봤어요", "🗣"), ("run", "달려갔어요", "🏃"),
        ("hide", "숨었어요", "🫣"), ("help", "도와줬어요", "🤝"),
        ("wait", "기다렸어요", "⏳"), ("shout", "크게 불렀어요", "📣"),
    ],
    "result": [
        ("home", "집에 갔어요", "🏠"), ("friend", "친구를 만났어요", "🧑‍🤝‍🧑"),
        ("gift", "선물을 받았어요", "🎁"), ("sun", "해가 떴어요", "☀️"),
        ("sleep", "잠이 들었어요", "😴"), ("party", "모두 기뻐했어요", "🎉"),
    ],
}

LABELS = {k: {i: lab for i, lab, _ in rows} for k, rows in RAW_CHOICES.items()}

# 설계서 2.1 지원 수준별 선택지 수. 서버가 개수를 맞춰 보낸다 (계약 2절)
LEVEL_COUNT = {1: 2, 2: 4, 3: 6}

# 장면 번호에 고정된 모션 (계약 2절). 아이가 고르는 것이 아니다
SCENE_MOTIONS = ["walk", "look", "wave", "jump"]

STAGES = [
    ("uploaded", 0.10, "그림을 받았어요"),
    ("segmenting", 0.35, "친구를 찾고 있어요"),
    ("estimating_pose", 0.70, "관절을 찾고 있어요"),
    ("building_skeleton", 0.90, "뼈대를 만들고 있어요"),
]


def icon_data_uri(emoji):
    """선택지 아이콘. `public/icons/{kind}/{id}.png` 가 아직 비어 있으므로
    파일에 의존하지 않는 data: URI 로 준다 (목 엔진과 같은 방식)."""
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'
        '<circle cx="60" cy="60" r="50" fill="#F2F6FC"/>'
        f'<text x="60" y="80" font-size="64" text-anchor="middle">{emoji}</text>'
        "</svg>"
    )
    from urllib.parse import quote
    return "data:image/svg+xml;utf8," + quote(svg, safe="")


CHOICES = {
    kind: [
        {"id": i, "iconUrl": icon_data_uri(emoji), "label": lab}
        for i, lab, emoji in rows
    ]
    for kind, rows in RAW_CHOICES.items()
}


# ─────────────────────────────────────────────────────────────
# 메모리 상태. DB 는 팀원 몫이다
# ─────────────────────────────────────────────────────────────

ANALYSES = {}       # analysisId -> dict
STORIES = {}        # storyId -> Story (최신순 정렬은 created 로)
SETTINGS = {"level": 2, "muteAll": False, "keepOriginal": False, "diagnostics": False}
SEQ = {"n": 0}
SEQ_LOCK = threading.Lock()

SAMPLE_STORY = {
    "storyId": "demo-1",
    "title": "숲으로 간 날",
    "createdAt": "2026-09-10",
    "scenes": [
        {"index": 0, "sentence": "내 친구가 숲으로 갔어요.", "audioUrl": None,
         "motion": "walk", "backgroundUrl": None},
        {"index": 1, "sentence": "그런데 길을 잃었어요.", "audioUrl": None,
         "motion": "look", "backgroundUrl": None},
        {"index": 2, "sentence": "친구를 크게 불렀어요.", "audioUrl": None,
         "motion": "wave", "backgroundUrl": None},
        {"index": 3, "sentence": "그래서 집에 갈 수 있었어요.", "audioUrl": None,
         "motion": "jump", "backgroundUrl": None},
    ],
    "_created": 0.0,
}
STORIES["demo-1"] = dict(SAMPLE_STORY)


def next_id(prefix):
    with SEQ_LOCK:
        SEQ["n"] += 1
        return f"{prefix}-{SEQ['n']:04x}{int(time.time()) % 0x10000:04x}"


# ─────────────────────────────────────────────────────────────
# multipart 와 이미지 크기 읽기.
# 이미지를 해석하지는 않는다. 프론트가 정말 1600px / JPEG 로 줄여 보내는지
# (계약 1절) 확인하려고 크기만 본다
# ─────────────────────────────────────────────────────────────

def parse_multipart(body, content_type):
    """`name="image"` 파트만 꺼낸다. 완전한 파서가 아니다."""
    m = re.search(r'boundary="?([^";]+)"?', content_type or "")
    if not m:
        return None
    sep = b"--" + m.group(1).encode()
    for part in body.split(sep):
        head, _, data = part.partition(b"\r\n\r\n")
        if b'name="image"' not in head:
            continue
        headers = head.decode("utf-8", "replace")
        fn = re.search(r'filename="([^"]*)"', headers)
        ct = re.search(r"Content-Type:\s*([^\r\n]+)", headers, re.I)
        return {
            "bytes": data.rstrip(b"\r\n-"),
            "filename": fn.group(1) if fn else "",
            "content_type": ct.group(1).strip() if ct else "",
        }
    return None


def image_size(data):
    """PNG / JPEG 헤더에서 크기만 읽는다. 실패하면 None."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        w, h = struct.unpack(">II", data[16:24])
        return w, h
    if data[:2] == b"\xff\xd8":
        i = 2
        n = len(data)
        while i + 9 < n:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7 or marker == 0x01:
                i += 2
                continue
            seg_len = struct.unpack(">H", data[i + 2:i + 4])[0]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return w, h
            i += 2 + seg_len
    return None


# ─────────────────────────────────────────────────────────────
# 응답 만들기
# ─────────────────────────────────────────────────────────────

def build_keypoints():
    """설정에 따라 관절을 만든다.

    joints=15 는 head 를 빼고 보낸다. 통합 정리 문서의 통일안이지만
    `skeleton.ts` 가 `BONES` 와 `boneScale()` 두 군데서 head 에 의존하므로
    프론트가 깨진다 — open-decisions 1번을 눈으로 확인하려고 남긴 스위치다.
    """
    out = {}
    for name, (x, y, score) in REST_KEYPOINTS.items():
        if name == "head" and CONFIG["joints"] == 15:
            continue
        if name == "right_elbow" and not CONFIG["low_score_joint"]:
            score = 0.88
        out[name] = {"x": round(x, 4), "y": round(y, 4), "score": score}

    if CONFIG["coords"] == "crop":
        # 포즈 모델은 잘라낸 영역에서 좌표를 낸다. 그 값을 그대로 넘기면
        # 어떻게 되는지 보여준다 — 프론트는 원본 이미지로 렌더하므로 어긋난다
        bx, by, bw, bh = BBOX
        for kp in out.values():
            kp["x"] = round((kp["x"] - bx) / bw, 4)
            kp["y"] = round((kp["y"] - by) / bh, 4)
    return out


def analysis_response(rec):
    fail = CONFIG["fail"]
    if fail and fail != "ENGINE_TIMEOUT":
        return {
            "version": "1.0",
            "engine": "finetuned",
            "character": {"found": False},
            "error": {
                "code": fail,
                "message": f"stub: {fail} 주입됨 (로그용 문장, 아이에게 보여주지 않는다)",
                "retryable": fail != "ENGINE_ERROR",
            },
        }

    w, h = rec.get("size") or (1000, 1000)
    if CONFIG["coords"] == "crop":
        # 계약에 명시해야 하는 것: image.width/height 가 잘라낸 그림의 크기인지
        # 원본 크기인지 (open-decisions 2번)
        w, h = max(1, round(w * BBOX[2])), max(1, round(h * BBOX[3]))

    return {
        "version": "1.0",
        "engine": "finetuned",
        "image": {"width": w, "height": h},
        "character": {
            "found": True,
            "confidence": CONFIG["confidence"],
            "bbox": list(BBOX),
            "maskUrl": None,
            "keypoints": build_keypoints(),
        },
        "elapsedMs": int((time.time() - rec["created"]) * 1000),
    }


def build_story(picks):
    """계약 2절. 장면은 항상 4개, 모션은 장면 번호에 고정."""
    def lab(kind):
        return LABELS[kind].get(picks.get(kind, ""), "")

    sid = next_id("s")
    sentences = [
        f"내 친구가 {lab('place')}으로 갔어요.",
        f"그런데 {lab('problem')}.",
        f"그래서 {lab('action')}.",
        f"마지막에 {lab('result')}.",
    ]
    scenes = []
    for i in range(4):
        # 문장 생성은 됐는데 음성 합성만 실패하면 audioUrl: null 로 200 을 낸다.
        # 부분 실패를 전체 실패로 처리하지 않는다 (계약 2절)
        audio = f"/__stub/voice/{sid}/{i}.wav" if CONFIG["audio"] else None
        scenes.append({
            "index": i,
            "sentence": sentences[i],
            "audioUrl": audio,
            "motion": SCENE_MOTIONS[i],
            "backgroundUrl": None,   # 아직 그림이 없다. 계약대로 null
        })
    return {
        "storyId": sid,
        "title": f"{lab('place')}에 간 날",
        "createdAt": time.strftime("%Y-%m-%d"),
        "scenes": scenes,
        "_created": time.time(),
    }


def public_story(s):
    return {k: v for k, v in s.items() if not k.startswith("_")}


def beep_wav(seconds=0.6, freq=440.0, rate=16000):
    """실제 TTS 는 팀원 몫이다. 여기서는 낭독 버튼과 재생 경로가 살아 있는지만
    보려고 사인파 하나를 낸다."""
    n = int(seconds * rate)
    frames = bytearray()
    for i in range(n):
        env = min(1.0, i / 400, (n - i) / 400)
        v = int(9000 * env * math.sin(2 * math.pi * freq * i / rate))
        frames += struct.pack("<h", v)
    data = bytes(frames)
    return (b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt "
            + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
            + b"data" + struct.pack("<I", len(data)) + data)


# ─────────────────────────────────────────────────────────────
# 샘플 그림. S-03 의 「샘플 그림으로 해보기」는 목 엔진에서만 보이므로
# (`S03Upload.tsx` 49행) 실서버 모드에서는 고를 그림이 따로 필요하다.
# 관절 좌표가 이 그림의 뼈대와 일치하도록 그린다
# ─────────────────────────────────────────────────────────────

SAMPLE_W, SAMPLE_H = 820, 1100
SAMPLE_PATH = HERE / "sample-drawing.png"


def make_sample_png():
    buf = bytearray(b"\xff" * (SAMPLE_W * SAMPLE_H))

    def dot(cx, cy, r, v=70):
        for y in range(max(0, cy - r), min(SAMPLE_H, cy + r + 1)):
            dy = y - cy
            for x in range(max(0, cx - r), min(SAMPLE_W, cx + r + 1)):
                if (x - cx) ** 2 + dy * dy <= r * r:
                    buf[y * SAMPLE_W + x] = v

    def line(a, b, r=5):
        (x0, y0), (x1, y1) = a, b
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for s in range(steps + 1):
            dot(round(x0 + (x1 - x0) * s / steps), round(y0 + (y1 - y0) * s / steps), r)

    def p(name):
        x, y, _ = REST_KEYPOINTS[name]
        return round(x * SAMPLE_W), round(y * SAMPLE_H)

    bones = [
        ("hip", "torso"), ("torso", "neck"),
        ("neck", "right_shoulder"), ("neck", "left_shoulder"),
        ("right_shoulder", "right_elbow"), ("right_elbow", "right_hand"),
        ("left_shoulder", "left_elbow"), ("left_elbow", "left_hand"),
        ("hip", "right_hip"), ("hip", "left_hip"),
        ("right_hip", "right_knee"), ("right_knee", "right_foot"),
        ("left_hip", "left_knee"), ("left_knee", "left_foot"),
    ]
    for a, b in bones:
        line(p(a), p(b))

    hx, hy = p("head")
    nx, ny = p("neck")
    line((nx, ny), (hx, hy + 78))              # 목
    for t in range(360):                       # 머리 윤곽
        a = math.radians(t)
        dot(round(hx + 74 * math.cos(a)), round(hy + 80 * math.sin(a)), 5)
    dot(hx - 26, hy - 14, 7, 40)               # 눈
    dot(hx + 26, hy - 14, 7, 40)
    for t in range(30, 151):                   # 웃는 입
        a = math.radians(t)
        dot(round(hx - 34 * math.cos(a)), round(hy + 18 + 26 * math.sin(a)), 4, 40)

    raw = bytearray()
    for y in range(SAMPLE_H):
        raw.append(0)
        raw += buf[y * SAMPLE_W:(y + 1) * SAMPLE_W]

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", SAMPLE_W, SAMPLE_H, 8, 0, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(bytes(raw), 6))
           + chunk(b"IEND", b""))
    SAMPLE_PATH.write_bytes(png)
    return png


# ─────────────────────────────────────────────────────────────
# 조작판
# ─────────────────────────────────────────────────────────────

PANEL = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>한칸이야기 백엔드 스텁</title>
<style>
 :root{color-scheme:light dark}
 body{font:14px/1.6 system-ui,sans-serif;margin:0;padding:24px;max-width:760px}
 h1{font-size:17px;margin:0 0 4px}
 p.sub{margin:0 0 20px;opacity:.7}
 fieldset{border:1px solid #8884;border-radius:10px;margin:0 0 14px;padding:12px 14px}
 legend{padding:0 6px;font-weight:600}
 button{font:inherit;padding:5px 11px;margin:3px 4px 3px 0;border:1px solid #8886;
        border-radius:7px;background:#8881;cursor:pointer}
 button.on{background:#7386F5;color:#fff;border-color:#7386F5}
 code{background:#8882;padding:1px 5px;border-radius:4px}
 #log{font:12px/1.5 ui-monospace,monospace;background:#8881;border-radius:8px;
      padding:10px;height:220px;overflow:auto;white-space:pre-wrap}
 a{color:#7386F5}
</style></head><body>
<h1>한칸이야기 백엔드 스텁</h1>
<p class="sub">버릴 서버다. 계약은 <code>docs/api-contract.md</code>.
 프론트는 <code>VITE_ENGINE</code>이 <code>mock</code>이 아니면 여기를 본다.</p>

<fieldset><legend>분석 실패 주입 (S-04 → E-01)</legend><div id="fail"></div></fieldset>

<fieldset><legend>미결정 항목 (docs/open-decisions.md)</legend>
 <div>관절 수 <span id="joints"></span>
  <small style="opacity:.7">16 = 서버가 head 합성(B안) · 15 = head 없음(A안)</small></div>
 <div>좌표 기준 <span id="coords"></span>
  <small style="opacity:.7">crop 으로 두면 캐릭터가 어긋나는 것을 볼 수 있다</small></div>
</fieldset>

<fieldset><legend>그 밖</legend>
 <div>신뢰도 <span id="confidence"></span>
  <small style="opacity:.7">0.6 미만이면 S-05 에 「어른에게 도움 받기」</small></div>
 <div>관절 score 낮춤 <span id="low_score_joint"></span>
  <small style="opacity:.7">S-06 보정 유도</small></div>
 <div>음성 <span id="audio"></span>
  <small style="opacity:.7">null 이면 S-09 낭독 버튼 비활성</small></div>
 <div>SSE 끊기 <span id="sse_drop_at"></span></div>
 <div>HTTP 오류 <span id="http_fail"></span></div>
 <div>단계 간격 <span id="stage_delay_ms"></span></div>
</fieldset>

<fieldset><legend>샘플 그림</legend>
 <p style="margin:0">S-03 의 「샘플 그림으로 해보기」는 목 엔진에서만 보인다.
  <a href="/__stub/sample.png" download>sample-drawing.png</a> 을 내려받아
  「앨범에서 고르기」로 넣는다. 관절 좌표가 이 그림에 맞춰져 있다.</p>
</fieldset>

<fieldset><legend>받은 요청</legend><div id="log">…</div></fieldset>

<script>
const OPTS = {
  fail: [[null,"성공"],["NO_CHARACTER","NO_CHARACTER"],["MULTIPLE_CHARACTERS","MULTIPLE"],
         ["LOW_CONFIDENCE","LOW_CONF"],["UNSUPPORTED_IMAGE","UNSUPPORTED"],
         ["ENGINE_TIMEOUT","TIMEOUT(30초)"],["ENGINE_ERROR","ENGINE_ERROR"]],
  joints: [[16,"16"],[15,"15"]],
  coords: [["original","original"],["crop","crop"]],
  confidence: [[0.82,"0.82"],[0.55,"0.55"]],
  low_score_joint: [[true,"켬"],[false,"끔"]],
  audio: [[false,"null"],[true,"wav"]],
  sse_drop_at: [[null,"안 끊음"],["segmenting","segmenting 뒤"],["estimating_pose","estimating 뒤"]],
  http_fail: [[null,"없음"],["characters","characters 500"],["steps","steps 500"],["stories","stories 500"]],
  stage_delay_ms: [[700,"700ms"],[80,"80ms"],[3000,"3초"]],
};
let cfg = {};
function draw(){
  for (const [key, opts] of Object.entries(OPTS)){
    const host = document.getElementById(key);
    host.innerHTML = "";
    for (const [val, label] of opts){
      const b = document.createElement("button");
      b.textContent = label;
      if (JSON.stringify(cfg[key]) === JSON.stringify(val)) b.className = "on";
      b.onclick = () => send({[key]: val});
      host.appendChild(b);
    }
  }
}
async function send(patch){
  const r = await fetch("/__stub/config", {method:"POST", body: JSON.stringify(patch)});
  cfg = await r.json(); draw();
}
async function tick(){
  const r = await fetch("/__stub/log");
  const {config, log} = await r.json();
  cfg = config; draw();
  const el = document.getElementById("log");
  const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
  el.textContent = log.map(l => l.t + "  " + l.line).join("\\n") || "아직 없음";
  if (atEnd) el.scrollTop = el.scrollHeight;
}
tick(); setInterval(tick, 1200);
</script></body></html>"""


# ─────────────────────────────────────────────────────────────
# 핸들러
# ─────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "hankan-stub/0.1"

    # 기본 로그는 시끄럽다. note() 로 필요한 것만 남긴다
    def log_message(self, fmt, *args):
        pass

    def handle(self):
        # 브라우저는 keep-alive 연결을 수시로 그냥 끊는다. 그때마다 파이썬이
        # 역추적을 뱉으면 진짜 오류가 묻힌다
        try:
            super().handle()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    # ---------- 보내기 ----------

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")

    def send_json(self, obj, status=200):
        if CONFIG["latency_ms"]:
            time.sleep(CONFIG["latency_ms"] / 1000)
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, body, ctype, status=200, download=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        if download:
            self.send_header("Content-Disposition", f'attachment; filename="{download}"')
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def read_json(self):
        try:
            return json.loads(self.read_body() or b"{}")
        except Exception:
            return {}

    # ---------- 메서드 ----------

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        path, q = u.path, parse_qs(u.query)

        if path == "/":
            return self.send_bytes(PANEL.encode(), "text/html; charset=utf-8")
        if path == "/health":
            return self.send_json({"status": "ok", "engine": "stub"})
        if path == "/__stub/config":
            return self.send_json(CONFIG)
        if path == "/__stub/log":
            with LOG_LOCK:
                return self.send_json({"config": CONFIG, "log": list(REQUEST_LOG)})
        if path == "/__stub/sample.png":
            png = SAMPLE_PATH.read_bytes() if SAMPLE_PATH.exists() else make_sample_png()
            return self.send_bytes(png, "image/png", download="sample-drawing.png")

        m = re.fullmatch(r"/__stub/voice/([^/]+)/(\d+)\.wav", path)
        if m:
            return self.send_bytes(beep_wav(), "audio/wav")

        # GET /api/characters/{id}/events — SSE
        m = re.fullmatch(r"/api/characters/([^/]+)/events", path)
        if m:
            return self.sse_events(m.group(1))

        # GET /api/characters/{id}
        m = re.fullmatch(r"/api/characters/([^/]+)", path)
        if m:
            rec = ANALYSES.get(m.group(1))
            if not rec:
                return self.send_json({"error": "unknown analysisId"}, 404)
            res = analysis_response(rec)
            found = res["character"]["found"]
            note(f"GET  /api/characters/{m.group(1)} → found={found} "
                 f"joints={CONFIG['joints']} coords={CONFIG['coords']}")
            return self.send_json(res)

        # GET /api/steps?kind=&level=
        if path == "/api/steps":
            if CONFIG["http_fail"] == "steps":
                note("GET  /api/steps → 500 주입")
                return self.send_json({"error": {"code": "ENGINE_ERROR"}}, 500)
            kind = (q.get("kind") or [""])[0]
            level = int((q.get("level") or ["2"])[0])
            if kind not in CHOICES:
                return self.send_json({"error": "bad kind"}, 400)
            count = LEVEL_COUNT.get(level, 4)
            note(f"GET  /api/steps kind={kind} level={level} → {count}개")
            return self.send_json(CHOICES[kind][:count])

        # GET /api/stories/{id}
        m = re.fullmatch(r"/api/stories/([^/]+)", path)
        if m:
            s = STORIES.get(m.group(1))
            if not s:
                return self.send_json({"error": "unknown storyId"}, 404)
            return self.send_json(public_story(s))

        # GET /api/stories — 최신순
        if path == "/api/stories":
            items = sorted(STORIES.values(), key=lambda s: s["_created"], reverse=True)
            note(f"GET  /api/stories → {len(items)}건")
            return self.send_json([public_story(s) for s in items])

        # GET /api/settings
        if path == "/api/settings":
            return self.send_json(SETTINGS)

        return self.send_json({"error": "not found", "path": path}, 404)

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/__stub/config":
            patch = self.read_json()
            CONFIG.update({k: v for k, v in patch.items() if k in CONFIG})
            note(f"설정 변경 {patch}")
            return self.send_json(CONFIG)

        # POST /api/characters
        if path == "/api/characters":
            body = self.read_body()
            if CONFIG["http_fail"] == "characters":
                note(f"POST /api/characters ({len(body)}B) → 500 주입")
                return self.send_json({"error": {"code": "ENGINE_ERROR"}}, 500)
            part = parse_multipart(body, self.headers.get("Content-Type"))
            rec = {"created": time.time(), "size": None}
            if part:
                size = image_size(part["bytes"])
                rec["size"] = size
                long_side = max(size) if size else 0
                # 계약 1절: 프론트가 긴 변 1600px, JPEG 0.85 로 줄여 보낸다
                warn = ""
                if long_side > 1600:
                    warn = f"  ⚠ 긴 변 {long_side}px — 계약은 1600px"
                if part["content_type"] and "jpeg" not in part["content_type"]:
                    warn += f"  ⚠ {part['content_type']} — 계약은 JPEG"
                note(f"POST /api/characters  {len(part['bytes'])//1024}KB "
                     f"{part['content_type']} {size}{warn}")
            else:
                note(f"POST /api/characters  multipart 파싱 실패 ({len(body)}B)")
            aid = next_id("a")
            ANALYSES[aid] = rec
            return self.send_json({"analysisId": aid})

        # POST /api/stories
        if path == "/api/stories":
            picks = self.read_json()
            if CONFIG["http_fail"] == "stories":
                note("POST /api/stories → 500 주입")
                return self.send_json({"error": {"code": "ENGINE_ERROR"}}, 500)
            missing = [k for k in ("place", "problem", "action", "result") if k not in picks]
            if missing:
                note(f"POST /api/stories  ⚠ 빠진 단계 {missing}")
            # 문장 생성 + 음성 합성 시간을 흉내낸다. 프론트는 이 동안 S-08 에 머문다
            time.sleep(CONFIG["stage_delay_ms"] / 1000 * 2)
            s = build_story(picks)
            STORIES[s["storyId"]] = s
            note(f"POST /api/stories {picks} → {s['storyId']} "
                 f"audio={'wav' if CONFIG['audio'] else 'null'}")
            return self.send_json(public_story(s))

        # POST /api/stories/{id}/activity
        m = re.fullmatch(r"/api/stories/([^/]+)/activity", path)
        if m:
            d = self.read_json()
            note(f"POST activity {m.group(1)} tries={d.get('tries')} done={d.get('done')}")
            return self.send_json({"ok": True})

        # POST /api/auth/login · signup
        # 둘 다 `src/api/auth.ts` 가 부르는데 계약서에는 없다 (README 「어긋난 것」 2번)
        if path in ("/api/auth/login", "/api/auth/signup"):
            d = self.read_json()
            email = d.get("email") or ""
            pw = d.get("password") or ""
            if path.endswith("login") and len(pw) < 4:
                note(f"POST {path} {email} → 401")
                return self.send_json({"error": "INVALID"}, 401)
            note(f"POST {path} {email} → 200")
            return self.send_json({"token": next_id("t"), "email": email})

        return self.send_json({"error": "not found", "path": path}, 404)

    def do_PATCH(self):
        path = urlparse(self.path).path

        # PATCH /api/characters/{id}/keypoints
        m = re.fullmatch(r"/api/characters/([^/]+)/keypoints", path)
        if m:
            d = self.read_json()
            kp = d.get("keypoints") or {}
            got = set(kp)
            extra = got - EXPECTED_JOINTS
            missing = EXPECTED_JOINTS - got
            bits = [f"{len(got)}개"]
            # `root` 는 프론트 파생 관절이라 오면 안 된다 (계약 1절)
            if "root" in extra:
                bits.append("⚠ root 가 왔다 — 파생 관절이라 보내지 않는 것이 계약")
            if extra - {"root"}:
                bits.append(f"⚠ 모르는 관절 {sorted(extra - {'root'})}")
            if missing:
                bits.append(f"⚠ 빠진 관절 {sorted(missing)}")
            note(f"PATCH keypoints {m.group(1)}  " + "  ".join(bits))
            return self.send_json({"ok": True})

        if path == "/api/settings":
            d = self.read_json()
            SETTINGS.update({k: v for k, v in d.items() if k in SETTINGS})
            note(f"PATCH /api/settings {d}")
            return self.send_json(SETTINGS)

        return self.send_json({"error": "not found", "path": path}, 404)

    # ---------- SSE ----------

    def sse_events(self, analysis_id):
        """GET /api/characters/{id}/events.

        Content-Length 를 줄 수 없으므로 Connection: close 로 끝을 알린다.
        스레드 서버라서 이 스트림이 다른 요청을 막지 않는다.
        """
        if analysis_id not in ANALYSES:
            return self.send_json({"error": "unknown analysisId"}, 404)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Connection", "close")
        self._cors()
        self.end_headers()
        self.close_connection = True

        note(f"SSE  열림 {analysis_id}")
        delay = CONFIG["stage_delay_ms"] / 1000
        try:
            for stage, progress, label in STAGES:
                self.wfile.write(
                    f"data: {json.dumps({'stage': stage, 'progress': progress, 'label': label}, ensure_ascii=False)}\n\n".encode()
                )
                self.wfile.flush()

                if CONFIG["sse_drop_at"] == stage:
                    note(f"SSE  {stage} 뒤에 끊음 — 프론트 재연결 확인")
                    return

                # ENGINE_TIMEOUT: done 을 보내지 않고 매달아 둔다.
                # S-04 의 30초 타이머(`S04Analyzing.tsx` 26행)가 먼저 터져야 맞다
                if CONFIG["fail"] == "ENGINE_TIMEOUT" and stage == "estimating_pose":
                    note("SSE  ENGINE_TIMEOUT 주입 — done 을 보내지 않는다")
                    for _ in range(40):
                        time.sleep(1)
                        self.wfile.write(b": keep-alive\n\n")
                        self.wfile.flush()
                    return

                time.sleep(delay)

            done = {"stage": "done", "progress": 1, "label": "다 됐어요"}
            self.wfile.write(f"data: {json.dumps(done, ensure_ascii=False)}\n\n".encode())
            self.wfile.flush()
            note(f"SSE  done {analysis_id}")
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            note(f"SSE  연결이 끊겼다 {analysis_id}")


class V6Server(ThreadingHTTPServer):
    address_family = socket.AF_INET6


def main():
    if not SAMPLE_PATH.exists():
        make_sample_png()
        print(f"샘플 그림 생성: {SAMPLE_PATH}")

    # IPv4 와 IPv6 양쪽 루프백에 모두 붙는다.
    #
    # Windows 에서 `localhost` 는 ::1 을 먼저 시도한다. IPv4 에만 붙어 있으면
    # ::1 연결이 거절된 뒤 127.0.0.1 로 넘어가느라 **요청마다 2초**가 붙는다.
    # `vite.config.ts` 의 프록시 대상이 `http://localhost:8000` 이므로 프론트의
    # 모든 API 호출이 이 2초를 먹는다 (실측 2020ms vs 1ms).
    #
    # 팀원의 uvicorn 도 기본값이 IPv4 단독이라 같은 일이 생긴다. README 참고.
    # 외부 인터페이스에는 붙이지 않는다 — 백엔드 가이드 20절.
    servers = []
    for family, host in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
        cls = V6Server if family == socket.AF_INET6 else ThreadingHTTPServer
        try:
            srv = cls((host, PORT), Handler)
        except OSError as e:
            print(f"  {host}:{PORT} 못 붙였다 ({e})")
            continue
        srv.daemon_threads = True
        servers.append(srv)
        threading.Thread(target=srv.serve_forever, daemon=True).start()

    if not servers:
        sys.exit(f"{PORT} 번을 아무 주소에도 붙이지 못했다. 이미 쓰고 있는 것이 있는지 본다")

    print(f"""
한칸이야기 백엔드 스텁 — 버릴 서버다
  조작판   http://localhost:{PORT}/
  프론트   npm run dev  (.env 의 VITE_ENGINE 을 mock 이 아닌 값으로)
  계약     docs/api-contract.md
  붙은 곳  {', '.join(str(s.server_address[:2]) for s in servers)}
  멈추기   Ctrl+C
""")
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        print("\n멈춤")


if __name__ == "__main__":
    main()
