"""화면 안내 음성 — 정해진 문장을 이야기 나레이터 목소리로 미리 만든다 (2026-11-03, 95문장).

    python tools/guide-voice/make.py [백엔드 .env 경로]   # 기본 ../drawtale-backend-git/.env

- 문장 목록: tools/guide-voice/lines.json (묶음 → 문장). 화면 문구를 바꾸면 여기도 같은 글자로 고친다
- 결과: public/voice/guide/{sha1 앞 12자}.mp3 + src/features/voice/guide.json (문장 → 파일). 앱의 `speak()` 가 이 표를 본다
- 이미 있는 파일은 건너뛰므로 고친 · 새 문장만 돈이 든다 (eleven_v4_turbo 1자 ≈ 0.5크레딧)
- 「천천히」 판은 만들지 않는다: eleven_v4_turbo 는 voice_settings.speed 를 무시한다(0.72 로 95문장을 만들었더니 길이가 같았다, 11/3).
  앱이 0.9배로 늘려 튼다 (`lib.ts` `fileRate`)
- 키 · 목소리 id 는 백엔드 .env 에서 읽기만 하고 찍지 않는다. 프론트에는 mp3 만 들어간다
"""

import hashlib
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
ENV = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "drawtale-backend-git" / ".env"
LINES = Path(__file__).with_name("lines.json")
OUT = ROOT / "public" / "voice" / "guide"
TABLE = ROOT / "src" / "features" / "voice" / "guide.json"


def env(name: str) -> str:
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


KEY, VOICE = env("ELEVENLABS_API_KEY"), env("ELEVENLABS_VOICE_ID")
MODEL = env("ELEVENLABS_MODEL_ID") or "eleven_v4_turbo"


def make(text: str) -> tuple[str, str, int]:
    path = OUT / f"{hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]}.mp3"
    if path.exists() and path.stat().st_size > 1000:
        return text, path.name, 0
    for attempt in range(4):
        r = httpx.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}",
            params={"output_format": "mp3_44100_64"},
            headers={"xi-api-key": KEY, "accept": "audio/mpeg"},
            # 이야기 나레이터와 같은 설정 (백엔드 app/services/tts.py ElevenLabsSpeech)
            json={"text": text, "model_id": MODEL, "voice_settings": {"stability": 0.6, "similarity_boost": 0.75, "speed": 0.9}},
            timeout=60,
        )
        if r.status_code == 429:   # Starter 는 동시 요청 한도가 낮다
            time.sleep(2 + attempt * 2)
            continue
        r.raise_for_status()
        path.write_bytes(r.content)
        return text, path.name, len(text)
    raise RuntimeError(f"429 계속: {text}")


def main() -> None:
    if not (KEY and VOICE):
        sys.exit(f"{ENV} 에 ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID 가 없다")
    OUT.mkdir(parents=True, exist_ok=True)
    texts = [t for items in json.loads(LINES.read_text(encoding="utf-8")).values() for t in items]
    with ThreadPoolExecutor(2) as ex:
        results = list(ex.map(make, texts))
    table = {t: f for t, f, _ in results}
    TABLE.write_text(json.dumps(table, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    # 목록에서 빠진 문장의 파일은 지운다
    stale = [p for p in OUT.glob("*.mp3") if p.name not in table.values()]
    for p in stale:
        p.unlink()
    print(f"문장 {len(table)}, 새로 만든 것 {sum(1 for *_, n in results if n)}, 보낸 글자 {sum(n for *_, n in results)}, 지운 파일 {len(stale)}")


if __name__ == "__main__":
    main()
