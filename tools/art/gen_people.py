"""대본 인물 그림 9가지 (2026-11-03 사용자 「인물 그림 8가지 추가」 + 두 번째 친구).
인물 기준 그림(cast.png)을 참고로 같은 크레용 화풍 · 같은 선. 흰 바탕 → 오림. 서서 정면."""
import base64, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_all as G

PEOPLE = {
    "grandma": "a kind grandmother with gray hair in a bun, round glasses, purple cardigan and long skirt",
    "grandpa": "a kind grandfather with short white hair and a white mustache, brown vest, gray trousers",
    "mom": "a kind young mother with shoulder-length brown hair, light blue blouse, beige trousers",
    "dad": "a kind young father with short black hair, navy shirt, gray trousers",
    "teacher": "a friendly school teacher (gender-neutral, short hair), holding a small book, orange cardigan",
    "baby": "a happy toddler baby sitting up, in a light yellow onesie",
    "dog": "a friendly small brown puppy dog standing, side-front view",
    "cat": "a cute orange striped cat sitting, front view",
    "friend2": "a friend girl child with two short pigtails, pink dress over leggings, white sneakers",
}
FIG = ("Draw ONLY one character: {who}. Exactly the same crayon picture-book style, line quality and coloring as the "
       "reference image (same kind of faces and proportions as the children in it). Alone, full body, standing (or "
       "sitting for the baby / cat), front view, friendly expression. Plain pure white background, no ground, no "
       "shadow, nothing else. " + G.NO_TEXT)

def main():
    c = G.OpenAI(api_key=G.KEY, timeout=300)
    def one(item):
        n, who = item
        p = G.OUT / f"person-{n}.png"
        if p.exists(): return n, "skip"
        with open(G.CAST_REF, "rb") as f:
            r = c.images.edit(model="gpt-image-2", image=[f], prompt=FIG.format(who=who), size="1024x1024", quality="medium", output_format="png")
        p.write_bytes(base64.b64decode(r.data[0].b64_json)); return n, "ok"
    with ThreadPoolExecutor(3) as ex:
        for n, st in ex.map(one, PEOPLE.items()): print(n, st, flush=True)

if __name__ == "__main__":
    main()
