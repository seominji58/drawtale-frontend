"""장면 물건 5차 (2026-11-11, 사용자 994번 「터널이라는데 내용도 이상하고」 · 그림 4장 허락): 글에 나오는데 그림이 없던 놀이터 구름다리 ·
놀이터 터널 · 안내소 · 놀이터 정문. 방법은 gen_scene_props.py 그대로(gpt-image-2 medium 장당 약 5센트, 이미 있는 파일은 건너뜀).
구름다리는 저장 이야기에서 「매달려 · 쇠막대 · 한 칸씩 · 높이 걸려」가 대부분이라 매달리는 사다리형.

    python gen_scene_props5.py          # 생성
    python gen_scene_props5.py cut      # 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    "monkeybars": "a children's playground monkey bars climbing frame: a horizontal metal ladder held up high by two colorful posts at each end, with a little ladder to climb up on one side, side view, standing on the ground",
    "tunnel": "a children's playground crawl tunnel: a short colorful plastic tube tunnel lying on the ground, round openings at both ends, side view, a child could crawl through it",
    "booth": "a small friendly information booth kiosk: a tiny wooden hut with a window counter, a little roof and a round sign with a letter i, front view, standing on the ground",
    "parkgate": "a children's playground entrance gate: two colorful posts with an arched sign board on top and a small open fence gate between them, front view, standing on the ground",
}
base.SOLID = set()

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
