"""장면 등장인물 동작 그림띠 (11/9 「등장인물도 관절 애니메이션」).

등장인물 그림(public/scenes/props/{id}.webp, 팔을 몸에서 떼어 다시 그린 것 — tools/art/gen_open_arms.py)을 로컬 AI 서버
(사람형)로 렌더해, 장면이 넘겨 보일 가로 그림띠 public/scenes/people-moves/{id}.{동작}.webp 와 자리 정보
src/features/scene/people-moves.json 을 만든다. 그림은 이야기와 상관없이 늘 같으니 이야기마다 렌더하지 않고 한 번만.

동작: walk(작은 제자리 걸음으로 걸어 들어오기) · wave(한 팔 인사 · 말하기 · 기쁜 쪽). 만세는 뺐다(아래 MOVES). 장마다 칸: 세로는 첫 장(그린 자세)의 머리~발 + 위아래
여유, 가로는 첫 장 가운데를 축으로 모든 장이 드는 폭 — 화면은 칸을 멈춘 그림과 같은 키 · 가운데 · 발끝에 놓는다.

  python tools/people-moves/make.py [id ...]     (AI 서버 AI_URL, 기본 http://127.0.0.1:8001 · TorchServe 가 켜져 있어야 한다)
  결과 자리 정보는 people-moves.{AI 포트}.json 에 쓴다(여러 서버로 나눠 돌릴 때 서로 덮어쓰지 않게) — 끝나면 people-moves.json 에 합친다
"""
import base64, io, json, os, sys, urllib.request, uuid
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import hand_flip  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PROPS = ROOT / "public/scenes/props"
OUT = Path(os.environ.get("MOVES_OUT", ROOT / "public/scenes/people-moves"))   # 시험 렌더는 다른 곳에
META = ROOT / "src/features/scene/people-moves.json"
import os
BASE = os.environ.get("AI_URL", "http://127.0.0.1:8001") + "/internal/v1"
JOBS = ["caveguide", "astronaut", "ranger", "lifeguard", "shopkeeper", "keeper", "police", "cook", "mail", "spacepolice"]
PEOPLE = (["friend", "friend2", "adult", "grandma", "grandpa", "mom", "dad", "teacher", "aunt", "nurse", "busdriver",
           "spacekid-m", "spacekid-f"] + [f"{k}-{g}" for k in JOBS for g in ("m", "f")])
# 동작 → (AI 동작 이름, 한 번 도는 시간(초)). AI 렌더는 동작을 48장으로 고르게 줄이므로 시간은 BVH 길이 그대로다.
# 등장인물용으로 관절 각도로 만든 동작 (AI runtime/tools/make_scene_motions.py, 11/9 사용자 「인사 동작 자체가 이상, 한 팔만
# 위로 올려서 흔들면」 「걷기 다리 움직임도 이상」): 예전 걷기(walk_front)는 무릎을 앞으로 드는 걸음이라 앞에서 보면 다리가
# 옆으로 크게 꺾였고, 인사(wave_hello_gentle)는 두 팔을 옆으로 들어 손바닥이 바닥을 봤다.
# 만세(hooray)는 뺐다: 33명 거의 모두 몸통이 풍선처럼 불룩하고 무릎이 O자로 휘었다(그림을 다시 뽑아도 같음, 점프 · dab 도 같음).
# 사용자 「해결 안 되는 것들은 일반 동작으로 대체」 → 기쁜 쪽도 인사
# 인사는 손 드는 9장 뒤 흔들기 30장을 화면이 쪽이 바뀔 때까지 되풀이한다(loop_from, 사용자 「손 들고 계속 흔드는 거 무한 유지」)
MOVES = {"walk": ("scene_walk", 2.0, None), "wave": ("scene_wave", 39 / 20, 9)}
FRAME_H = 280          # 그림띠 한 칸 높이(px) — 200 이면 화면에서 흐렸다 (11/9)
PAD = 0.05             # 위아래 여유 (첫 장 키 대비)
GAP_MAX = 0.3          # 다리 사이 틈이 엉덩이~발의 이보다 아래서 시작하면 다시 뽑기 (joint_problems)


def post(path, fields, files=None):
    b = uuid.uuid4().hex
    body = b""
    for k, v in fields.items():
        body += f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    for k, (fn, data) in (files or {}).items():
        body += (f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{fn}\"\r\n"
                 "Content-Type: application/octet-stream\r\n\r\n").encode() + data + b"\r\n"
    body += f"--{b}--\r\n".encode()
    req = urllib.request.Request(BASE + path, data=body, headers={"Content-Type": f"multipart/form-data; boundary={b}"})
    return json.load(urllib.request.urlopen(req, timeout=600))


def shape(alpha: np.ndarray) -> float:
    ys, xs = np.nonzero(alpha)
    return (xs.max() - xs.min() + 1) / (ys.max() - ys.min() + 1)


def strip(pid: str, move: str, sheet: Image.Image, cell: int, n: int, want: float, sec: float, loop_from: int | None = None) -> dict | None:
    cols = sheet.width // cell
    frames = [sheet.crop(((i % cols) * cell, (i // cols) * cell, (i % cols + 1) * cell, (i // cols + 1) * cell)) for i in range(n)]
    alpha = [np.asarray(f)[..., 3] > 24 for f in frames]
    # 첫 장도 팔이 동작 자세라 폭은 원본과 다르다 — 키 대비 폭이 원본의 2배를 넘으면(분석이 몸 일부를 잘라 낸 것) 뺀다
    if shape(alpha[0]) / want > 2.0 or shape(alpha[0]) / want < 0.5:
        print(pid, move, f"첫 장 모양 {shape(alpha[0]):.2f} ≠ 원본 {want:.2f} — 뺌", flush=True)
        return None
    ys, xs = np.nonzero(alpha[0])
    top, bottom, cx = ys.min(), ys.max() + 1, (xs.min() + xs.max() + 1) / 2
    half = max(max(cx - np.nonzero(m)[1].min(), np.nonzero(m)[1].max() + 1 - cx) for m in alpha if m.any())
    tall = bottom - top
    pad_top = PAD
    t0, b0 = max(0, int(top - pad_top * tall)), min(cell, int(bottom + PAD * tall))
    l0, r0 = max(0, int(cx - half - 2)), min(cell, int(cx + half + 2))
    scale = FRAME_H / (b0 - t0)
    fw = max(1, round((r0 - l0) * scale))
    out = Image.new("RGBA", (fw * n, FRAME_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f.crop((l0, t0, r0, b0)).resize((fw, FRAME_H), Image.LANCZOS), (i * fw, 0))
    OUT.mkdir(parents=True, exist_ok=True)
    out.save(OUT / f"{pid}.{move}.webp", "WEBP", quality=62, method=6)
    meta = {"frames": n, "sec": round(sec, 3), "ar": round(fw / FRAME_H, 4),
            "pad_top": round(float((top - t0) / tall), 4), "pad_bottom": round(float((b0 - bottom) / tall), 4)}
    if loop_from is not None:
        meta["loop_from"] = loop_from
        if abs(n / sec - 20) > 0.5:   # 되풀이가 이어지려면 장 수가 맞아야 한다 (AI make_scene_motions.py 인사 39장, 1/20초)
            print(pid, move, f"장 수 {n} 이 {sec}초와 안 맞음: 되풀이 이음매가 튄다", flush=True)
    print(pid, move, meta, f"{(OUT / f'{pid}.{move}.webp').stat().st_size // 1024}KB", flush=True)
    return meta


def joint_problems(joints: list[dict], body: np.ndarray) -> list[str]:
    """관절이 렌더하기에 괜찮은지 (2026-11-09). 그림마다 따로 잡은 관절이 몸 밖에 있거나 좌우가 크게 다르면
    렌더에서 몸통이 풍선처럼 부풀거나 팔다리가 찢어졌다. 걸리면 그 인물은 그림을 다시 뽑는다 (regen.json)"""

    j = {x["name"]: (x["x"], x["y"]) for x in joints}
    out = []
    h, w = body.shape
    near = np.zeros_like(body)
    ys, xs = np.nonzero(body)
    tall = ys.max() - ys.min() + 1
    r = max(2, int(tall * 0.03))
    # 몸에서 키의 3% 안쪽
    from scipy import ndimage
    near = ndimage.binary_dilation(body, iterations=r)
    for name, (x, y) in j.items():
        if not (0 <= x < w and 0 <= y < h) or not near[int(y), int(x)]:
            out.append(f"{name} 몸 밖")
    d = lambda a, b: float(np.hypot(j[a][0] - j[b][0], j[a][1] - j[b][1]))
    for part, (a1, a2, b1, b2) in {"팔": ("left_shoulder", "left_hand", "right_shoulder", "right_hand"),
                                    "다리": ("left_hip", "left_foot", "right_hip", "right_foot")}.items():
        la = d(a1, a1.replace("shoulder", "elbow").replace("hip", "knee")) + d(a1.replace("shoulder", "elbow").replace("hip", "knee"), a2)
        ra = d(b1, b1.replace("shoulder", "elbow").replace("hip", "knee")) + d(b1.replace("shoulder", "elbow").replace("hip", "knee"), b2)
        if min(la, ra) / max(la, ra, 1) < 0.65:
            out.append(f"{part} 좌우 길이 {la:.0f} / {ra:.0f}")
    if abs(j["left_shoulder"][1] - j["right_shoulder"][1]) > tall * 0.06:
        out.append("어깨 높이 다름")
    # 위아래 순서: 목 < 몸통 < 엉덩이 < 무릎 < 발
    for a, b in (("neck", "torso"), ("torso", "hip"), ("left_hip", "left_knee"), ("left_knee", "left_foot"),
                 ("right_hip", "right_knee"), ("right_knee", "right_foot")):
        if j[a][1] >= j[b][1]:
            out.append(f"{a} 이 {b} 보다 아래")
    # 다리 사이 틈: 두 다리가 무릎 가까이까지 붙어 있으면(치마 · 붙은 바지) 만세 · 걷기에서 무릎을 굽힐 때 붙은 곳까지
    # 같이 늘어나 물결처럼 휜다 (11/9 할머니). 두 발 사이에서 바깥 바탕이 엉덩이~발의 어디까지 올라오나 (33명 0.05~0.19)
    lab, _ = ndimage.label(~body)
    outside = lab == lab[0, 0]
    hip = (j["left_hip"][1] + j["right_hip"][1]) / 2
    foot = int((j["left_foot"][1] + j["right_foot"][1]) / 2)
    x0, x1 = sorted([int(j["left_foot"][0]), int(j["right_foot"][0])])
    top = foot
    for x in range(x0 + 1, x1):
        y = foot
        while y > 0 and outside[y, x]:
            y -= 1
        if outside[foot - 2, x]:
            top = min(top, y + 1)
    if (top - hip) / max(1, foot - hip) > GAP_MAX:
        out.append(f"다리 사이 틈이 엉덩이~발의 {(top - hip) / max(1, foot - hip):.2f} 부터 (0.3 넘으면 다리가 붙어 휜다)")
    return out


def make(pid: str) -> dict:
    im = Image.open(PROPS / f"{pid}.webp").convert("RGBA")
    want = shape(np.asarray(im)[..., 3] > 24)
    # 투명 바탕 그대로 보내고 투명도를 몸 모양으로 (AI mask_from=alpha, 2026-11-09). 흰 종이에 붙여 보내면 분석이
    # 흰 셔츠 소매 · 흰 가운을 종이로 지워 렌더에서 팔이 사라지고 손만 떴다 (check.py 「흰색 남음」)
    paper = Image.new("RGBA", (int(im.width * 1.4), int(im.height * 1.15)), (0, 0, 0, 0))
    paper.paste(im, ((paper.width - im.width) // 2, (paper.height - im.height) // 2), im)
    buf = io.BytesIO(); paper.save(buf, "PNG")
    a = post("/analyze", {"form": "biped", "mask_from": "alpha"}, {"file": (f"{pid}.png", buf.getvalue())})
    if not a.get("success"):
        print(pid, "분석 실패", a.get("message"), flush=True)
        BAD[pid] = [f"분석 실패 {a.get('message')}"]
        return {}
    bad = joint_problems(a["joints"], np.asarray(paper)[..., 3] > 24)
    if bad:
        print(pid, "관절 이상", bad, flush=True)
        BAD[pid] = bad
        return {}
    got = {}
    for move, (motion, sec, loop_from) in MOVES.items():
        rid = a["request_id"]
        if motion.startswith("scene_wave"):
            # 인사는 흔드는 손을 아래팔 축으로 미리 뒤집은 그림으로 (돌리기만 하면 든 손이 뒤집혀 손목이 꺾여 보였다, hand_flip.py).
            # 관절은 원래 그림 것을 그대로 쓴다
            flipped = hand_flip.flip_hand(paper, a["joints"], "left")
            fb = io.BytesIO(); flipped.save(fb, "PNG")
            fa = post("/analyze", {"form": "biped", "mask_from": "alpha"}, {"file": (f"{pid}.wave.png", fb.getvalue())})
            if fa.get("success"):
                rid = fa["request_id"]
        r = post("/render", {"request_id": rid, "joints": json.dumps(a["joints"]), "motion": motion, "sprite": "true"})
        if "sprite" not in r:
            print(pid, move, "렌더 실패", r.get("message"), flush=True)
            continue
        sheet = Image.open(io.BytesIO(base64.b64decode(r["sprite"]))).convert("RGBA")
        m = strip(pid, move, sheet, r["sprite_cell"], r["sprite_frames"], want, sec, loop_from)
        if m:
            got[move] = m
    return got


# 관절 · 분석이 이상해 그림을 다시 뽑을 인물 (tools/art/gen_open_arms.py 로), regen.json
BAD: dict[str, list[str]] = {}

if __name__ == "__main__":
    ids = sys.argv[1:] or PEOPLE
    meta = {}   # 여러 프로세스가 나눠 돌리면 각자 META 대신 {META}.{AI 포트} 에 쓰고 나중에 합친다
    part = META.with_suffix(f".{BASE.split(':')[2].split('/')[0]}.json")
    for pid in ids:
        got = make(pid)
        for move in MOVES:
            if move not in got:
                (OUT / f"{pid}.{move}.webp").unlink(missing_ok=True)
        if got:
            meta[pid] = got
        else:
            meta.pop(pid, None)
        part.write_text(json.dumps(dict(sorted(meta.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    (Path(__file__).with_name("regen.json")).write_text(json.dumps(BAD, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    if BAD:
        print("다시 뽑을 인물:", ", ".join(BAD), flush=True)
