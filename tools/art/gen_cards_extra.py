"""11/3 그림 교체 뒤에 더해져 이모지로 남은 행동 카드 6장 (2026-11-09, 사용자 「6장 새로 그리기」).

- 문제를 말로 정했을 때 기본 행동 4장: 손을 흔들었어요 · 천천히 걸어갔어요 · 달려갔어요 · 기다렸어요 (choices.ts RAW action)
- 사람 아닌 주인공 2장 (choices.ts BODY_ACTIONS): 몸을 흔들었어요 · 재롱을 부려 웃게 했어요.
  주인공이 강아지일지 물고기일지 모르니 특정 동물을 그리지 않는다: 몸을 흔드는 둥근 친구 / 주인공을 보고 웃는 친구 아이

11/3 원본 기준 그림(cast.png)은 남아 있지 않아, 같은 아이 · 친구가 나오는 카드 「다가가서 도와줬어요」를 참고 그림으로 넣는다.
gpt-image-2 medium 1024, 장당 약 $0.041. 이미 있는 파일은 건너뛴다. 키는 백엔드 .env 에서 읽기만 한다.

    python tools/art/gen_cards_extra.py --dry   # 지시문만 보기 (API 안 부름)
    python tools/art/gen_cards_extra.py         # 생성 → tools/art/all/*.png → public/icons/action/*.webp
"""
import base64
import io
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

import card_fit
from gen_all import ADULT, CARD, FRIEND, KEY, KID, OUT

HERE = Path(__file__).parent
FRONT = HERE.parents[1] / "public"
REF_SRC = FRONT / "icons" / "action" / "help_friend.webp"

K, F = KID, FRIEND
# 같은 지시문 틀(CARD) 그대로. 인물이 둘인 참고 그림이라 「이 카드에 나오는 사람」을 분명히 적는다
CARDS = {
    "wave": ("waved a hand", f"only {K}, alone, waving one hand high with a bright smile."),
    "walk": ("walked slowly", f"only {K}, alone, walking slowly and calmly forward along a path, small relaxed steps."),
    "run": ("ran", f"only {K}, alone, running happily forward, arms swinging."),
    "wait": ("waited", f"only {K}, alone, standing and waiting patiently, hands clasped behind the back, calm face."),
    # 사람 아닌 주인공 — 종류를 정하지 않은 동글동글한 친구, 아이 · 어른은 그리지 않는다
    "body_wiggle": ("wiggled its whole body",
                    "a small round soft friendly creature (no particular animal: a simple round body with two dot eyes and "
                    "a happy little mouth, no arms or legs) wiggling its whole body happily, with a few short curved "
                    "motion lines on both sides. Do not draw any child or adult."),
    "body_smile": ("did something funny to make the friend laugh",
                   f"only {F}, alone, laughing happily and looking toward the left edge of the card, as if watching "
                   "something funny there, with a few small sparkle marks. Do not draw anyone else."),
}
assert ADULT  # 같은 인물 설정을 쓴다는 표시 (어른은 이번 카드에 없다)


SAME_PEOPLE = "Use the characters exactly as in the reference image (same faces, hair and clothes). "
STYLE_ONLY = "Match only the crayon style and colors of the reference image; do not copy the people in it. "


def prompt(meaning: str, scene: str, people: bool = True) -> str:
    p = CARD.format(meaning=meaning, scene=scene)
    assert SAME_PEOPLE in p
    return p if people else p.replace(SAME_PEOPLE, STYLE_ONLY)


def main() -> None:
    dry = "--dry" in sys.argv
    jobs = {f"action-{cid}": prompt(m, s, people=cid != "body_wiggle") for cid, (m, s) in CARDS.items()}
    if dry:
        for name, p in jobs.items():
            print(f"[{name}] {'있음, 건너뜀' if (OUT / f'{name}.png').exists() else '만듦'}\n{p}\n")
        print(f"참고 그림: {REF_SRC.relative_to(FRONT.parent)} ({'있음' if REF_SRC.exists() else '없음'})")
        return

    from openai import OpenAI

    OUT.mkdir(exist_ok=True)
    buf = io.BytesIO()
    Image.open(REF_SRC).convert("RGB").save(buf, "PNG")
    ref = buf.getvalue()
    client = OpenAI(api_key=KEY, timeout=300)

    def edit(item):
        name, p = item
        path = OUT / f"{name}.png"
        if path.exists():
            return name, None
        err = ""
        for _ in range(2):
            try:
                res = client.images.edit(model="gpt-image-2", image=[("ref.png", ref, "image/png")], prompt=p,
                                         size="1024x1024", quality="medium", output_format="png")
                path.write_bytes(base64.b64decode(res.data[0].b64_json))
                return name, res.usage.model_dump() if getattr(res, "usage", None) else {}
            except Exception as e:  # noqa: BLE001, 한 번만 다시
                err = str(e)[:200]
        return name, {"error": err}

    usage = {}
    with ThreadPoolExecutor(3) as ex:
        for name, u in ex.map(edit, jobs.items()):
            if u is not None:
                usage[name] = u
            print("done", name, "ERR " + u["error"] if u and "error" in u else "", flush=True)
    (OUT / "usage-cards-extra.json").write_text(json.dumps(usage, indent=1), encoding="utf-8")
    for cid in CARDS:
        src = OUT / f"action-{cid}.png"
        if src.exists():
            card_fit.fit(src, FRONT / "icons" / "action" / f"{cid}.webp")
    print("ok")


if __name__ == "__main__":
    main()
