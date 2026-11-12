"""장면 물건 9차 (2026-11-12, 사람 아닌 형태 전수 점검 · 사용자 2장 허락): 날개형 이야기 대본 인물로 나오는데 그림이 없던 무당벌레 · 달팽이.
방법은 gen_scene_props.py 그대로(gpt-image-2 medium 장당 약 5센트, 이미 있는 파일은 건너뜀).

    python gen_scene_props9.py          # 생성
    python gen_scene_props9.py cut      # 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    "ladybug": "a small cute red ladybug with black spots and tiny antennae, side view, on the ground",
    "snail": "a small cute snail with a round spiral orange shell and two little eye stalks, side view, on the ground",
}
base.SOLID = set()

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
