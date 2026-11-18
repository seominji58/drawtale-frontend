"""흰 바탕 그림 → 투명 PNG. 가장자리에 닿은 흰 영역만 지운다 (눈 · 구름처럼 안쪽 흰 곳은 남는다).

앱의 종이 그림 스티커(paperToSticker)와 같은 원리. 바깥 흰 곳을 지운 뒤 테두리를 1px 부드럽게 하고,
그린 곳만 남게 잘라 낸다(여백 2%).
"""

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

WHITE = 232  # 이보다 밝으면(세 채널 모두) 바탕으로 본다


def cut(src: Path, dst: Path) -> tuple[int, int, float]:
    im = Image.open(src).convert("RGB")
    a = np.asarray(im)
    h, w, _ = a.shape
    light = (a >= WHITE).all(axis=2)
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if light[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if light[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = im.copy()
    rgba.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    pad = round(max(w, h) * 0.02)
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))
    rgba = rgba.crop(box)
    rgba.save(dst)
    return rgba.size[0], rgba.size[1], round(float(bg.mean()), 3)


if __name__ == "__main__":
    folder = Path(sys.argv[1])
    for name in sys.argv[2:]:
        print(name, cut(folder / f"{name}.png", folder / f"{name}.cut.png"))
