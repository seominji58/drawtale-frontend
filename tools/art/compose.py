"""층 그림을 좌표 표대로 쌓는다 — 앱이 할 일을 미리 해 보는 것 (2026-11-03).

물건은 흰 바탕을 오려 투명 PNG 로(styles/cutout.py), 주인공은 AnimatedDrawings 예시 아이 그림(texture + mask).
좌표: x 가운데, foot 발끝 높이, h 화면 높이 대비 — 모두 0~1 (목록 페이지의 표와 같은 형식).
"""

import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
from cutout import cut as cut_edge  # noqa: E402
from collections import deque  # noqa: E402

import numpy as np  # noqa: E402
from PIL import ImageFilter  # noqa: E402


def cut(src: Path, dst: Path, hole: int = 300) -> None:
    """가장자리 흰 곳 + 선으로 둘러싸인 큰 흰 구멍(그네 줄 사이 · 사다리 칸)도 지운다. 눈처럼 작은 흰 곳(hole 픽셀 미만)은 남긴다"""
    cut_edge(src, dst)
    im = Image.open(dst).convert("RGBA")
    a = np.asarray(im).copy()
    light = (a[..., :3] >= 232).all(axis=2) & (a[..., 3] > 0)
    seen = np.zeros(light.shape, bool)
    h, w = light.shape
    for y0, x0 in zip(*np.nonzero(light)):
        if seen[y0, x0]:
            continue
        comp = [(y0, x0)]; seen[y0, x0] = True; q = deque(comp)
        while q:
            y, x = q.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx)); comp.append((ny, nx))
        if len(comp) >= hole:
            ys, xs = zip(*comp); a[ys, xs, 3] = 0
    alpha = Image.fromarray(a[..., 3]).filter(ImageFilter.GaussianBlur(0.6))
    out = Image.fromarray(a); out.putalpha(alpha); out.save(dst)

AD = Path(__file__).resolve().parents[3] / "AnimatedDrawings" / "examples" / "characters"

LAYOUT = {
    "place": "playground", "size": [1536, 1024], "ground": 0.56,
    "hero": {"x": 0.52, "foot": 0.93, "h": 0.52},
    "objects": [
        {"id": "swing", "x": 0.17, "foot": 0.66, "h": 0.38, "layer": "back"},
        {"id": "slide", "x": 0.80, "foot": 0.67, "h": 0.42, "layer": "back"},
        {"id": "tree", "x": 0.40, "foot": 0.62, "h": 0.44, "layer": "back"},
    ],
}


def kid(name: str) -> Image.Image:
    t = Image.open(AD / name / "texture.png").convert("RGBA")
    m = Image.open(AD / name / "mask.png").convert("L").resize(t.size)
    t.putalpha(m)
    return t.crop(m.getbbox())


def place(base: Image.Image, im: Image.Image, x: float, foot: float, h: float) -> None:
    W, H = base.size
    th = round(h * H)
    tw = round(im.width * th / im.height)
    im = im.resize((tw, th), Image.LANCZOS)
    base.alpha_composite(im, (round(x * W - tw / 2), round(foot * H - th)))


def main() -> None:
    (HERE / "layout-playground.json").write_text(json.dumps(LAYOUT, indent=1), encoding="utf-8")
    out = HERE / "out"
    out.mkdir(exist_ok=True)
    for sid in ("a-marker", "b-crayon"):
        d = HERE / sid
        for o in LAYOUT["objects"]:
            cut(d / f"{o['id']}.png", d / f"{o['id']}.cut.png")
        bg = Image.open(d / "plate.png").convert("RGBA")
        scene = bg.copy()
        for o in LAYOUT["objects"]:
            place(scene, Image.open(d / f"{o['id']}.cut.png"), o["x"], o["foot"], o["h"])
        scene.convert("RGB").save(out / f"{sid}-scene.jpg", quality=88)
        for k in ("char1", "char2", "char3"):
            s = scene.copy()
            hero = LAYOUT["hero"]
            place(s, kid(k), hero["x"], hero["foot"], hero["h"])
            s.convert("RGB").save(out / f"{sid}-{k}.jpg", quality=88)
        # 낱장(오린 물건)을 보여 줄 작은 판
        for o in LAYOUT["objects"]:
            c = Image.open(d / f"{o['id']}.cut.png"); c.thumbnail((360, 360)); c.save(out / f"{sid}-{o['id']}.png")
        p = bg.convert("RGB"); p.thumbnail((900, 600)); p.save(out / f"{sid}-plate.jpg", quality=85)
    for k in ("char1", "char2", "char3"):
        c = kid(k); c.thumbnail((300, 360)); c.save(out / f"kid-{k}.png")
    print("ok")


if __name__ == "__main__":
    main()
