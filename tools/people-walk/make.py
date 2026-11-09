"""장면 등장인물 걷기 그림띠 만들기 (11/9 「등장인물 · 소품이 다 가만히 있다」).

등장인물 그림(public/scenes/props/{id}.webp)을 로컬 AI 서버(사람형)로 걷기 렌더해서, 장면이 걸어 들어오는 동안 넘겨 보일
가로 그림띠(public/scenes/people-walk/{id}.webp)와 자리 정보(src/features/scene/people-walk.json)를 만든다.
동작은 walk_still_arms — 걷기와 같고 팔만 그린 자세 그대로 (팔을 몸에 붙여 그린 일러스트는 팔까지 움직이면 날개처럼 찢어졌다).
장마다 그림 칸: 세로는 첫 장(그린 자세)의 머리~발 + 위아래 여유, 가로는 첫 장 가운데를 축으로 모든 장이 드는 폭.
그래서 화면은 그림띠 칸을 멈춘 그림과 같은 키 · 같은 가운데 · 같은 발끝에 놓으면 된다.

  python tools/people-walk/make.py [id ...]     (AI 서버 http://127.0.0.1:8001 · TorchServe 가 켜져 있어야 한다)
"""
import base64, io, json, sys, urllib.request, uuid
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PROPS = ROOT / "public/scenes/props"
OUT = ROOT / "public/scenes/people-walk"
META = ROOT / "src/features/scene/people-walk.json"
BASE = "http://127.0.0.1:8001/internal/v1"
JOBS = ["caveguide", "astronaut", "ranger", "lifeguard", "shopkeeper", "keeper", "police", "cook", "mail", "spacepolice"]
PEOPLE = (["friend", "friend2", "adult", "grandma", "grandpa", "mom", "dad", "teacher", "aunt", "nurse", "busdriver",
           "spacekid-m", "spacekid-f"] + [f"{k}-{g}" for k in JOBS for g in ("m", "f")])
FRAME_H = 220          # 그림띠 한 칸 높이(px)
PAD = 0.04             # 위아래 여유 (첫 장 키 대비) — 걸으며 머리가 오르내린다


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


MOTION = "walk_still_arms"     # 왼쪽으로 내딛음. --right 면 walk_still_arms_r (오른쪽, 왼쪽에서 들어올 때 · {id}.r.webp)
SUFFIX = ""


def make(pid: str) -> dict | None:
    """종이 여유를 바꿔 가며 — 렌더 첫 장이 원본과 모양이 다르면(분석이 머리 · 헬멧을 몸 밖으로 잘랐다, 11/9 3명) 다시"""
    im = Image.open(PROPS / f"{pid}.webp").convert("RGBA")
    want = shape(np.asarray(im)[..., 3] > 24)
    for wide, tall in ((1.3, 1.15), (2.0, 1.4), (1.6, 1.05)):
        m = _make(pid, im, wide, tall, want)
        if m:
            return m
    print(pid, "모양이 달라 뺌 (예전처럼 들썩이며 들어온다)")
    return None


def _make(pid: str, im: Image.Image, wide: float, tall_: float, want: float) -> dict | None:
    # 흰 종이 위에 (분석기는 종이에 그린 그림을 본다), 둘레 여유
    paper = Image.new("RGBA", (int(im.width * wide), int(im.height * tall_)), "white")
    paper.paste(im, ((paper.width - im.width) // 2, (paper.height - im.height) // 2), im)
    buf = io.BytesIO(); paper.convert("RGB").save(buf, "PNG")
    a = post("/analyze", {"form": "biped"}, {"file": (f"{pid}.png", buf.getvalue())})
    if not a.get("success"):
        print(pid, "분석 실패", a.get("message")); return None
    r = post("/render", {"request_id": a["request_id"], "joints": json.dumps(a["joints"]),
                         "motion": MOTION, "sprite": "true"})
    if "sprite" not in r:
        print(pid, "렌더 실패", r.get("message")); return None
    sheet = Image.open(io.BytesIO(base64.b64decode(r["sprite"]))).convert("RGBA")
    cell, n = r["sprite_cell"], r["sprite_frames"]
    cols = sheet.width // cell
    frames = [sheet.crop(((i % cols) * cell, (i // cols) * cell, (i % cols + 1) * cell, (i // cols + 1) * cell)) for i in range(n)]
    alpha = [np.asarray(f)[..., 3] > 24 for f in frames]
    if abs(shape(alpha[0]) / want - 1) > 0.12:
        print(pid, f"종이 {wide}x{tall_}: 첫 장 모양 {shape(alpha[0]):.2f} ≠ 원본 {want:.2f}")
        return None
    ys, xs = np.nonzero(alpha[0])
    top, bottom, cx = ys.min(), ys.max() + 1, (xs.min() + xs.max() + 1) / 2
    half = max(max(cx - np.nonzero(m)[1].min(), np.nonzero(m)[1].max() + 1 - cx) for m in alpha if m.any())
    tall = bottom - top
    t0, b0 = int(top - PAD * tall), int(bottom + PAD * tall)
    l0, r0 = int(cx - half - 2), int(cx + half + 2)
    scale = FRAME_H / (b0 - t0)
    fw = max(1, round((r0 - l0) * scale))
    strip = Image.new("RGBA", (fw * n, FRAME_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f.crop((l0, t0, r0, b0)).resize((fw, FRAME_H), Image.LANCZOS), (i * fw, 0))
    OUT.mkdir(parents=True, exist_ok=True)
    strip.save(OUT / f"{pid}{SUFFIX}.webp", "WEBP", quality=75, method=6)
    # 멈춘 그림 키(첫 장 머리~발) 대비: 칸 키, 칸 아래 여유. 칸 가로세로 비
    meta = {"frames": n, "ar": round(fw / FRAME_H, 4), "pad_top": round(float((top - t0) / tall), 4),
            "pad_bottom": round(float((b0 - bottom) / tall), 4)}
    print(pid, meta, f"{(OUT / f'{pid}{SUFFIX}.webp').stat().st_size // 1024}KB", flush=True)
    return meta


if __name__ == "__main__":
    args = sys.argv[1:]
    right = "--right" in args
    if right:
        MOTION, SUFFIX = "walk_still_arms_r", ".r"
    ids = [a for a in args if not a.startswith("--")] or PEOPLE
    meta = json.loads(META.read_text(encoding="utf8")) if META.exists() else {}
    for pid in ids:
        if right and pid not in meta:
            continue                      # 왼쪽 걸음이 없는 사람(모양이 달라 뺀 사람)은 오른쪽도 없다
        m = make(pid)
        if right:
            if m:
                meta[pid]["right"] = m
            else:
                meta[pid].pop("right", None)
                (OUT / f"{pid}.r.webp").unlink(missing_ok=True)
        elif m:
            meta[pid] = {**m, **({"right": meta[pid]["right"]} if "right" in meta.get(pid, {}) else {})}
        else:
            meta.pop(pid, None)
            (OUT / f"{pid}.webp").unlink(missing_ok=True)
    META.write_text(json.dumps(dict(sorted(meta.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf8")
