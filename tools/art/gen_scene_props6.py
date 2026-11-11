"""장면 물건 6차 (2026-11-11, 글이 말하는 물건 전수 점검 · 사용자 5장 허락): 글에 나오는데 그림이 없던 정글짐 · 밧줄 · 연못 · 그물 · 방 책상.
방법은 gen_scene_props.py 그대로(gpt-image-2 medium 장당 약 5센트, 이미 있는 파일은 건너뜀).

    python gen_scene_props6.py          # 생성
    python gen_scene_props6.py cut      # 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    "junglegym": "a children's playground jungle gym: a colorful cube-shaped climbing frame made of red, blue and yellow metal bars in a grid, side view, standing on the ground",
    "rope": "a long thick yellow rope loosely coiled on the ground with one end stretching out, side view, lying flat",
    "pond": "a small round pond seen from the side at a low angle, blue water edged with smooth grey stones and a few reeds and a lily pad, flat on the ground",
    "net": "a fishing net with a long wooden handle and a round rim holding a green mesh net, side view",
    "desk": "a small wooden children's study desk with one drawer and a little desk lamp and a book on top, side view, standing on the floor",
}
base.SOLID = {"pond"}

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
