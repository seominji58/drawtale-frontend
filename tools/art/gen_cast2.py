"""대본 인물 묶음 남녀 · 동물 · 물건 56장 (2026-11-03, 사용자 「인물 묶음별로 남녀 그림 만들어, 물건은 전부 만들어줘」).

카드 이야기 512가지에서 센 목록(아티팩트 「대본 인물 · 물건 목록」). 인물은 cast.png, 물건은 놀이터 배경판을 참고로 같은 크레용 화풍.
gpt-image-2 medium, 흰 바탕 → 오림(process_cast2.py). 이미 있는 파일은 건너뛴다.
"""

import base64
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gen_all as G  # noqa: E402

PEOPLE = {
    "caveguide-m": "a friendly man cave guide with a short brown beard, a yellow safety helmet with a small headlamp, a green vest over a beige shirt, khaki trousers, boots",
    "caveguide-f": "a friendly woman cave guide with short brown hair, a yellow safety helmet with a small headlamp, a green vest over a white shirt, khaki trousers, boots",
    "astronaut-m": "a friendly man astronaut in a white spacesuit with orange stripes, holding his round space helmet under one arm, short black hair",
    "astronaut-f": "a friendly woman astronaut in a white spacesuit with orange stripes, holding her round space helmet under one arm, short brown hair",
    "ranger-m": "a friendly man forest ranger with a short brown beard, a green ranger hat, a green vest over a khaki shirt, khaki trousers",
    "ranger-f": "a friendly woman forest ranger with a short bob, a green ranger hat, a green vest over a khaki shirt, khaki trousers",
    "lifeguard-m": "a friendly man beach lifeguard with short black hair, a red t-shirt, yellow shorts, a whistle on a cord, a red cap",
    "lifeguard-f": "a friendly woman beach lifeguard with a brown ponytail, a red t-shirt, yellow shorts, a whistle on a cord",
    "shopkeeper-m": "a friendly man shopkeeper with short brown hair and a small mustache, a green apron over a white shirt",
    "shopkeeper-f": "a friendly woman shopkeeper with curly brown hair, a floral apron over a striped shirt",
    "keeper-m": "a friendly man playground and school safety keeper with short black hair, a bright yellow safety vest, a cap",
    "keeper-f": "a friendly woman playground and school safety keeper with short permed hair, a bright yellow safety vest",
    "police-m": "a friendly man police officer with short black hair, a navy blue police uniform and police cap",
    "police-f": "a friendly woman police officer with a neat low ponytail, a navy blue police uniform and police cap",
    "cook-m": "a friendly man school cook with a white cook hat, a white apron over a white shirt",
    "cook-f": "a friendly woman school cook with short black hair, a white cook hat, a white apron",
    "mail-m": "a friendly man mail carrier with a blue cap, a blue uniform and a brown mail bag",
    "mail-f": "a friendly woman mail carrier with a blue cap, a blue uniform and a brown mail bag",
    "nurse": "a gentle woman school nurse with a neat bun, a white coat over a light blue blouse",
    "busdriver": "a cheerful man bus driver with gray sideburns, a light blue uniform shirt and a cap",
    "classmates": "three cheerful young elementary school classmates standing side by side, two girls and one boy, colorful casual clothes",
    "bat": "a small cute round brown bat with big friendly eyes and tiny wings spread, front view (no ground)",
    "bird": "a small cute round bird with soft blue feathers, a white chest and a small orange beak, standing",
    "rabbit": "a small fluffy white rabbit with pink inner ears, sitting, front view",
    "squirrel": "a small fluffy reddish-brown squirrel with a bushy tail, sitting and holding an acorn",
    "alien": "a small round friendly green alien child with big shiny black eyes and two short antennae with tiny balls",
}

OBJECTS = {
    "nest": "a cozy bird nest made of twigs with three small pale blue eggs, flat bottom",
    "crayons": "a box of colorful crayons next to a sheet of drawing paper with a simple child's drawing of a sun, flat",
    "cushion": "a soft round floor cushion with a little button in the middle, flat bottom",
    "rug": "a small round woven rug lying flat on the floor, seen from a low front angle",
    "fence": "a short white wooden picket fence section, front view, flat bottom",
    "gate": "a small wooden house gate with a little arch, front view, flat bottom",
    "shells": "a few colorful seashells and one orange starfish lying together, flat bottom",
    "puddle": "a shallow rain puddle on the ground with tiny ripples, seen from a low front angle, flat",
    "stairs": "a short flight of five wide stone steps going up to the right, side-front view, flat bottom",
    "backpack": "a cute child's backpack with two straps, front view, flat bottom",
    "clock": "a round wall clock with simple hands (no numbers, only dots), front view",
    "hat": "a child's yellow bucket hat, front view, flat bottom",
    "blocks": "a small tower of colorful wooden toy blocks (no letters), flat bottom",
    "books": "a small stack of three picture books with blank covers (no letters), flat bottom",
    "seagull": "a friendly white seagull with gray wings, standing, side view, flat bottom",
    "spaceship": "a cute small round rocket spaceship with a round window, standing on three legs, front view, flat bottom (no letters)",
    "sandtoys": "a red sand bucket with a yellow plastic shovel leaning on it, flat bottom",
    "milk": "a white cup of warm milk on a small saucer, flat bottom",
    "acorns": "a few acorns and one pinecone lying together, flat bottom",
    "gift": "a gift box wrapped in blue paper with a red ribbon bow, flat bottom",
    "teddy": "a soft brown teddy bear sitting, front view, flat bottom",
    "crab": "a small friendly red crab, front view, flat bottom",
    "flag": "a small triangular red flag on a wooden pole standing up, flat bottom",
    "mailbox": "a red standing mailbox on a short post (no letters, no numbers), front view, flat bottom",
    "bridge": "a small wooden footbridge with low railings, side view, flat bottom",
    "towel": "a neatly folded soft blue towel with a small handkerchief on top, flat bottom",
    "cake": "a small round strawberry cake with a few cookies beside it on a plate, flat bottom",
    "umbrella": "an open yellow umbrella standing tilted on the ground, flat bottom",
    "toytrain": "a colorful wooden toy train with three cars, side view, flat bottom",
    "flowerpot": "a terracotta flower pot with red and yellow flowers, front view, flat bottom",
}

FIG = ("Draw ONLY {who}. Exactly the same crayon picture-book style, line quality and coloring as the reference image "
       "(same kind of faces and proportions as the people in it). Alone, full body, front view, friendly expression. "
       "Plain pure white background, no ground, no shadow, nothing else. " + G.NO_TEXT)


def main() -> None:
    client = G.OpenAI(api_key=G.KEY, timeout=300)

    def one(job):
        name, prompt, ref = job
        p = G.OUT / f"{name}.png"
        if p.exists():
            return name, "skip"
        err = ""
        for _ in range(2):
            try:
                with open(ref, "rb") as f:
                    r = client.images.edit(model="gpt-image-2", image=[f], prompt=prompt, size="1024x1024",
                                           quality="medium", output_format="png")
                p.write_bytes(base64.b64decode(r.data[0].b64_json))
                return name, "ok"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:160]
        return name, "ERR " + err

    jobs = [(f"person-{n}", FIG.format(who=w), G.CAST_REF) for n, w in PEOPLE.items()]
    jobs += [(f"obj-{n}", G.OBJ.format(what=w), G.STYLE_REF) for n, w in OBJECTS.items()]
    with ThreadPoolExecutor(3) as ex:
        for name, st in ex.map(one, jobs):
            print("done", name, st, flush=True)


if __name__ == "__main__":
    main()
