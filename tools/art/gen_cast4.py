"""바닷속 잠수부 4장 (2026-11-10, 사용자 「바다 속에 등장하는 인물 캐릭터는 잠수부로 넣어」): 어른 잠수부 남녀,
잠수복 입은 아이 남녀. gen_cast2.py 와 같은 참고 그림(cast) · 지시문(FIG), gpt-image-2 medium.
장면 등장인물 동작(걷기 · 인사 그림띠)을 붙이니 팔을 몸에서 조금 떼어 그린다 (팔이 옷에 붙으면 몸과 같이 움직였다).
오리기는 process_cast2.py 의 cut 과 같다: python tools/art/process_cast4.py"""
import base64
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gen_all as G  # noqa: E402
from gen_cast2 import FIG  # noqa: E402

# 화풍 참고: 화면에 이미 있는 인물 그림(안전 요원 · 우주복 아이 남녀)을 한 장으로. 처음 인물 기준 그림(all/cast.png)이 이 PC 에 없다
REF = G.OUT / "cast-people.png"
ARMS = ", both arms held slightly away from the body"
PEOPLE = {
    "diver-m": "a friendly man scuba diver in a dark blue wetsuit with yellow stripes, a diving mask pushed up on his forehead so his kind face shows, a small yellow air tank on his back, black flippers, short black hair" + ARMS,
    "diver-f": "a friendly woman scuba diver in a teal wetsuit with orange stripes, a diving mask pushed up on her forehead so her kind face shows, a small orange air tank on her back, black flippers, a short brown ponytail" + ARMS,
    "diverkid-m": "a little boy about six years old (child height and proportions, not an adult) in a light green kid wetsuit, swim goggles pushed up on his forehead, small blue flippers, short black hair" + ARMS,
    "diverkid-f": "a little girl about six years old (child height and proportions, not an adult) in a pink kid wetsuit, swim goggles pushed up on her forehead, small purple flippers, short curly black hair" + ARMS,
}


def main() -> None:
    client = G.OpenAI(api_key=G.KEY, timeout=300)

    def one(item):
        name, who = item
        p = G.OUT / f"person-{name}.png"
        if p.exists():
            return name, "skip"
        err = ""
        for _ in range(2):
            try:
                with open(REF, "rb") as f:
                    r = client.images.edit(model="gpt-image-2", image=[f], prompt=FIG.format(who=who), size="1024x1024",
                                           quality="medium", output_format="png")
                p.write_bytes(base64.b64decode(r.data[0].b64_json))
                return name, "ok"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:160]
        return name, "ERR " + err

    with ThreadPoolExecutor(4) as ex:
        for name, st in ex.map(one, PEOPLE.items()):
            print("done", name, st, flush=True)


if __name__ == "__main__":
    main()
