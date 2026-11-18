"""make.py 가 서버(포트)마다 쓴 자리 정보 people-moves.{포트}.json 을 people-moves.json 에 합친다 (2026-11-09).
렌더 도중에도 돌려도 된다: 끝난 인물만 바뀐다. 그림띠 파일은 렌더하자마자 바뀌므로 합치기 전에는 장 수 · 비율이 옛 값이라
화면에서 여러 장이 흘러가거나 가로로 늘어나 보인다.  python tools/people-moves/merge.py [--keep]  (--keep 이면 포트 파일을 남긴다)"""
import json
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parents[2] / "src/features/scene"
base = DIR / "people-moves.json"
M = json.loads(base.read_text(encoding="utf-8"))
for part in sorted(DIR.glob("people-moves.*.json")):
    got = json.loads(part.read_text(encoding="utf-8"))
    for pid, moves in got.items():
        M[pid] = moves
    print(part.name, len(got), "명")
    if "--keep" not in sys.argv:
        part.unlink()
base.write_text(json.dumps(dict(sorted(M.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
