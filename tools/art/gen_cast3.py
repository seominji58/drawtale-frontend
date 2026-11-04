"""대본 검사로 모자란 인물 5장 (2026-11-04, 사용자 「세 가지 다 진행」) — 우주 이야기 아이 친구 우주복 남녀,
우주 경찰관 남녀, 이모. gen_cast2.py 와 같은 참고 그림(cast) · 지시문(FIG), gpt-image-2 medium."""
import base64
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gen_all as G  # noqa: E402
from gen_cast2 import FIG  # noqa: E402

PEOPLE = {
    "spacekid-m": "a little boy about six years old (child height and proportions, not an adult) in a puffy white kid spacesuit with light blue stripes, holding a small round space helmet under one arm, short black hair",
    "spacekid-f": "a little girl about six years old (child height and proportions, not an adult) in a puffy light blue kid spacesuit with white stripes, holding a small round space helmet under one arm, short curly black hair",
    "spacepolice-m": "a friendly man space police officer in a navy blue spacesuit with a gold star badge on the chest, wearing a round clear bubble space helmet so his kind face shows, short black hair",
    "spacepolice-f": "a friendly woman space police officer in a navy blue spacesuit with a gold star badge on the chest, wearing a round clear bubble space helmet so her kind face shows, short black hair",
    "aunt": "a friendly young woman (a child's aunt) with a long brown ponytail, a mint green cardigan over a white t-shirt, blue jeans, sneakers",
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
                with open(G.CAST_REF, "rb") as f:
                    r = client.images.edit(model="gpt-image-2", image=[f], prompt=FIG.format(who=who), size="1024x1024",
                                           quality="medium", output_format="png")
                p.write_bytes(base64.b64decode(r.data[0].b64_json))
                return name, "ok"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:160]
        return name, "ERR " + err

    with ThreadPoolExecutor(3) as ex:
        for name, st in ex.map(one, PEOPLE.items()):
            print("done", name, st, flush=True)


if __name__ == "__main__":
    main()
