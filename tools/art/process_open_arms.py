"""gen_open_arms.py 로 다시 그린 등장인물(팔을 몸에서 뗀 자세) → public/scenes/props/{id}.webp (흰 바탕 오리기, 긴 변 700px).
그다음 가로세로 비율(props-ar.json)과 손끝 자리(hands.json)를 다시 잰다 (11/9).

  python tools/art/process_open_arms.py SRC_DIR [id ...]
"""
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from compose import cut  # noqa: E402
import types  # noqa: E402
sys.modules.setdefault("gen_cast2", types.ModuleType("gen_cast2"))   # write_ar 만 쓴다 (gen_cast2 는 키 파일을 읽는다)
import process_cast2  # noqa: E402
import measure_hands  # noqa: E402
from fill_white_clothes import fill  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "public" / "scenes" / "props"


def main() -> None:
    src = Path(sys.argv[1])
    ids = sys.argv[2:] or [p.stem for p in src.glob("*.png") if not p.stem.startswith(("비교", "렌더"))]
    work = HERE / "cut"
    work.mkdir(exist_ok=True)
    for pid in ids:
        f = src / f"{pid}.png"
        if not f.exists():
            print("없음", pid); continue
        tmp = work / f"{pid}.open.cut.png"
        cut(f, tmp)
        im = Image.open(tmp)
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        im.thumbnail((700, 700), Image.LANCZOS)
        im, _ = fill(im)   # cut 이 지운 흰 옷(가운 · 앞치마 · 우주복)을 메운다 (11/9, fill_white_clothes.py)
        im.save(OUT / f"{pid}.webp", "WEBP", quality=82, method=6)
        print("ok", pid, im.size)
    process_cast2.write_ar()
    measure_hands.main()


if __name__ == "__main__":
    main()
