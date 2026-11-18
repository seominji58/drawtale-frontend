"""세부 장소 2차 (2026-11-11, 사용자 「가게 안 장면 새로 만들기」): 「빵집 안 밀가루 포대 뒤에 숨었어요 · 빵집 안의 어른에게 달려갔어요」가
바깥 시장 거리(밤이면 달 · 별)였다. 빵집 · 꽃집 · 문구점 안을 장면 하나로. 방법은 gen_places.py 그대로(같은 참고 그림 · 지시문,
gpt-image-2 medium 장당 약 5센트, 이미 있는 파일은 건너뜀). 다음 process_places2.py

    python gen_places2.py
"""

import gen_places as base

base.SUBS = {
    "town-shop": (True, "inside a small cozy neighborhood shop like a little bakery, with warm peach walls and a light wooden floor",
                  {"counter": "a small wooden shop counter with a little bell and a basket of bread rolls on top (no signs, no letters), front view, flat bottom",
                   "shelf": "a wide wooden shelf with baskets of bread loaves and a few small flower pots (no signs, no letters, no price tags), front view, flat bottom"}),
}

if __name__ == "__main__":
    base.main()
