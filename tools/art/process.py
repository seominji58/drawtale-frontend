"""생성한 그림 → 프론트 public 에 넣을 모양으로 (2026-11-03).

- 물건 · 소품 · 카드 · 삽화: 흰 바탕 오리기(가장자리 + 둘러싸인 큰 구멍) → WebP
- 배경판: WebP 1536×1024
- 장소마다 좌표 표 public/scenes/{place}/layout.json (x 가운데, foot 발끝 또는 top 윗변, h 화면 높이 대비 — 0~1)
- 장소 카드: 배경판 + 물건을 좌표 표대로 쌓아 정사각으로
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
ALL = HERE / "all"
B = HERE / "b-crayon"
FRONT = Path(__file__).resolve().parents[2] / "public"
WORK = HERE / "cut"
sys.path.insert(0, str(HERE))
from compose import cut  # noqa: E402  (가장자리 + 큰 구멍 오리기)

HERO = {"x": 0.52, "foot": 0.93, "h": 0.52}
PROPS = {   # 기본 소품 자리 (장소 공통). cover 는 주인공 앞(layer front)
    "friend": {"src": "../props/friend.webp", "x": 0.75, "foot": 0.93, "h": 0.46},
    "adult": {"src": "../props/adult.webp", "x": 0.27, "foot": 0.93, "h": 0.58},
    "box": {"src": "../props/box.webp", "x": 0.52, "foot": 0.96, "h": 0.36, "layer": "front"},
    "bush": {"src": "../props/bush.webp", "x": 0.52, "foot": 0.96, "h": 0.38, "layer": "front"},
    "sign": {"src": "../props/sign.webp", "x": 0.87, "foot": 0.92, "h": 0.40},
    "sun": {"src": "../props/sun.webp", "x": 0.85, "top": 0.04, "h": 0.24},
}
# 장소별 뒤 물건. src 는 그 장소 폴더 기준 상대 경로
PLACES = {
    "playground": [("swing", 0.17, "foot", 0.66, 0.38), ("slide", 0.80, "foot", 0.67, 0.42), ("tree", 0.40, "foot", 0.62, 0.44)],
    "home": [("house", 0.24, "foot", 0.64, 0.48), ("fence", 0.68, "foot", 0.66, 0.14), ("../playground/tree", 0.90, "foot", 0.63, 0.42)],
    "school": [("building", 0.70, "foot", 0.64, 0.50), ("bars", 0.18, "foot", 0.67, 0.26), ("../playground/tree", 0.40, "foot", 0.62, 0.38)],
    "town": [("houses", 0.24, "foot", 0.63, 0.40), ("lamp", 0.78, "foot", 0.67, 0.46), ("../playground/tree", 0.95, "foot", 0.62, 0.36)],
    "forest": [("pine", 0.13, "foot", 0.66, 0.62), ("pine", 0.86, "foot", 0.64, 0.55), ("mushroom", 0.64, "foot", 0.71, 0.10), ("../props/bush", 0.33, "foot", 0.66, 0.18)],
    "sea": [("parasol", 0.22, "foot", 0.71, 0.40), ("castle", 0.76, "foot", 0.73, 0.18), ("rock", 0.92, "foot", 0.69, 0.12)],
    "space": [("planet", 0.80, "top", 0.08, 0.22), ("rocket", 0.20, "foot", 0.67, 0.42), ("rock", 0.66, "foot", 0.69, 0.12)],
    "cave": [("stalactite", 0.30, "top", 0.0, 0.26), ("rocks", 0.83, "foot", 0.69, 0.16), ("crystal", 0.14, "foot", 0.71, 0.16)],
}
SRC_OBJ = {   # 장소 폴더 안 이름 → 생성 파일
    ("playground", "swing"): B / "swing.png", ("playground", "slide"): B / "slide.png", ("playground", "tree"): B / "tree.png",
    ("home", "house"): ALL / "home-house.png", ("home", "fence"): ALL / "home-fence.png",
    ("school", "building"): ALL / "school-building.png", ("school", "bars"): ALL / "school-bars.png",
    ("town", "houses"): ALL / "town-houses.png", ("town", "lamp"): ALL / "town-lamp.png",
    ("forest", "pine"): ALL / "forest-pine.png", ("forest", "mushroom"): ALL / "forest-mushroom.png",
    ("sea", "parasol"): ALL / "sea-parasol.png", ("sea", "castle"): ALL / "sea-castle.png", ("sea", "rock"): ALL / "sea-rock.png",
    ("space", "planet"): ALL / "space-planet.png", ("space", "rocket"): ALL / "space-rocket.png", ("space", "rock"): ALL / "space-rock.png",
    ("cave", "stalactite"): ALL / "cave-stalactite.png", ("cave", "rocks"): ALL / "cave-rocks.png", ("cave", "crystal"): ALL / "cave-crystal.png",
}
PROP_SRC = {"friend": "prop-friend", "adult": "prop-adult", "box": "prop-box", "bush": "prop-bush", "sign": "prop-sign", "sun": "prop-sun"}
PLATE_SRC = {"playground": B / "plate.png", **{p: ALL / f"plate-{p}.png" for p in PLACES if p != "playground"}}
# 카드 id (choices.ts) → 생성 파일
CARD_IDS = {
    "problem": ["fall", "crying", "lost", "dark"],
    "action": ["fall_run", "call_adult", "walk_again", "fall_rest", "help_friend", "wave_smile", "run_adult", "wait_beside",
               "stay_wait", "ask_adult", "look_walk", "run_sign", "hide", "run_light", "tiptoe", "still_wait"],
    "result": ["okay", "smile", "got_there", "new_friend", "tears_stop", "thanked", "best_friend", "party_friend",
               "found_way", "adult_took", "relief", "party_lost", "sun", "brave", "sleep", "back_safe"],
}


def webp(src: Path, dst: Path, max_side: int, q: int = 82) -> Image.Image:
    im = Image.open(src)
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=q, method=6)
    return im


def cut_to(src: Path, dst: Path, max_side: int) -> Image.Image:
    WORK.mkdir(exist_ok=True)
    tmp = WORK / (src.stem + ".cut.png")
    if not tmp.exists():
        cut(src, tmp)
    return webp(tmp, dst, max_side)


def put(base: Image.Image, im: Image.Image, x: float, anchor: str, y: float, h: float, xs=None) -> None:
    W, H = base.size
    th = round(h * H); tw = round(im.width * th / im.height)
    im = im.resize((tw, th), Image.LANCZOS)
    left = round((xs if xs is not None else x) * W - tw / 2)
    top = round(y * H) if anchor == "top" else round(y * H - th)
    base.alpha_composite(im, (left, top))


def card(place, objs, d) -> None:
    """장소 카드: 배경판에서 위 · 가운데 정사각(높이 78%)을 잘라 물건을 가운데로 모으고 0.8 배로 얹는다 —
    가장자리 물건이 잘리지 않고 빈 땅이 덜 보이게 (장면과 같은 그림 · 같은 좌표 표를 쓰되 카드만 구도를 줄인다)"""
    plate = Image.open(PLATE_SRC[place]).convert("RGBA").resize((1536, 1024))
    side, top = 798, 61
    sq = plate.crop(((1536 - side) // 2, top, (1536 + side) // 2, top + side))
    # 카드에는 나무를 넣지 않는다: 집 · 놀이터 · 학교 · 마을 카드에 같은 나무가 찍혀 있었다 (2026-11-12 사용자). 남은 물건은 가운데로
    base = sq; sq = Image.new("RGBA", base.size, (0, 0, 0, 0))
    for oid, x, a, y, h in objs:
        if oid.endswith("tree"):
            continue
        im = Image.open((d / f"{oid}.webp").resolve()).convert("RGBA")
        th = round(h * 1024 * 0.8); tw = round(im.width * th / im.height)
        if tw > side * 0.6:   # 넓은 건물이 카드 밖으로 나가지 않게
            th = round(th * side * 0.6 / tw); tw = round(side * 0.6)
        im = im.resize((tw, th), Image.LANCZOS)
        cx = (0.5 + (x - 0.5) * 0.62) * side
        py = y * 1024 - top
        sq.alpha_composite(im, (round(cx - tw / 2), round(py) if a == "top" else round(py - th)))
    x0, _, x1, _ = sq.getbbox(); dx = round(side / 2 - (x0 + x1) / 2) if any(o[0].endswith("tree") for o in objs) else 0
    moved = Image.new("RGBA", sq.size, (0, 0, 0, 0)); moved.alpha_composite(sq, (max(0, dx), 0), (max(0, -dx), 0, sq.width, sq.height))
    base.alpha_composite(moved)
    base.resize((512, 512), Image.LANCZOS).save(FRONT / "icons" / "place" / f"{place}.webp", "WEBP", quality=82, method=6)


def main() -> None:
    scenes = FRONT / "scenes"
    if scenes.exists():
        shutil.rmtree(scenes)
    # 소품
    for pid, name in PROP_SRC.items():
        cut_to(ALL / f"{name}.png", scenes / "props" / f"{pid}.webp", 700)
    # 장소
    for place, objs in PLACES.items():
        d = scenes / place
        webp(PLATE_SRC[place], d / "plate.webp", 1536, 80)
        for oid, *_ in objs:
            if not oid.startswith("../") and not (d / f"{oid}.webp").exists():
                cut_to(SRC_OBJ[(place, oid)], d / f"{oid}.webp", 700)
    for place, objs in PLACES.items():
        d = scenes / place
        layout = {"place": place, "size": [1536, 1024], "plate": "plate.webp", "hero": HERO,
                  "objects": [{"src": f"{oid}.webp", "x": x, a: y, "h": h, "layer": "back"} for oid, x, a, y, h in objs],
                  "props": PROPS}
        (d / "layout.json").write_text(json.dumps(layout, ensure_ascii=False, indent=1), encoding="utf-8")
        # 장소 카드: 배경판 가운데를 정사각으로 자르고 물건은 가로로 모아 얹는다
        card(place, objs, d)
        (FRONT / "icons" / "place").mkdir(parents=True, exist_ok=True)
        sq.save(FRONT / "icons" / "place" / f"{place}.webp", "WEBP", quality=82, method=6)
    # 카드
    for kind, ids in CARD_IDS.items():
        for cid in ids:
            cut_to(ALL / f"{kind}-{cid}.png", FRONT / "icons" / kind / f"{cid}.webp", 512)
    # 삽화
    for n in ("paper", "pencil", "puzzled", "party"):
        cut_to(ALL / f"illust-{n}.png", FRONT / "illust" / f"{n}.webp", 700)
    # S-02 예시 — 종이에 그린 그림 그대로 (오리지 않음)
    for n in ("one", "white", "spread", "many", "biped", "quad"):
        webp(ALL / f"s02-{n}.png", FRONT / "guide" / f"{n}.webp", 480)
    print("ok")


if __name__ == "__main__":
    main()
