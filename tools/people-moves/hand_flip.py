"""인사 그림띠용: 흔드는 손을 아래팔 축으로 미리 거울 뒤집기 (2026-11-09).

렌더는 아래팔을 돌리기만 한다. 늘어뜨린 손(엄지가 몸 쪽)을 135° 돌려 올리면 엄지가 바깥으로 가 손이 뒤집히고 손목이
꺾여 보였다 (사용자 「손이 반전된 상태, 꺾여 있어」). 실제로 든 손은 늘어뜨린 손을 거울에 비춘 모양이라, 그림의 손을
아래팔 축(팔꿈치 → 손 관절 선)으로 미리 뒤집어 두면 돌린 결과가 거울 뒤집기가 되어 엄지가 머리 쪽에 온다.
멈춘 그림 · 걷기는 원래 그림 그대로 (인사만 이 그림으로 분석하고, 관절은 원래 그림 것을 쓴다)."""
import numpy as np
from PIL import Image
from scipy import ndimage

BACK = 0.2      # 손 관절보다 아래팔 쪽으로 이만큼(아래팔 길이 대비) 더 뒤집는다: 관절이 손바닥 가운데에 잡히기도 해서
REACH = 0.9     # 손 관절에서 손끝 쪽으로 (아래팔 길이 대비)
HALF = 0.55     # 아래팔 축에서 옆으로 (아래팔 길이 대비)


def flip_hand(im: Image.Image, joints: list[dict], side: str = "left") -> Image.Image:
    a = np.asarray(im.convert("RGBA")).copy()
    J = {j["name"]: np.array([j["x"], j["y"]], float) for j in joints}
    e, h = J[f"{side}_elbow"], J[f"{side}_hand"]
    L = float(np.linalg.norm(h - e)); d = (h - e) / L; n = np.array([-d[1], d[0]])
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    rel = np.stack([xs - h[0], ys - h[1]], -1)
    t, s = rel @ d, rel @ n
    solid = a[..., 3] > 24
    # 축은 관절 선이 아니라 손목 바로 앞 아래팔 화소의 한가운데로 (관절이 팔 가운데서 비켜 잡히면 뒤집은 손이 옆으로 밀려
    # 소매 끝에 홈이 생겼다, 경찰). 아래팔 끝 띠(손 관절에서 팔꿈치 쪽 20~45%)에서 축에 수직인 방향의 가운데를 잰다
    band = solid & (t <= -0.2 * L) & (t >= -0.45 * L) & (np.abs(s) <= HALF * L)
    if band.sum() > 20:
        lab0, _ = ndimage.label(band)
        sizes = np.bincount(lab0.ravel()); sizes[0] = 0
        arm = lab0 == sizes.argmax()
        off = float(np.median(s[arm]))
        h = h + n * off
        rel = np.stack([xs - h[0], ys - h[1]], -1)
        t, s = rel @ d, rel @ n
    box = (t >= -BACK * L) & (t <= REACH * L) & (np.abs(s) <= HALF * L)
    lab, _ = ndimage.label(solid & box)
    hy, hx = int(round(h[1])), int(round(h[0]))
    keep = lab[max(0, hy - 2):hy + 3, max(0, hx - 2):hx + 3]
    ids = [i for i in np.unique(keep) if i]
    if not ids:
        return im
    hand = np.isin(lab, ids)
    # 원래 손 자리를 비우고, 축으로 비춘 자리에 손을 옮긴다 (뒤집은 자리 q 의 원래 화소 = 축으로 비춘 점)
    out = a.copy()
    out[hand] = 0
    src_x = h[0] + d[0] * t - n[0] * s
    src_y = h[1] + d[1] * t - n[1] * s
    sx, sy = np.round(src_x).astype(int), np.round(src_y).astype(int)
    ok = box & (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H)
    ok &= hand[np.clip(sy, 0, H - 1), np.clip(sx, 0, W - 1)]
    out[ok] = a[sy[ok], sx[ok]]
    # 소매 끝(손 관절 근처)에서 뒤집은 손이 덮지 못한 곳은 원래 화소로: 실처럼 가는 빈 줄이 남았다
    seam = hand & ~ok & (t < 0.15 * L) & (out[..., 3] < 128)
    out[seam] = a[seam]
    return Image.fromarray(out)
