"""등장인물 그림의 흰 옷이 비치던 것을 메운다 (2026-11-09).

compose.cut 은 선으로 둘러싸인 큰 흰 곳(그네 줄 사이 · 사다리 칸)을 지우는데, 사람 그림에서는 흰 가운 · 흰 앞치마 · 흰 우주복이
그렇게 지워져 장면 배경이 옷 너머로 얼룩덜룩 비쳤다 (요리사 · 간호사 몸 안쪽 40% 가 반투명). 지운 곳은 원래 흰색(232 이상)이었으니
몸 윤곽 안쪽(바깥과 이어지지 않은 곳, 테두리 2px 안쪽)의 투명 · 반투명 화소를 흰 바탕에 합쳐 불투명하게 되돌린다.
바깥 가장자리의 부드러운 경계와 팔 · 다리 사이처럼 바깥과 이어진 틈은 그대로.

  python tools/art/fill_white_clothes.py [id ...]     (기본: 장면 등장인물 전부, public/scenes/props/{id}.webp 를 고쳐 쓴다)
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
PROPS = ROOT / "public" / "scenes" / "props"


def fill(im: Image.Image) -> tuple[Image.Image, float]:
    a = np.asarray(im.convert("RGBA")).astype(float)
    alpha = a[..., 3] / 255
    body = ndimage.binary_fill_holes(alpha > 24 / 255)
    inner = ndimage.binary_erosion(body, iterations=2)
    fix = inner & (alpha < 0.98)
    rgb = a[..., :3]
    rgb[fix] = rgb[fix] * alpha[fix, None] + 255 * (1 - alpha[fix, None])
    a[fix, 3] = 255
    return Image.fromarray(a.round().clip(0, 255).astype(np.uint8)), float(fix.sum() / max(1, inner.sum()))


def main() -> None:
    ids = sys.argv[1:] or sorted(json.loads((ROOT / "src/features/scene/people-moves.json").read_text(encoding="utf-8")))
    for pid in ids:
        p = PROPS / f"{pid}.webp"
        out, part = fill(Image.open(p))
        if part > 0.001:
            out.save(p, "WEBP", quality=82, method=6)
        print(f"{pid:14s} 메운 곳 {part * 100:.1f}%")


if __name__ == "__main__":
    main()
