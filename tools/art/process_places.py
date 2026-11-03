"""세부 장소 그림 → public/scenes/{세부 장소}/ (2026-11-03, gen_places.py 다음).

배경판 WebP + 물건 오리기 + layout.json. 소품 자리는 장소 기본과 같다(process.py PROPS).
x 가운데, foot 발끝 또는 top 윗변, h 화면 높이 대비 — 모두 0~1. 벽에 걸린 것(창문)은 top.
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import process as P  # noqa: E402

# 세부 장소 → [(물건, x, "foot"|"top", y, h)]. "../{장소}/{물건}" 은 다른 장소 그림을 같이 쓴다
SUBS = {
    "home-living": [("sofa", 0.22, "foot", 0.70, 0.30), ("window", 0.78, "top", 0.12, 0.32)],
    "home-kitchen": [("counter", 0.24, "foot", 0.66, 0.36), ("table", 0.80, "foot", 0.72, 0.28)],
    "home-bedroom": [("bed", 0.22, "foot", 0.70, 0.30), ("toybox", 0.85, "foot", 0.72, 0.20)],
    "playground-path": [("../playground/tree", 0.10, "foot", 0.62, 0.42), ("bench", 0.28, "foot", 0.68, 0.20),
                        ("flowerbed", 0.84, "foot", 0.70, 0.14)],
    "school-classroom": [("board", 0.26, "foot", 0.64, 0.40), ("desks", 0.82, "foot", 0.72, 0.24)],
    "school-cafeteria": [("counter", 0.22, "foot", 0.64, 0.30), ("table", 0.80, "foot", 0.74, 0.24)],
    "school-hallway": [("lockers", 0.20, "foot", 0.66, 0.40), ("window", 0.76, "top", 0.12, 0.30)],
    "school-music": [("piano", 0.20, "foot", 0.68, 0.34), ("drums", 0.84, "foot", 0.72, 0.26)],
    "school-library": [("shelf", 0.22, "foot", 0.66, 0.30), ("beanbag", 0.82, "foot", 0.74, 0.20)],
    "town-market": [("stall", 0.22, "foot", 0.66, 0.42), ("cart", 0.84, "foot", 0.70, 0.20)],
    "town-park": [("../playground/tree", 0.92, "foot", 0.62, 0.40), ("fountain", 0.22, "foot", 0.67, 0.26),
                  ("bench", 0.76, "foot", 0.70, 0.18)],
    "town-busstop": [("shelter", 0.20, "foot", 0.66, 0.38), ("bus", 0.84, "foot", 0.64, 0.26)],
    "forest-stream": [("../forest/pine", 0.10, "foot", 0.62, 0.55), ("rocks", 0.32, "foot", 0.74, 0.08),
                      ("reeds", 0.86, "foot", 0.70, 0.22)],
    "forest-trail": [("../forest/pine", 0.88, "foot", 0.62, 0.58), ("log", 0.24, "foot", 0.72, 0.12),
                     ("sign", 0.72, "foot", 0.70, 0.22)],
    "forest-flowers": [("flowers", 0.20, "foot", 0.72, 0.14), ("butterflybush", 0.84, "foot", 0.70, 0.26)],
    "sea-underwater": [("coral", 0.20, "foot", 0.72, 0.26), ("fish", 0.80, "top", 0.16, 0.20)],
    "sea-pier": [("boat", 0.22, "foot", 0.60, 0.14), ("lighthouse", 0.86, "foot", 0.60, 0.38)],
    "space-ship": [("panel", 0.24, "foot", 0.66, 0.34), ("seat", 0.82, "foot", 0.72, 0.22)],
    "space-planet": [("plants", 0.20, "foot", 0.70, 0.20), ("rover", 0.84, "foot", 0.70, 0.18)],
    "cave-entrance": [("rocks", 0.20, "foot", 0.72, 0.14), ("lantern", 0.84, "foot", 0.72, 0.14)],
    "cave-lake": [("crystal", 0.16, "foot", 0.72, 0.16), ("boat", 0.80, "foot", 0.62, 0.10)],
}


def main() -> None:
    scenes = P.FRONT / "scenes"
    for sid, objs in SUBS.items():
        d = scenes / sid
        d.mkdir(parents=True, exist_ok=True)
        P.webp(P.ALL / f"plate-{sid}.png", d / "plate.webp", 1536, 80)
        for oid, *_ in objs:
            if not oid.startswith("../"):
                P.cut_to(P.ALL / f"{sid}-{oid}.png", d / f"{oid}.webp", 700)
        layout = {"place": sid, "size": [1536, 1024], "plate": "plate.webp", "ground": 0.56, "hero": P.HERO,
                  "objects": [{"src": f"{oid}.webp", "x": x, a: y, "h": h, "layer": "back"} for oid, x, a, y, h in objs],
                  "props": P.PROPS}
        (d / "layout.json").write_text(json.dumps(layout, ensure_ascii=False, indent=1), encoding="utf-8")
        print("ok", sid)


if __name__ == "__main__":
    main()
