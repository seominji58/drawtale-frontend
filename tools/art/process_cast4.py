"""gen_cast4.py 로 만든 잠수부 4장 → public/scenes/props/{이름}.webp (흰 바탕 오리기, 긴 변 700px), props-ar.json 다시 (2026-11-10)."""
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from compose import cut  # noqa: E402
from gen_cast4 import PEOPLE  # noqa: E402
from process_cast2 import OUT, write_ar  # noqa: E402


def main() -> None:
    work = HERE / "cut"
    work.mkdir(exist_ok=True)
    for name in PEOPLE:
        src = HERE / "all" / f"person-{name}.png"
        tmp = work / f"person-{name}.cut.png"
        cut(src, tmp)
        im = Image.open(tmp)
        im = im.crop(im.getbbox())
        im.thumbnail((700, 700), Image.LANCZOS)
        im.save(OUT / f"{name}.webp", "WEBP", quality=82, method=6)
        print("ok", name, im.size)
    write_ar()


if __name__ == "__main__":
    main()
