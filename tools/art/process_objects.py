"""gen_objects.py 로 만든 물건 13 → public/scenes/props/{이름}.webp (흰 바탕 오리기, 긴 변 700px) — 2026-11-03."""

import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from compose import cut  # noqa: E402

ALL = HERE / "all"
OUT = Path(__file__).resolve().parents[2] / "public" / "scenes" / "props"
NAMES = ["blanket", "tent", "dune", "seesaw", "pavilion", "podium",
         "flashlight", "lantern", "ball", "bread", "chair", "bandage", "balloons"]


def main(src: Path = ALL, out: Path = OUT) -> None:
    work = src.parent / "cut"
    work.mkdir(exist_ok=True)
    for n in NAMES:
        tmp = work / f"obj-{n}.cut.png"
        cut(src / f"obj-{n}.png", tmp)
        im = Image.open(tmp)
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        im.thumbnail((700, 700), Image.LANCZOS)
        im.save(out / f"{n}.webp", "WEBP", quality=82, method=6)
        print("ok", n, im.size)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else ALL)
