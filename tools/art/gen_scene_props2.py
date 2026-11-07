"""장면 물건 2차 (2026-11-06, 사용자 「물건 채우기」 · 14장 허락) — 카드 이야기 512편에서 글에 나오는데 그림이 없던 손에 드는 물건.
시계는 이미 그림(clock.webp)이 있고 실내 벽에 연결돼 있어 빼고 13장 + 우주 장갑 1장. 방법은 gen_scene_props.py 그대로(같은 참고 그림 · 지시문,
gpt-image-2 medium 장당 약 5센트, 이미 있는 파일은 건너뜀). 1차 12장을 다시 만들지 않게 목록만 바꿔 부른다.

    python gen_scene_props2.py          # 생성
    python gen_scene_props2.py cut      # 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    "boat": "a small wooden rowboat with a little white sail, side view, flat bottom",
    "shootingstar": "a bright yellow shooting star with a soft sparkly tail, flying diagonally",
    "helmet": "a round white kid's space helmet with a clear blue visor, flat bottom",
    "apple": "a single shiny red apple with a green leaf, flat bottom",
    "tray": "a school lunch tray with compartments holding rice, soup and side dishes, seen from slightly above, flat",
    "pillow": "a soft pale blue pillow with a small star pattern, flat bottom",
    "wateringcan": "a small green watering can, side view, flat bottom",
    "letter": "a closed envelope with a red heart sticker on it, no writing at all, flat bottom",
    "ribbon": "a big red ribbon bow",
    "mittens": "a pair of knitted kid mittens in red with white stripes, side by side, flat bottom",
    "drum": "a small toy drum with two drumsticks resting on top, flat bottom",
    "conch": "a pink spiral conch seashell, flat bottom",
    "rocket": "a small toy rocket standing upright with fins and a round window, flat bottom",
    # 「장갑」은 5편이 「우주 장갑」이라 털장갑과 따로 (11/6)
    "spacegloves": "a pair of white puffy astronaut gloves with red cuffs, side by side, flat bottom",
}
# 흰 · 옅은 부분이 넓어 안쪽 구멍까지 오려지면 안 되는 것
base.SOLID = {"helmet", "pillow", "letter", "tray", "spacegloves"}

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
