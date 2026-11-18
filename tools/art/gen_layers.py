"""놀이터 층 그림 시험 (2026-11-03) — 화풍 두 가지 × (배경판 1 + 물건 3) = 8장.

배경판에는 물건을 그리지 않고, 물건은 배경판을 참고 이미지로 넣어 같은 화풍 · 색으로 흰 바탕에 하나씩 그린 뒤 오린다.
gpt-image-2 medium. 키는 백엔드 .env 에서 읽기만 한다 (찍지 않음).
"""

import base64
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from openai import OpenAI

HERE = Path(__file__).parent
ENV = Path(__file__).resolve().parents[3] / "drawtale-backend-git" / ".env"
KEY = next(l.split("=", 1)[1].strip().strip('"') for l in ENV.read_text(encoding="utf-8").splitlines()
           if l.startswith("OPENAI_API_KEY="))

STYLES = {
    "a-marker": ("naive drawing as if made by a young child with thick markers and a little crayon, wobbly confident "
                 "lines, simple shapes, charming"),
    "b-crayon": ("waxy crayon drawing, visible crayon strokes and paper grain, bold simple outlines, like a warm "
                 "picture book"),
}
NO_TEXT = "No text, no letters, no numbers. No people, no animals. "

PLATE = ("A wide, empty picture-book background of a playground, for placing characters and objects on top later. "
         "Only the sky and the ground: a pale sky with two or three small soft clouds, a low line of distant soft "
         "bushes on the horizon at about 60% from the top, and below it wide flat open ground (sand and a little "
         "grass) filling the lower 40%, completely empty. IMPORTANT: no swings, no slide, no trees, no sun, no "
         "buildings, no fences, nothing standing on the ground. Pale, soft, low-saturation colors and low contrast so "
         "that a child's drawing placed on top stands out clearly. Style: ")

OBJECTS = {
    "swing": "a playground swing set with two swings, front view",
    "slide": "a playground slide with a ladder and a small roof on top, side view",
    "tree": "one round leafy tree with a brown trunk",
}
OBJ = ("Draw ONLY {what}, in exactly the same drawing style, line quality and colors as the reference image. "
       "One object alone, centered, the whole object visible with empty space around it, standing upright, the bottom "
       "of the object flat. Plain pure white background, no ground, no grass, no shadow, no sky. The object has clear "
       "dark outlines and slightly stronger colors than the reference. ")


def save(path: Path, res) -> dict:
    path.write_bytes(base64.b64decode(res.data[0].b64_json))
    return res.usage.model_dump() if getattr(res, "usage", None) else {}


def main() -> None:
    client = OpenAI(api_key=KEY, timeout=300)
    log = {}
    for sid, style in STYLES.items():
        out = HERE / sid
        out.mkdir(exist_ok=True)
        plate = out / "plate.png"
        if not plate.exists():
            res = client.images.generate(model="gpt-image-2", prompt=PLATE + style + ". " + NO_TEXT,
                                         size="1536x1024", quality="medium", output_format="png")
            log[f"{sid}/plate"] = save(plate, res)
            print(sid, "plate done", flush=True)

        def obj(item):
            name, what = item
            p = out / f"{name}.png"
            if p.exists():
                return name, {}
            with open(plate, "rb") as f:
                res = client.images.edit(model="gpt-image-2", image=[f], prompt=OBJ.format(what=what) + NO_TEXT,
                                         size="1024x1024", quality="medium", output_format="png")
            return name, save(p, res)

        with ThreadPoolExecutor(3) as ex:
            for name, usage in ex.map(obj, OBJECTS.items()):
                log[f"{sid}/{name}"] = usage
                print(sid, name, "done", flush=True)
    (HERE / "usage.json").write_text(json.dumps(log, indent=1), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
