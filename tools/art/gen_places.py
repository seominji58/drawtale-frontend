"""장소 안 세부 장소 — 대본이 쪽마다 고른다 (2026-11-03, 사용자 「대본 이미지 작업도 다 진행해」).

배경판(물건 없음)과 그 자리의 물건을 B 크레용 화풍으로. gen_all.py 와 같은 참고 그림 · 같은 땅선(60%).
실내는 벽과 바닥이 만나는 선이 땅선이다. 이미 있는 파일은 건너뛴다.
"""

import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gen_all as G  # noqa: E402

OUT = G.OUT
INDOOR = ("Draw a new wide, empty picture-book background of an indoor room in exactly the same crayon style, colors, "
          "paper texture as the reference image: {what}. Straight-on flat front view of ONE wall facing the viewer, like a "
          "stage set — no perspective, no vanishing point, no side walls, no ceiling. The wall fills the upper part and the floor fills the lower 40%, "
          "the line where the wall meets the floor at about 60% from the top, the floor wide, flat and completely empty. "
          "IMPORTANT: no furniture, no objects on the floor, no people, no animals, nothing standing. Walls may have only "
          "soft plain color. Pale, soft, low-contrast colors so that a child's drawing placed on top stands out. "
          + G.NO_TEXT)

# 세부 장소 id → (실내인지, 배경판 설명, {물건 id: 설명})
SUBS = {
    "home-living": (True, "a cozy living room with warm cream walls and a light wooden floor",
                    {"sofa": "a comfy small sofa with two cushions, front view, flat bottom",
                     "window": "a window with soft curtains showing a little blue sky, front view"}),
    "home-kitchen": (True, "a bright small kitchen with pale yellow walls and a tiled floor",
                     {"counter": "a low kitchen counter with a sink and a pot on top, front view, flat bottom",
                      "table": "a small round kitchen table with two chairs, flat bottom"}),
    "home-bedroom": (True, "a child's bedroom with soft blue walls and a wooden floor",
                     {"bed": "a small child's bed with a blanket and pillow, side view, flat bottom",
                      "toybox": "an open toy box with a teddy bear and a ball peeking out, flat bottom"}),
    "playground-path": (False, "a park walking path: soft sky, a far line of trees on the horizon, a wide pale path and grass",
                        {"bench": "a wooden park bench, front view, flat bottom",
                         "flowerbed": "a small round flower bed with colorful flowers, flat bottom"}),
    "school-classroom": (True, "a school classroom with pale green walls and a wooden floor",
                         {"board": "a green chalkboard on legs, completely blank (no writing, no drawings), front view, flat bottom",
                          "desks": "two small school desks with chairs side by side, front view, flat bottom"}),
    "school-cafeteria": (True, "a school cafeteria with light peach walls and a clean tiled floor",
                         {"table": "a long cafeteria table with a bench and two food trays with rice and soup, flat bottom",
                          "counter": "a serving counter with big pots, front view, flat bottom"}),
    "school-hallway": (True, "a school hallway seen from the side: one long pale wall facing the viewer and a shiny floor",
                       {"lockers": "a row of three small colorful lockers (no numbers, no letters), front view, flat bottom",
                        "window": "a wide hallway window showing sky, front view"}),
    "school-music": (True, "a school music room with soft lavender walls and a wooden floor",
                     {"piano": "an upright piano with a stool, front view, flat bottom",
                      "drums": "a small kids' drum set, front view, flat bottom"}),
    "school-library": (True, "a school library with warm walls and a carpet floor",
                       {"shelf": "a wide low bookshelf full of colorful books with blank spines (no letters), front view, flat bottom",
                        "beanbag": "a soft round reading beanbag cushion, flat bottom"}),
    "town-market": (False, "a small friendly outdoor market street: soft sky, far rooftops, a pale paved street",
                    {"stall": "a fruit stall with a striped awning and baskets of apples (no signs, no letters), front view, flat bottom",
                     "cart": "a small vegetable cart with wheels, flat bottom"}),
    "town-park": (False, "a town park: soft sky, a far row of trees, a wide grass lawn",
                  {"fountain": "a small round stone fountain with water, front view, flat bottom",
                   "bench": "a wooden park bench, front view, flat bottom"}),
    "town-busstop": (False, "a quiet street with a bus stop: soft sky, far small buildings, a pale sidewalk",
                     {"shelter": "a small bus stop shelter with a bench (no signs, no letters, no numbers), front view, flat bottom",
                      "bus": "a cute small yellow bus, side view, flat bottom (no letters, no numbers)"}),
    "forest-stream": (False, "a forest with a little stream: soft green light, far trees, a stream crossing the grassy ground",
                      {"rocks": "a few round stepping stones, flat bottom",
                       "reeds": "a clump of reeds and small plants, flat bottom"}),
    "forest-trail": (False, "a forest trail: tall far trees, soft light, a winding dirt path on the forest floor",
                     {"log": "a fallen log with a little moss, side view, flat bottom",
                      "sign": "a small wooden trail post with a blank arrow (no letters), flat bottom"}),
    "forest-flowers": (False, "a flower meadow at the forest edge: soft sky, far trees, wide grass full of tiny flowers",
                       {"flowers": "a big cluster of colorful wildflowers, flat bottom",
                        "butterflybush": "a round flowering bush with two butterflies, flat bottom"}),
    "sea-underwater": (False, "under the sea: soft blue water above, light rays, a wide sandy sea floor",
                       {"coral": "a colorful soft coral reef cluster, flat bottom",
                        "fish": "a small group of three friendly fish swimming (no ground)"}),
    "sea-pier": (False, "a seaside pier: soft sky, calm sea along the horizon, a wide wooden pier floor",
                 {"boat": "a small friendly rowing boat, side view, flat bottom",
                  "lighthouse": "a small red-and-white lighthouse, front view, flat bottom"}),
    "space-ship": (True, "inside a friendly spaceship: soft grey-blue walls with round windows showing stars, a smooth floor",
                   {"panel": "a spaceship control panel with colorful round buttons (no letters, no numbers), front view, flat bottom",
                    "seat": "a round comfy pilot seat, flat bottom"}),
    "space-planet": (False, "the surface of a colorful alien planet: a soft purple sky with two moons, gentle pink-orange ground",
                     {"plants": "a cluster of cute round alien plants, flat bottom",
                      "rover": "a small friendly planet rover with wheels, side view, flat bottom"}),
    "cave-entrance": (False, "a cave entrance from the outside: soft sky, a big rock wall with a dark round cave opening in the "
                             "middle of the wall, grassy ground in front",
                      {"rocks": "a pile of round mossy rocks, flat bottom",
                       "lantern": "an old-fashioned lantern glowing softly, flat bottom"}),
    "cave-lake": (True, "an underground cave lake: soft blue-grey cave walls, glowing spots, a calm shallow lake at the back "
                        "and flat sandy ground in front",
                  {"crystal": "a cluster of glowing soft blue crystals, flat bottom",
                   "boat": "a tiny wooden boat, side view, flat bottom"}),
}


def main() -> None:
    from openai import OpenAI  # noqa: F401 — gen_all 이 만든다

    client = G.OpenAI(api_key=G.KEY, timeout=300)

    def edit(name, prompt, size):
        p = OUT / f"{name}.png"
        if p.exists():
            return name, "skip"
        import base64
        for _ in range(2):
            try:
                with open(G.STYLE_REF, "rb") as f:
                    res = client.images.edit(model="gpt-image-2", image=[f], prompt=prompt, size=size,
                                             quality="medium", output_format="png")
                p.write_bytes(base64.b64decode(res.data[0].b64_json))
                return name, "ok"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:160]
        return name, "ERR " + err

    jobs = []
    for sid, (indoor, what, objs) in SUBS.items():
        plate = (INDOOR.format(what=what) if indoor else G.PLATE.format(what=what)) + "Style: " + G.STYLE
        jobs.append((f"plate-{sid}", plate, "1536x1024"))
        for oid, desc in objs.items():
            jobs.append((f"{sid}-{oid}", G.OBJ.format(what=desc), "1024x1024"))
    with ThreadPoolExecutor(3) as ex:
        for name, st in ex.map(lambda j: edit(*j), jobs):
            print("done", name, st, flush=True)


if __name__ == "__main__":
    main()
