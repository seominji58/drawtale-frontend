"""장면 물건 7차 (2026-11-11, 사용자 「난간도 그려서 넣어줘」): 숲 나무 다리 · 방파제 길 · 동굴 길의 「난간을 잡고 걸었어요」(저장 이야기 38문장)에
그림이 없었다. 어디에나 맞게 낮은 나무 난간 한 칸. 방법은 gen_scene_props.py 그대로(gpt-image-2 medium 약 5센트).

    python gen_scene_props7.py          # 생성
    python gen_scene_props7.py cut      # 오리기 → public/scenes/props/railing.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    "railing": "a long low wooden railing section: a smooth rounded top handrail resting on four sturdy wooden posts with one middle rail, plain natural wood, side view, standing on the ground, wider than tall",
}
base.SOLID = set()

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
