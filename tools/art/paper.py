"""조명만 걷어 내는 보정 (2026-11-03). 종이색을 그림 바깥의 빈 종이에서 잰다 — 아이가 칠한 색은 종이 대비 그대로.
- 색종이처럼 종이 자체에 색이 있으면(채도 큼) 색은 두고 밝기만 맞춘다
- 너무 어둡게 찍힌 사진도 2배 넘게 밝히지 않는다"""
from pathlib import Path

import numpy as np
from PIL import Image

AD = str(Path(__file__).resolve().parents[3] / "AnimatedDrawings" / "examples" / "characters")


def paper_of(name):
    t = np.asarray(Image.open(f"{AD}/{name}/texture.png").convert("RGB")).astype(np.float32)
    m = np.asarray(Image.open(f"{AD}/{name}/mask.png").convert("L").resize((t.shape[1], t.shape[0]))) > 128
    return t, m, np.median(t[~m], axis=0)


def correct(name, inside=False):
    t, m, paper = paper_of(name)
    if inside:   # 비교용: 지금까지 쓴 안쪽 상위 10% 방식
        ins = t[m]; lum = ins.mean(1); paper = np.median(ins[lum >= np.percentile(lum, 90)], 0)
    chroma = paper.max() - paper.min()
    gain = 255.0 / paper if chroma < 40 else np.full(3, 255.0 / paper.mean())
    gain = np.minimum(gain, 2.0)
    out = np.clip(t * gain, 0, 255)
    a = np.dstack([out, np.where(m, 255, 0)]).astype(np.uint8)
    im = Image.fromarray(a, "RGBA")
    return im.crop(Image.fromarray(np.where(m, 255, 0).astype(np.uint8)).getbbox()), paper.round(), gain.round(2)
