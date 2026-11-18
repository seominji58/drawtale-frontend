"""장면 물건 8차 (2026-11-12, 대본 · 장면 유기 전수 점검 · 사용자 5장 허락): 글에 나오는데 그림이 없던 동물 개구리 · 반딧불이 · 금붕어 어항 · 거북 · 해파리.
방법은 gen_scene_props.py 그대로(gpt-image-2 medium 장당 약 5센트, 이미 있는 파일은 건너뜀).

    python gen_scene_props8.py          # 생성
    python gen_scene_props8.py cut      # 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    "frog": "a small cute green frog sitting on the ground, side view, big round eyes",
    "firefly": "a cute little firefly insect with tiny wings and a softly glowing yellow-green tail, side view",
    "fishbowl": "a small round glass fishbowl with water, two little orange goldfish and a green water plant, standing on a flat surface, front view",
    "turtle": "a small cute sea turtle crawling on the sand, side view",
    "jellyfish": "a small cute translucent pink jellyfish with a round bell and wavy tentacles, front view",
}
base.SOLID = {"fishbowl", "jellyfish"}

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
