"""세부 장소 2차 가공 (2026-11-11, gen_places2.py 다음): 가게 안 → public/scenes/town-shop/ (배경판 · 물건 오리기 · layout.json).

    python process_places2.py
"""

import process_places as base

base.SUBS = {
    # 계산대는 왼쪽, 빵 선반은 오른쪽 (주인공은 가운데 · 오른쪽 2/3 자리에 서므로 선반이 사람 뒤에 오도록 조금 낮게)
    "town-shop": [("counter", 0.22, "foot", 0.68, 0.32), ("shelf", 0.80, "foot", 0.64, 0.34)],
}

if __name__ == "__main__":
    base.main()
