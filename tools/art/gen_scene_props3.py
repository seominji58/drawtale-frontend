"""장면 물건 3차 (2026-11-10, 사용자 「1,2,3번 다 진행」 · 그루터기 1장 허락, 솔방울 1장은 「남은 것들 고쳐」): 「폭신한 그루터기가 눈에 보였어요」 → 「그루터기에 앉아」인데
그림이 없어 장면에 아무것도 없었다. 방법은 gen_scene_props.py 그대로(같은 참고 그림 · 지시문, gpt-image-2 medium 장당 약 5센트,
이미 있는 파일은 건너뜀).

    python gen_scene_props3.py          # 생성
    python gen_scene_props3.py cut      # 오리기 → public/scenes/props/{이름}.webp + props-ar.json
"""

import sys

import gen_scene_props as base

base.OBJECTS = {
    # 솔방울 (11/10): 저장 카드 이야기 64쪽에 나오는데 도토리 그림으로 대신했다
    "pinecone": "a single brown pine cone with layered scales, side view, flat bottom",
    # 앉을 수 있게 윗면이 평평하고 낮은 것 (아이 무릎 높이)
    "stump": "a short wide tree stump with a flat cut top showing tree rings, a little green moss on the side, small roots at the bottom, side view, flat bottom",
}
base.SOLID = set()

if __name__ == "__main__":
    base.ALL.mkdir(exist_ok=True)
    base.cut_all() if sys.argv[1:] == ["cut"] else base.generate()
