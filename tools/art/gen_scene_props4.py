"""장면 물건 4차 (2026-11-11, 사용자 「커튼 뒤 3건도 진행해 유료 괜찮으니까」): 「커튼 뒤에 숨었어요」인데 숨을 그림이 없어 주인공이 그냥 사라졌다.
방법은 gen_scene_props.py 그대로(같은 참고 그림 · 지시문, gpt-image-2 medium 장당 약 5센트, 이미 있는 파일은 건너뜀).

    python gen_scene_props4.py          # 생성
    python gen_scene_props4.py cut      # 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    # 아이가 뒤에 숨을 만큼 크고 바닥까지 닿는, 닫힌 커튼 한 쌍 (색이 있어야 흰 바탕 오리기에서 구멍이 안 난다)
    "curtain": "a pair of long soft yellow fabric curtains hanging closed from a wooden curtain rod, reaching all the way down to the floor, gentle folds, front view, flat bottom",
}
base.SOLID = set()

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
