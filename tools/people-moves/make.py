"""장면 등장인물 동작 그림띠 (11/9 「등장인물도 관절 애니메이션」).

등장인물 그림(public/scenes/props/{id}.webp, 팔을 몸에서 떼어 다시 그린 것 — tools/art/gen_open_arms.py)을 로컬 AI 서버
(사람형)로 렌더해, 장면이 넘겨 보일 가로 그림띠 public/scenes/people-moves/{id}.{동작}.webp 와 자리 정보
src/features/scene/people-moves.json 을 만든다. 그림은 이야기와 상관없이 늘 같으니 이야기마다 렌더하지 않고 한 번만.

동작: walk(걸어 들어오기) · wave(인사 · 말하기) · hooray(기쁜 쪽). 장마다 칸: 세로는 첫 장(그린 자세)의 머리~발 + 위아래
여유, 가로는 첫 장 가운데를 축으로 모든 장이 드는 폭 — 화면은 칸을 멈춘 그림과 같은 키 · 가운데 · 발끝에 놓는다.

  python tools/people-moves/make.py [id ...]     (AI 서버 AI_URL, 기본 http://127.0.0.1:8001 · TorchServe 가 켜져 있어야 한다)
  결과 자리 정보는 people-moves.{AI 포트}.json 에 쓴다(여러 서버로 나눠 돌릴 때 서로 덮어쓰지 않게) — 끝나면 people-moves.json 에 합친다
"""
import base64, io, json, sys, urllib.request, uuid
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PROPS = ROOT / "public/scenes/props"
OUT = ROOT / "public/scenes/people-moves"
META = ROOT / "src/features/scene/people-moves.json"
import os
BASE = os.environ.get("AI_URL", "http://127.0.0.1:8001") + "/internal/v1"
JOBS = ["caveguide", "astronaut", "ranger", "lifeguard", "shopkeeper", "keeper", "police", "cook", "mail", "spacepolice"]
PEOPLE = (["friend", "friend2", "adult", "grandma", "grandpa", "mom", "dad", "teacher", "aunt", "nurse", "busdriver",
           "spacekid-m", "spacekid-f"] + [f"{k}-{g}" for k in JOBS for g in ("m", "f")])
# 걷기는 정면 제자리 걸음 (11/9 결정 — 정면 그림 옆걸음은 다리가 꼬였다). 화면이 옮기고 가는 쪽으로 기울인다
MOVES = {"walk": "walk_front", "wave": "wave_hello_gentle", "hooray": "hooray"}
FPS = 12               # 렌더 묶음의 장 사이 (장면 층과 같다)
FRAME_H = 280          # 그림띠 한 칸 높이(px) — 200 이면 화면에서 흐렸다 (11/9)
PAD = 0.05             # 위아래 여유 (첫 장 키 대비) — 만세는 팔이 머리 위로 올라간다
PAD_TOP_HOORAY = 0.25


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


def strip(pid: str, move: str, sheet: Image.Image, cell: int, n: int, want: float) -> dict | None:
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
    pad_top = PAD_TOP_HOORAY if move == "hooray" else PAD
    t0, b0 = max(0, int(top - pad_top * tall)), min(cell, int(bottom + PAD * tall))
    l0, r0 = max(0, int(cx - half - 2)), min(cell, int(cx + half + 2))
    scale = FRAME_H / (b0 - t0)
    fw = max(1, round((r0 - l0) * scale))
    out = Image.new("RGBA", (fw * n, FRAME_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f.crop((l0, t0, r0, b0)).resize((fw, FRAME_H), Image.LANCZOS), (i * fw, 0))
    OUT.mkdir(parents=True, exist_ok=True)
    out.save(OUT / f"{pid}.{move}.webp", "WEBP", quality=62, method=6)
    meta = {"frames": n, "sec": round(n / FPS, 3), "ar": round(fw / FRAME_H, 4),
            "pad_top": round(float((top - t0) / tall), 4), "pad_bottom": round(float((b0 - bottom) / tall), 4)}
    print(pid, move, meta, f"{(OUT / f'{pid}.{move}.webp').stat().st_size // 1024}KB", flush=True)
    return meta


def make(pid: str) -> dict:
    im = Image.open(PROPS / f"{pid}.webp").convert("RGBA")
    want = shape(np.asarray(im)[..., 3] > 24)
    paper = Image.new("RGBA", (int(im.width * 1.4), int(im.height * 1.15)), "white")
    paper.paste(im, ((paper.width - im.width) // 2, (paper.height - im.height) // 2), im)
    buf = io.BytesIO(); paper.convert("RGB").save(buf, "PNG")
    a = post("/analyze", {"form": "biped"}, {"file": (f"{pid}.png", buf.getvalue())})
    if not a.get("success"):
        print(pid, "분석 실패", a.get("message"), flush=True)
        return {}
    got = {}
    for move, motion in MOVES.items():
        r = post("/render", {"request_id": a["request_id"], "joints": json.dumps(a["joints"]), "motion": motion, "sprite": "true"})
        if "sprite" not in r:
            print(pid, move, "렌더 실패", r.get("message"), flush=True)
            continue
        sheet = Image.open(io.BytesIO(base64.b64decode(r["sprite"]))).convert("RGBA")
        m = strip(pid, move, sheet, r["sprite_cell"], r["sprite_frames"], want)
        if m:
            got[move] = m
    return got


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
