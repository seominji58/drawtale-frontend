"""장면 인물 그림의 손끝 위치 → src/features/scene/hands.json (2026-11-04).

대본에 「안내원 아저씨가 손전등을 들고」처럼 인물이 소품을 들면, 그 인물 손에 소품을 쥐여 준다.
손끝 = 그림 윤곽에서 키의 35~80% 높이 사이 양옆으로 가장 바깥에 나온 곳 중 가장 아래.
값은 그림 안 비율 { "그림": { "l": [x, y], "r": [x, y] } } (x 는 폭, y 는 위에서부터 높이).

    python measure_hands.py
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image

FRONT = Path(__file__).resolve().parents[2]
PROPS = FRONT / "public" / "scenes" / "props"
OUT = FRONT / "src" / "features" / "scene" / "hands.json"
# 사람 그림만 (동물 · 물건 · 여럿인 그림은 뺀다)
PEOPLE = ["friend", "friend2", "adult", "mom", "dad", "grandma", "grandpa", "teacher", "aunt", "nurse", "busdriver",
          "spacekid-m", "spacekid-f"] + [f"{k}-{g}" for k in ("caveguide", "astronaut", "ranger", "lifeguard", "shopkeeper",
                                                               "keeper", "police", "cook", "mail", "spacepolice") for g in "mf"]


def hands(path: Path) -> dict:
    a = np.array(Image.open(path).convert("RGBA"))[..., 3] > 40
    h, w = a.shape
    rows = range(int(h * 0.35), int(h * 0.8))
    out = {}
    for side, key in (("left", "l"), ("right", "r")):
        def edge(y):
            xs = np.nonzero(a[y])[0]
            return None if not len(xs) else (xs.min() if side == "left" else xs.max())
        es = [(y, edge(y)) for y in rows if edge(y) is not None]
        far = min(e for _, e in es) if side == "left" else max(e for _, e in es)
        y = max(y for y, e in es if abs(e - far) <= 2)   # 같은 바깥 끝이면 가장 아래가 손끝
        out[key] = [round(far / w, 3), round(y / h, 3)]
    return out


def main() -> None:
    table = {n: hands(PROPS / f"{n}.webp") for n in PEOPLE if (PROPS / f"{n}.webp").exists()}
    OUT.write_text(json.dumps(table, ensure_ascii=False, indent=1), encoding="utf-8")
    print("hands", len(table))


if __name__ == "__main__":
    main()
