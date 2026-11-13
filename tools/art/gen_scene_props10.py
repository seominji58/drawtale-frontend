"""장면 물건 10차 (2026-11-12, 사용자 「소품 여전히 대본에만 존재하는게 있는데?」 · 11장 허락): 글에 자주 나오는데 그림이 없던 물건.
방법은 gen_scene_props.py 그대로(gpt-image-2 medium 장당 약 5센트, 이미 있는 파일은 건너뜀).

    python gen_scene_props10.py          # 생성
    python gen_scene_props10.py cut      # 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    "stick": "a long thin straight wooden stick, lying diagonally, plain natural wood",
    "marbles": "three small round colorful glass marbles with swirls inside, on the ground",
    "toycar": "a small cute red toy car with round black wheels, side view, on the floor",
    "fan": "a round traditional Korean hand fan with a short wooden handle, front view",
    "necklace": "a colorful seashell necklace on a string, laid flat in a loose circle",
    "xylophone": "a small children's rainbow xylophone with two mallets, front view at a slight angle",
    "jumprope": "a children's jump rope with two red handles, loosely coiled on the ground",
    "scooter": "a children's yellow kick scooter standing upright, side view",
    "crown": "a paper crown made of yellow paper with colored dots, front view",
    "toyplane": "a small toy airplane made of colorful building blocks, side view",
    "top": "a small wooden spinning top made from an acorn with a little stick on top, side view",
}
base.SOLID = {"marbles", "toycar", "fan", "crown", "toyplane", "top", "scooter", "xylophone"}

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
