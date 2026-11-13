"""B 크레용 화풍으로 목업 그림 전체 (2026-11-03, 사용자 「화풍은 B 크레용으로 해서 전체 수정 진행」).

- 배경판 7 (놀이터는 b-crayon/plate.png 를 씀) — 놀이터 배경판을 참고 그림으로 넣어 같은 화풍 · 같은 땅선
- 배경 속 물건 17 + 기본 소품 6 — 놀이터 배경판을 참고로, 흰 바탕에 하나씩 → 오림
- 인물 기준 그림 1 → 인물이 나오는 카드 36 · 삽화는 이것을 참고로 (같은 얼굴 · 옷)
- S-02 예시 6 — 우리 화풍이 아니라 「실제 아이가 흰 종이에 그린 그림」
gpt-image-2 medium. 이미 있는 파일은 건너뛴다. 키는 백엔드 .env 에서 읽기만 한다.
"""

import base64
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from openai import OpenAI

HERE = Path(__file__).parent
OUT = HERE / "all"
STYLE_REF = HERE / "b-crayon" / "plate.png"
CAST_REF = OUT / "cast.png"
ENV = Path(__file__).resolve().parents[3] / "drawtale-backend-git" / ".env"
KEY = next(l.split("=", 1)[1].strip().strip('"') for l in ENV.read_text(encoding="utf-8").splitlines()
           if l.startswith("OPENAI_API_KEY="))

STYLE = ("waxy crayon drawing, visible crayon strokes and paper grain, bold simple outlines, soft warm colors, "
         "like a warm picture book for young children")
NO_TEXT = "No text, no letters, no numbers anywhere. "
KID = ("the main child (about 6 years old, gender-neutral: short rounded bob haircut, no bows or ribbons, round face, "
       "rosy cheeks, plain yellow t-shirt, blue pants, red sneakers)")
ADULT = "the kind adult (gender-neutral, short hair, green sweater, brown pants)"
FRIEND = "the friend child (curly dark hair, red-and-white striped shirt, green shorts)"

PLATE = ("Draw a new wide, empty picture-book background in exactly the same crayon style, colors, paper texture and "
         "horizon height as the reference image, but of a different place: {what}. Only the sky (or ceiling) and the "
         "ground, with the horizon line at about 60% from the top and wide flat open ground filling the lower 40%, "
         "completely empty. IMPORTANT: no objects standing on the ground, no buildings, no trees, no furniture, no sun, "
         "no people, no animals. Pale, soft, low-contrast colors so that a child's drawing placed on top stands out. "
         + NO_TEXT)
PLATES = {
    "home": "a quiet backyard of a family house: soft sky, a low line of hedges far away, a grassy lawn",
    "school": "a school yard: soft sky, distant low hedge, a flat dirt and grass playing field",
    "town": "a small friendly town street: soft sky, a far row of tiny rooftops on the horizon, a wide pale paved square",
    "forest": "a forest clearing: soft green-tinted sky between far tree tops on the horizon, a mossy grassy forest floor",
    "sea": "a sunny beach: soft sky, calm blue sea along the horizon, wide pale sand in front",
    "space": "outer space on the surface of a small moon: deep but soft navy sky with a few small stars, "
             "a pale grey cratered ground (keep it gentle, not scary)",
    "cave": "inside a friendly cave: soft brown-grey rock wall in the upper part, a few glowing spots, "
            "a flat sandy cave floor (keep it warm and not scary)",
}

OBJ = ("Draw ONLY {what}, in exactly the same crayon style, line quality and colors as the reference image. One object "
       "alone, centered, the whole object visible with empty space around it, front view. Plain pure white background, "
       "no ground, no grass, no shadow, no sky. Clear dark outlines, slightly stronger colors than the reference. "
       + NO_TEXT)
OBJECTS = {
    "home-house": "a small cozy family house with a red roof, a door and two windows, standing upright, flat bottom",
    "home-fence": "a short low wooden picket fence section, wide and low, flat bottom",
    "school-building": "a small friendly school building with a clock-less front, a door and windows, flat bottom",
    "school-bars": "a small children's climbing bars / monkey bars frame, flat bottom",
    "town-houses": "two small town houses side by side with different roof colors, flat bottom",
    "town-lamp": "one tall old-fashioned street lamp, flat bottom",
    "forest-pine": "one tall pine tree, flat bottom of the trunk",
    "forest-mushroom": "a small cluster of three cute red-and-white mushrooms, flat bottom",
    "sea-parasol": "a beach umbrella (parasol) with stripes stuck in the sand, flat bottom",
    "sea-castle": "a small sand castle with a tiny flag (no letters on the flag), flat bottom",
    "sea-rock": "a low round seaside rock with a small starfish on it, flat bottom",
    "space-planet": "a small round ringed planet floating (no ground)",
    "space-rocket": "a small friendly rocket standing upright on its fins, flat bottom",
    "space-rock": "a low cluster of grey moon rocks, flat bottom",
    "cave-rocks": "a low pile of rounded cave rocks, flat bottom",
    "cave-stalactite": "a group of three stalactites hanging down, the flat top edge is where they hang from",
    "cave-crystal": "a small cluster of soft glowing blue crystals, flat bottom",
    # 기본 소품 (pt_docs 14 — 친구 · 어른 · 숨을 것 · 해 · 표지판, 숨을 것은 상자 · 덤불 둘)
    "prop-box": "a large cardboard box, big enough for a child to hide behind, flat bottom",
    "prop-bush": "a round thick green bush, big enough for a child to hide behind, flat bottom",
    "prop-sun": "a round smiling sun with short rays",
    "prop-sign": "a wooden signpost with one arrow board pointing right (blank board, no writing), flat bottom",
}

# 인물이 나오는 그림 — 기준 그림(cast.png)을 참고로 넣는다
CARD = ("A square picture card for young children, meaning: {meaning}. Show {scene} Use the characters exactly as in the "
        "reference image (same faces, hair and clothes). Simple, clear, one idea only, characters large, a tiny hint of "
        "ground only if needed, no busy background. Crayon style as in the reference. Plain pure white background "
        "around the vignette. " + NO_TEXT)
K, A, F = KID, ADULT, FRIEND
CARDS = {
    # 문제
    "problem-fall": ("fell down", f"{K} sitting on the ground after tripping, holding a scraped knee, a little sad (not crying hard)."),
    "problem-crying": ("a friend is crying", f"{F} crying with tears, and {K} looking at the friend with concern."),
    "problem-lost": ("got lost", f"{K} standing at a fork in a path, looking around, puzzled, with a small question-mark-shaped swirl of wind (not a letter)."),
    "problem-dark": ("it got dark", f"{K} standing outdoors at dusk under a dark blue sky with a crescent moon and a few stars, looking up, a little uneasy."),
    # 행동 — 넘어졌어요
    "action-fall_run": ("brushed it off and ran", f"{K} brushing dust off the knees and starting to run, cheerful."),
    "action-call_adult": ("called a grown-up", f"{K} waving one hand high and calling to {A} who is a little further away."),
    "action-walk_again": ("walked again slowly", f"{K} walking slowly and carefully, small steps."),
    "action-fall_rest": ("rested and waited a moment", f"{K} sitting calmly on a little bench, resting."),
    # 행동 — 친구가 울고 있었어요
    "action-help_friend": ("went over and helped", f"{K} reaching out a hand to help {F} stand up."),
    "action-wave_smile": ("waved to make the friend smile", f"{K} waving with a big smile to {F}, who starts to smile."),
    "action-run_adult": ("ran to a grown-up", f"{K} running toward {A}."),
    "action-wait_beside": ("waited beside the friend", f"{K} sitting quietly next to {F}."),
    # 행동 — 길을 잃었어요
    "action-stay_wait": ("stayed in place and waited", f"{K} standing still in one spot, calm, hands together, waiting."),
    "action-ask_adult": ("asked a grown-up", f"{K} looking up and talking to {A}, who bends down to listen."),
    "action-look_walk": ("walked looking around", f"{K} walking while looking left and right carefully."),
    "action-run_sign": ("ran to the signpost", f"{K} running toward a wooden signpost with a blank arrow board."),
    # 행동 — 어두워졌어요
    "action-hide": ("hid", f"{K} peeking out from behind a big cardboard box, only the head and hands visible."),
    "action-run_light": ("ran to a bright place", f"{K} running toward a warm glowing street lamp at dusk."),
    "action-tiptoe": ("tiptoed quietly", f"{K} tiptoeing quietly, arms slightly out for balance, dusk sky."),
    "action-still_wait": ("waited calmly", f"{K} standing calmly under a crescent moon, taking a slow breath."),
    # 결과 — 넘어졌어요
    "result-okay": ("felt better soon", f"{K} smiling with a small bandage on the knee."),
    "result-smile": ("started laughing", f"{K} laughing happily."),
    "result-got_there": ("got to where they were going", f"{K} arriving happily at a small playground gate, arms up."),
    "result-new_friend": ("made a new friend", f"{K} and {F} holding hands and smiling."),
    # 결과 — 친구가 울고 있었어요
    "result-tears_stop": ("the friend's tears stopped", f"{F} smiling again with dry eyes, {K} next to them."),
    "result-thanked": ("was thanked", f"{F} giving {K} a small red heart, both smiling."),
    "result-best_friend": ("became close friends", f"{K} and {F} hugging happily."),
    "result-party_friend": ("everyone was happy", f"{K}, {F} and {A} cheering together with arms up."),
    # 결과 — 길을 잃었어요
    "result-found_way": ("found the way", f"{K} happily following a path with blank arrow signs."),
    "result-adult_took": ("a grown-up took them there", f"{A} holding hands with {K}, walking together."),
    "result-relief": ("felt relieved", f"{K} with a hand on the chest, eyes closed, relieved soft smile."),
    "result-party_lost": ("everyone was happy", f"{K} and {A} cheering together with arms up."),
    # 결과 — 어두워졌어요
    "result-sun": ("the sun came up", f"{K} stretching both arms up as a smiling sun rises behind."),
    "result-brave": ("felt brave", f"{K} standing proudly with fists up, confident smile."),
    "result-sleep": ("fell asleep", f"{K} sleeping peacefully in a small bed with a blanket, a crescent moon in the window."),
    "result-back_safe": ("got back home safely", f"{K} at the open door of a small cozy house, smiling."),
    # 삽화
    "illust-paper": ("ready to draw", f"{K} holding up a blank sheet of white paper and a crayon, excited."),
    "illust-pencil": ("writing a story", f"{K} sitting and writing in a big open book with a big pencil, focused and happy."),
    "illust-puzzled": ("puzzled", f"{K} tilting the head, puzzled, finger on the chin, gentle (not sad)."),
    "illust-party": ("celebration", f"{K} jumping with joy, arms up, a few paper confetti pieces around."),
}

# 기본 소품 중 인물 — 장면에 겹칠 한 사람, 서서 정면
FIG = ("Draw ONLY {who} from the reference image, alone, full body, standing, front view, friendly expression, "
       "exactly the same face, hair and clothes as in the reference. Plain pure white background, no ground, no shadow. "
       + NO_TEXT)
FIGS = {"prop-friend": FRIEND, "prop-adult": ADULT}

CAST = ("A character reference sheet: three characters standing side by side, full body, front view, evenly spaced, "
        f"on a plain pure white background. Left: {KID}. Middle: {ADULT}. Right: {FRIEND}. In exactly the same crayon "
        "style and line quality as the reference image. " + NO_TEXT)

# S-02 예시 — 실제 아이 그림처럼 (우리 화풍 아님)
KIDART = ("A real young child's crayon drawing on plain white paper, scanned flat, nothing else on the page: {what}. "
          "Simple wobbly lines, the way a 6-year-old really draws, whole drawing inside the paper with space around it. "
          + NO_TEXT)
S02 = {
    "s02-one": "one person standing, front view, arms a little away from the body, legs apart",
    "s02-white": "one person standing on clean bright white paper, clear dark outlines, no lines or grid on the paper",
    "s02-spread": "one person standing with arms stretched out to the sides and legs apart, clearly separated from the body",
    "s02-many": "three people standing next to each other holding hands",
    "s02-biped": "a teddy bear standing on two legs like a person, arms out",
    "s02-quad": "a dog standing on four legs, side view",
}


def save(path: Path, res) -> dict:
    path.write_bytes(base64.b64decode(res.data[0].b64_json))
    return res.usage.model_dump() if getattr(res, "usage", None) else {}


def main() -> None:
    OUT.mkdir(exist_ok=True)
    client = OpenAI(api_key=KEY, timeout=300)
    usage = {}

    def edit(name, prompt, size, ref):
        p = OUT / f"{name}.png"
        if p.exists():
            return name, None
        for attempt in range(2):
            try:
                with open(ref, "rb") as f:
                    res = client.images.edit(model="gpt-image-2", image=[f], prompt=prompt, size=size,
                                             quality="medium", output_format="png")
                return name, save(p, res)
            except Exception as e:  # noqa: BLE001 — 한 번만 다시
                err = str(e)[:200]
        return name, {"error": err}

    def gen(name, prompt, size):
        p = OUT / f"{name}.png"
        if p.exists():
            return name, None
        res = client.images.generate(model="gpt-image-2", prompt=prompt, size=size, quality="medium",
                                     output_format="png")
        return name, save(p, res)

    jobs = [lambda n=n, w=w: edit(f"plate-{n}", PLATE.format(what=w) + "Style: " + STYLE, "1536x1024", STYLE_REF)
            for n, w in PLATES.items()]
    jobs += [lambda n=n, w=w: edit(n, OBJ.format(what=w), "1024x1024", STYLE_REF) for n, w in OBJECTS.items()]
    jobs += [lambda n=n, w=w: gen(n, KIDART.format(what=w), "1024x1024") for n, w in S02.items()]
    jobs.append(lambda: edit("cast", CAST, "1536x1024", STYLE_REF))
    with ThreadPoolExecutor(3) as ex:
        for name, u in ex.map(lambda j: j(), jobs):
            if u is not None:
                usage[name] = u
            print("done", name, "ERR " + u["error"] if u and "error" in u else "", flush=True)
    if not CAST_REF.exists():
        sys.exit("cast.png 없음")
    card_jobs = [lambda n=n, m=m, s=s: edit(n, CARD.format(meaning=m, scene=s), "1024x1024", CAST_REF)
                 for n, (m, s) in CARDS.items()]
    card_jobs += [lambda n=n, w=w: edit(n, FIG.format(who=w), "1024x1024", CAST_REF) for n, w in FIGS.items()]
    with ThreadPoolExecutor(3) as ex:
        for name, u in ex.map(lambda j: j(), card_jobs):
            if u is not None:
                usage[name] = u
            print("done", name, "ERR " + u["error"] if u and "error" in u else "", flush=True)
    prev = json.loads((OUT / "usage.json").read_text(encoding="utf-8")) if (OUT / "usage.json").exists() else {}
    prev.update(usage)
    (OUT / "usage.json").write_text(json.dumps(prev, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
