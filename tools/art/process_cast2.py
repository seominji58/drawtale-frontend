"""gen_cast2.py 로 만든 인물 26 · 물건 30 → public/scenes/props/{이름}.webp (흰 바탕 오리기, 긴 변 700px)
그리고 props 전체의 가로세로 비율을 src/features/scene/props-ar.json 에 (2026-11-03)."""

import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from compose import cut  # noqa: E402

FRONT = Path(r"C:\Users\Omnyumyum\Desktop\hankan-story\drawtale-frontend")
SCENES = FRONT / "public" / "scenes"
OUT = SCENES / "props"
sys.path.insert(0, str(HERE))
import gen_cast2 as C  # noqa: E402


def main() -> None:
    work = HERE / "cut"
    work.mkdir(exist_ok=True)
    names = [f"person-{n}" for n in C.PEOPLE] + [f"obj-{n}" for n in C.OBJECTS]
    for full in names:
        src = HERE / "all" / f"{full}.png"
        if not src.exists():
            print("missing", full)
            continue
        tmp = work / f"{full}.cut.png"
        cut(src, tmp)
        im = Image.open(tmp)
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        im.thumbnail((700, 700), Image.LANCZOS)
        name = full.split("-", 1)[1]
        im.save(OUT / f"{name}.webp", "WEBP", quality=82, method=6)
        print("ok", name, im.size)
    ar = {}
    for f in sorted(list(OUT.glob("*.webp")) + [SCENES / "town-park" / "bench.webp"]):
        im = Image.open(f)
        bb = im.getbbox() or (0, 0, im.width, im.height)
        ar[str(f.relative_to(SCENES)).replace("\\", "/")] = round((bb[2] - bb[0]) / max(1, bb[3] - bb[1]), 3)
    (FRONT / "src" / "features" / "scene" / "props-ar.json").write_text(json.dumps(ar, ensure_ascii=False, indent=1), encoding="utf-8")
    print("ar", len(ar))


if __name__ == "__main__":
    main()
