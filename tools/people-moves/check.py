"""등장인물 동작 그림띠 검사 (2026-11-09): 렌더한 그림띠가 원래 그림과 비교해 깨졌는지 장마다 잰다.

서민지 님 시험에서 「몸 일부가 투명 · 동작이 이상」이 나왔다. AI 서버 분석은 아이 그림용이라(흰 종이 위 선을 찾고,
칠 안 한 흰 곳은 종이로 지운다) 흰 옷 · 밝은 피부가 빠질 수 있다. 그래서 그림띠마다:
- 구멍: 원래 그림(오린 그림의 불투명 영역) 대비 첫 장 불투명 넓이가 줄었는지, 몸 일부가 투명
- 흰색 잃음: 원래 그림의 흰 · 밝은 부분(옷 · 얼굴)이 첫 장에 얼마나 남았는지
- 떨어진 조각: 장마다 불투명 덩어리가 몸에서 떨어져 나간 수, 팔 · 다리가 찢어짐
- 넓이 흔들림: 장마다 불투명 넓이가 첫 장 대비 얼마나 바뀌는지, 동작 중 몸이 사라졌다 나타남
- 흐물흐물(손 · 발 끝): 두께 2px 이하 얇은 화소 비율과 윤곽 울퉁불퉁함(둘레² ÷ 넓이)이 첫 장보다 얼마나 커지는지 , 
  손끝 · 발끝이 늘어나 실처럼 되거나 녹은 것처럼 휜다 (11/9 사용자)

  python tools/people-moves/check.py [id ...]      → 표 + tools/people-moves/check.json (나쁜 것부터)
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
PROPS = ROOT / "public/scenes/props"
MOVES = ROOT / "public/scenes/people-moves"
META = json.loads((ROOT / "src/features/scene/people-moves.json").read_text(encoding="utf-8"))


def alpha_of(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert("RGBA"))[..., 3] > 24


def frames_of(path: Path, n: int) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    w = sheet.width // n if sheet.width >= sheet.height * 2 else sheet.height  # 가로 한 줄 그림띠
    cell_w = sheet.width // n
    return [sheet.crop((i * cell_w, 0, (i + 1) * cell_w, sheet.height)) for i in range(n)]


def body(a: np.ndarray) -> tuple[int, int]:
    """(가장 큰 덩어리 넓이, 그 밖의 큰 조각 수), 작은 티끌(가장 큰 것의 0.5% 아래)은 세지 않는다"""

    lab, n = ndimage.label(a)
    if not n:
        return 0, 0
    sizes = np.bincount(lab.ravel())[1:]
    big = sizes.max()
    return int(big), int((sizes > big * 0.005).sum() - 1)


def thin_ratio(a: np.ndarray) -> float:
    """불투명 화소 중 가장자리에서 2px 안쪽뿐인(아주 얇은) 화소 비율"""

    if not a.any():
        return 0.0
    dist = ndimage.distance_transform_edt(a)
    return float((dist[a] <= 2).mean())


def rough(a: np.ndarray) -> float:
    """둘레² ÷ (4π 넓이), 1 이면 원, 울퉁불퉁할수록 크다"""

    area = a.sum()
    if not area:
        return 0.0
    edge = a & ~ndimage.binary_erosion(a)
    return float(edge.sum() ** 2 / (4 * np.pi * area))


def light_ratio(im: Image.Image) -> float:
    """불투명 부분 중 밝은(흰 옷 · 얼굴) 화소 비율"""

    a = np.asarray(im.convert("RGBA")).astype(int)
    m = a[..., 3] > 24
    if not m.any():
        return 0.0
    rgb = a[..., :3][m]
    return float(((rgb.min(axis=1) > 215)).mean())


def check(pid: str) -> list[dict]:
    src = Image.open(PROPS / f"{pid}.webp").convert("RGBA")
    sa = alpha_of(src)
    ys, xs = np.nonzero(sa)
    src_h = ys.max() - ys.min() + 1
    src_area = sa.sum() / (src_h ** 2)          # 키로 나눈 넓이 (크기와 상관없이 비교)
    src_light = light_ratio(src)
    out = []
    for move, m in META.get(pid, {}).items():
        path = MOVES / f"{pid}.{move}.webp"
        if not path.exists():
            out.append({"id": pid, "move": move, "missing": True, "score": 9})
            continue
        fr = frames_of(path, m["frames"])
        a0 = alpha_of(fr[0])
        ys0, _ = np.nonzero(a0)
        if not len(ys0):
            out.append({"id": pid, "move": move, "empty": True, "score": 9})
            continue
        h0 = ys0.max() - ys0.min() + 1
        area0 = a0.sum() / (h0 ** 2)
        hole = max(0.0, 1 - area0 / src_area)                     # 첫 장이 원래보다 비었는지
        light_kept = light_ratio(fr[0]) / src_light if src_light > 0.02 else 1.0
        bodies = [body(alpha_of(f)) for f in fr]
        pieces = max(b[1] for b in bodies)                        # 몸에서 떨어진 큰 조각
        alphas = [alpha_of(f) for f in fr]
        areas = np.array([a.sum() for a in alphas], dtype=float)
        swing = float((areas.max() - areas.min()) / max(1.0, areas[0]))
        thin0, rough0 = thin_ratio(alphas[0]), rough(alphas[0])
        thin_up = max(thin_ratio(a) for a in alphas) - thin0                    # 얇은 조각이 늘어난 만큼
        rough_up = max(rough(a) for a in alphas) / max(rough0, 1e-6) - 1         # 윤곽이 거칠어진 만큼
        # 나쁨 점수: 구멍 · 흰색 잃음 · 떨어진 조각 · 넓이 흔들림
        score = (hole * 3 + max(0.0, 1 - light_kept) * 2 + min(pieces, 3) * 0.5 + max(0.0, swing - 0.35)
                 + max(0.0, thin_up - 0.04) * 10 + max(0.0, rough_up - 0.35))
        out.append({"id": pid, "move": move, "hole": round(hole, 2), "light_kept": round(light_kept, 2),
                    "pieces": pieces, "swing": round(swing, 2), "thin_up": round(thin_up, 3),
                    "rough_up": round(rough_up, 2), "score": round(score, 2)})
    return out


def main() -> None:
    ids = sys.argv[1:] or sorted(META)
    rows = [r for pid in ids if (PROPS / f"{pid}.webp").exists() for r in check(pid)]
    rows.sort(key=lambda r: -r["score"])
    (Path(__file__).with_name("check.json")).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [r for r in rows if r["score"] >= 0.6]
    print(f"그림띠 {len(rows)}, 의심 {len(bad)} (점수 0.6 이상)")
    for r in rows[:30]:
        print(f"{r['id']:14s} {r['move']:7s} 점수 {r.get('score')}  구멍 {r.get('hole')}  흰색 남음 {r.get('light_kept')}  "
              f"떨어진 조각 {r.get('pieces')}  넓이 흔들림 {r.get('swing')}  얇음↑ {r.get('thin_up')}  울퉁불퉁↑ {r.get('rough_up')}")


if __name__ == "__main__":
    main()
