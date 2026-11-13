"""카드 그림을 카드 위쪽 칸 비율에 맞춘다 (2026-11-03 사용자 「칸 크기 때문에 좀 잘려」).

칸은 가로 1.55 : 세로 1 (카드 9:10 의 위쪽 58%). 정사각 그림을 꽉 채우면 위아래가 3할 가까이 잘렸다.
그려진 곳(흰 바탕이 아닌 곳)을 찾아 여백을 조금 두고 자르고, 모자라는 쪽은 흰 종이로 이어 붙여 1.55:1 로 —
잘리는 곳 없이 칸에 가장 크게 들어간다. 그림 바탕은 흰색 그대로(그림 내용)."""
import numpy as np
from PIL import Image
import process as P

AR = 1.55
OUT_W = 620

def fit(src, dst):
    im = Image.open(src).convert("RGB"); a = np.asarray(im).astype(int)
    ink = (a < 236).any(axis=2)
    ys, xs = np.nonzero(ink)
    # 흩어진 점(종이 결)에 끌려가지 않게 아주 바깥 0.3% 는 버린다
    y0, y1 = np.percentile(ys, [0.3, 99.7]).astype(int); x0, x1 = np.percentile(xs, [0.3, 99.7]).astype(int)
    h, w = a.shape[:2]; m = int(0.05 * max(x1 - x0, y1 - y0))
    x0, y0, x1, y1 = max(0, x0 - m), max(0, y0 - m), min(w, x1 + m), min(h, y1 + m)
    cw, ch = x1 - x0, y1 - y0
    # 칸 비율로 넓힌다 (가로가 모자라면 가로, 세로가 모자라면 세로) — 그림 밖은 흰색
    if cw / ch < AR: tw, th = int(ch * AR), ch
    else: tw, th = cw, int(cw / AR)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    L, T = cx - tw // 2, cy - th // 2
    canvas = Image.new("RGB", (tw, th), (255, 255, 255))
    canvas.paste(im.crop((max(0, L), max(0, T), min(w, L + tw), min(h, T + th))), (max(0, -L), max(0, -T)))
    canvas = canvas.resize((OUT_W, int(OUT_W / AR)), Image.LANCZOS)
    canvas.save(dst, "WEBP", quality=84, method=6)
    return round((cw * ch) / (w * h), 2)

if __name__ == "__main__":
    for kind, ids in P.CARD_IDS.items():
        for cid in ids:
            fit(P.ALL / f"{kind}-{cid}.png", P.FRONT / "icons" / kind / f"{cid}.webp")
    print("ok")
