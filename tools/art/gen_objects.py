"""대본에 나오는데 그림이 없던 물건 13 (2026-11-03, 사용자 「대본에 들어갔는데 실제로 없는 오브젝트들 찾아서 만들고 넣어놓고」).

카드 이야기 1,024편에서 센 것: 숨는 곳 6(담요 더미 · 텐트 · 모래 언덕 · 시소 · 정자 · 구령대 계단),
쪽 글에 자주 나오는 물건 7(손전등 · 랜턴 · 공 · 빵 · 의자 · 반창고 · 풍선). gen_all.py 와 같은 참고 그림 · 같은 OBJ 지시문.
gpt-image-2 medium, 이미 있는 파일은 건너뛴다. 오리기는 process_objects.py.
"""

import base64
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gen_all as G  # noqa: E402

OBJECTS = {
    # 숨는 곳 (주인공 앞에 선다 — 아이 키를 가릴 만큼)
    "blanket": "a big soft rumpled pile of cozy blankets and a quilt, low mound shape, flat bottom",
    "tent": "a small friendly camping tent with the door flap open, front view, flat bottom",
    "dune": "a small smooth sand dune mound with a few tufts of beach grass, flat bottom",
    "seesaw": "a playground seesaw on a sturdy center post, side view, flat bottom",
    "pavilion": "a small traditional Korean wooden park pavilion (jeongja) with a tiled roof and four posts, front view, flat bottom",
    "podium": "a small school outdoor stage platform with a few front steps, front view, flat bottom",
    # 쪽 글에 나오는 물건 (주인공 옆 땅에 놓인다)
    "flashlight": "a cute flashlight switched on with a soft warm glow at its front, lying slightly tilted, flat bottom",
    "lantern": "an old-fashioned camping lantern glowing warmly, front view, flat bottom",
    "ball": "a colorful striped play ball, flat bottom",
    "bread": "a small basket of fresh round bread rolls, front view, flat bottom",
    "chair": "a small wooden chair for a child, three-quarter view, flat bottom",
    "bandage": "two cute adhesive bandages crossed in an X, flat",
    "balloons": "a bunch of three colorful balloons with strings hanging down",
}


def main() -> None:
    client = G.OpenAI(api_key=G.KEY, timeout=300)

    def edit(name: str, what: str):
        p = G.OUT / f"obj-{name}.png"
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


if __name__ == "__main__":
    main()
