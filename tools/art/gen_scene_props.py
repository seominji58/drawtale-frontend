"""pt_docs 18 「장면 소품 보강」 C — 쪽 글에 자주 나오는데 그림이 없던 물건 12 (2026-11-04, 사용자 「C도 12장 만들어줘」).

카드 이야기 512편에서 그 물건이 나온 이야기 수 순(문서 18 C 표). gen_all.py 와 같은 참고 그림 · OBJ 지시문,
gpt-image-2 medium(장당 약 5센트), 이미 있는 파일은 건너뛴다. 키는 백엔드 .env 에서 읽기만 한다(gen_all.py).

    python gen_scene_props.py          # 생성 (openai 가 있는 파이썬으로)
    python gen_scene_props.py cut      # 흰 바탕 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import base64
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

FRONT = HERE.resolve().parents[1]
SCENES = FRONT / "public" / "scenes"
PROPS = SCENES / "props"
ALL = HERE / "all"

OBJECTS = {
    "leaves": "a small pile of fallen autumn leaves in orange, red and yellow, flat bottom",
    "sneakers": "a pair of kid sneakers side by side with one lace untied, flat bottom",
    "butterfly": "a small cute butterfly flying with its colorful wings open, front view",
    "footprints": "a short trail of small child footprints pressed into a narrow strip of pale sand, seen from slightly above, flat",
    "arrow": "a small wooden arrow-shaped signpost on one post pointing sideways, no letters, flat bottom",
    "sandcastle": "a small sandcastle with two towers and a tiny flag on top, flat bottom",
    "planet": "a small cute ringed planet like Saturn, pastel colors",
    "earth": "the planet earth seen from space, a round globe with blue oceans and green land",
    "bell": "a shiny brass school hand bell with a wooden handle, flat bottom",
    "basket": "a woven wicker basket full of red apples, flat bottom",
    "map": "an old paper treasure map slightly rolled at the edges with a dotted path and a red X, no letters",
    "fish": "a small cute round fish swimming, side view",
}
# 흰 부분이 많아 안쪽 흰 구멍까지 오려지면 안 되는 것 (11/3 흰 옷 · 흰 물건 구멍 사고)
SOLID = {"sneakers", "map", "earth"}


def generate() -> None:
    import gen_all as G

    client = G.OpenAI(api_key=G.KEY, timeout=300)

    def edit(name: str, what: str):
        p = ALL / f"obj-{name}.png"
        if p.exists():
            return name, "skip"
        err = ""
        for _ in range(2):
            try:
                with open(G.STYLE_REF, "rb") as f:
                    res = client.images.edit(model="gpt-image-2", image=[f], prompt=G.OBJ.format(what=what),
                                             size="1024x1024", quality="medium", output_format="png")
                p.write_bytes(base64.b64decode(res.data[0].b64_json))
                return name, "ok"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:160]
        return name, "ERR " + err

    with ThreadPoolExecutor(3) as ex:
        for name, st in ex.map(lambda kv: edit(*kv), OBJECTS.items()):
            print("done", name, st, flush=True)


def cut_all() -> None:
    from PIL import Image
    from compose import cut

    work = HERE / "cut"
    work.mkdir(exist_ok=True)
    for n in OBJECTS:
        src = ALL / f"obj-{n}.png"
        if not src.exists():
            print("missing", n)
            continue
        tmp = work / f"obj-{n}.cut.png"
        if n in SOLID:
            cut(src, tmp, hole=10 ** 9)
        else:
            cut(src, tmp)
        im = Image.open(tmp)
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        im.thumbnail((700, 700), Image.LANCZOS)
        im.save(PROPS / f"{n}.webp", "WEBP", quality=82, method=6)
        print("ok", n, im.size)
    # 가로세로 비율 — process_cast2.write_ar 와 같은 값 (그 파일은 openai 를 불러와 여기서는 직접 쓴다)
    path = FRONT / "src" / "features" / "scene" / "props-ar.json"
    ar = json.loads(path.read_text(encoding="utf-8"))
    for n in OBJECTS:
        f = PROPS / f"{n}.webp"
        if f.exists():
            im = Image.open(f)
            bb = im.getbbox() or (0, 0, im.width, im.height)
            ar[f"props/{n}.webp"] = round((bb[2] - bb[0]) / max(1, bb[3] - bb[1]), 3)
    path.write_text(json.dumps(dict(sorted(ar.items())), ensure_ascii=False, indent=1), encoding="utf-8")
    print("ar", len(ar))


if __name__ == "__main__":
    cut_all() if sys.argv[1:] == ["cut"] else generate()
