"""등장인물 그림을 팔이 몸에서 떨어진 자세로 다시 그린다 (11/9 사용자 「등장인물도 관절 애니메이션」).

지금 그림(public/scenes/props/{id}.webp)은 팔을 몸에 딱 붙여 그려 관절 렌더가 팔을 몸에서 떼지 못했다(팔을 움직이면
몸통까지 날개처럼 찢어짐). 같은 인물 · 같은 크레용 화풍 그대로, 팔은 몸 옆으로 살짝 벌려(겨드랑이 틈), 두 다리 사이도
틈이 보이게. 흰 바탕 → 오림은 process 단계에서.

  python tools/art/gen_open_arms.py OUT_DIR id [id ...]     (키: drawtale-backend-git/.env OPENAI_API_KEY)
"""
import base64, io, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from openai import OpenAI
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ENV = next(p for p in (ROOT.parent / "drawtale-backend-git" / ".env", ROOT.parent / "drawtale-backend" / ".env") if p.exists())
KEY = next(l.split("=", 1)[1].strip().strip('"') for l in ENV.read_text(encoding="utf-8").splitlines()
           if l.startswith("OPENAI_API_KEY="))
PROMPT = ("Redraw exactly this same character: same face, hair, clothes, colors, proportions and the same waxy crayon "
          "picture-book style and line quality. Change ONLY the pose: standing straight, front view, both arms held "
          "slightly away from the body (about 25 degrees outward, hands open and relaxed, a clear gap of background "
          "between each arm and the torso), legs straight with a small clear gap between them, feet slightly apart. "
          "Nothing in the hands. Full body, centered, plain pure white background, no ground, no shadow, nothing else. "
          "No text, no letters, no numbers anywhere.")
# 인물마다 옷을 바꿀 것 (11/9): 치마는 걸을 때 다리를 들면 무릎 모양으로 같이 꺾였다 (할머니, 사용자 「바지 입은 그림으로」)
CHANGE = {
    "grandma": "One exception to keeping the clothes: replace her long brown skirt with long, fairly slim brown trousers "
               "(same brown color and texture). Draw the two trouser legs as two separate tubes with a clear wedge of white "
               "background between them all the way up to the crotch (like an upside-down V), legs slightly apart. Keep the purple cardigan.",
}


def one(c: OpenAI, pid: str, out: Path) -> str:
    dst = out / f"{pid}.png"
    if dst.exists():
        return "skip"
    im = Image.open(ROOT / "public/scenes/props" / f"{pid}.webp").convert("RGBA")
    paper = Image.new("RGB", (max(im.size) * 2 // 1, max(im.size) * 2 // 1), "white")
    paper = Image.new("RGB", (int(im.height * 0.75), im.height), "white")
    paper.paste(im, ((paper.width - im.width) // 2, 0), im)
    buf = io.BytesIO(); paper.save(buf, "PNG"); buf.name = f"{pid}.png"; buf.seek(0)
    r = c.images.edit(model="gpt-image-2", image=[buf], prompt=PROMPT + (" " + CHANGE[pid] if pid in CHANGE else ""), size="1024x1536", quality="medium",
                      output_format="png")
    dst.write_bytes(base64.b64decode(r.data[0].b64_json))
    return "ok"


if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    c = OpenAI(api_key=KEY, timeout=300)
    with ThreadPoolExecutor(2) as ex:
        for pid, st in zip(sys.argv[2:], ex.map(lambda p: one(c, p, out), sys.argv[2:])):
            print(pid, st, flush=True)
