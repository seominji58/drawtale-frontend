# AnimatedDrawings 로컬 실행 — 진행 상황과 다음 단계

**이어서 작업하는 에이전트는 이 파일의 「지금 상태」부터 읽는다.**
기준일 2026-09-29.

---

## 지금 상태

| 단계 | 상태 |
|---|---|
| 프론트 코드를 git 저장소(`drawtale-frontend`)로 옮김 | **끝** — 로컬 커밋만, push 안 함 |
| AnimatedDrawings 저장소 받기 | **끝** — `hankan-story/AnimatedDrawings/` (커밋 `b859684`) |
| ① WSL2 설치 (`wsl --install`) | **끝** — Ubuntu 첫 실행까지 함 |
| ② Docker Desktop 설치 (`winget install -e --id Docker.DockerDesktop`) | **사용자가 진행 중** → 설치 후 재시작 |
| ③ `docker run --rm hello-world` 확인 | 남음 |
| ④ TorchServe 이미지 빌드·실행 | 남음 (에이전트가 할 일) |
| ⑤ 어댑터 서버 만들기 | 남음 (에이전트가 할 일) |
| ⑥ 실제 모델로 S-01~S-11 전 구간 | 남음 |

**재시작 후 첫 할 일**: 사용자가 Docker Desktop을 띄워 「Engine running」을 확인했는지
묻고, `docker run --rm hello-world`로 확인한 다음 ④로 간다.

---

## 폴더 배치

```
Desktop/hankan-story/
├─ .claude/            Claude Code 설정 (git 밖, 건드리지 않는다)
├─ drawtale-frontend/  ← 이 저장소. github.com/seominji58/drawtale-frontend
└─ AnimatedDrawings/   ← github.com/facebookresearch/AnimatedDrawings (수정하지 않는 원본)
```

AnimatedDrawings는 프론트 저장소에 넣지 않는다. 나중에 서버로 옮기므로 옆 폴더에 둔다.

---

## 왜 이렇게 돌리나

- **이 PC 환경**: Windows 11, Intel Core Ultra 7 355, RAM 31.5GB, **NVIDIA GPU 없음**,
  conda 없음. Python은 3.14·3.10·3.9가 있다.
- **프론트는 캐릭터를 브라우저에서 그린다** (`CharacterCanvas`). 그래서 로컬 테스트에
  필요한 것은 **관절 추정(TorchServe)뿐**이다. AnimatedDrawings의 렌더 쪽
  (파이썬 3.8, OpenGL, `USE_MESA`)은 필요 없다. 서버 렌더 여부는
  `open-decisions.md` 5번에서 따로 정한다.
- **Docker(A안)를 고른 이유**: 공식 `torchserve/Dockerfile`이 그대로 돌고,
  나중에 서버로 옮길 때도 같은 이미지를 쓴다. Windows에 직접 `mmcv-full`을
  설치하는 B안은 빌드 실패가 잦아 버렸다.
- GPU가 없어도 CPU로 돈다. 그림 한 장에 수 초 수준으로 예상한다 (**아직 실측 안 함**).

---

## ④ TorchServe 이미지 빌드·실행

```bash
cd ../AnimatedDrawings/torchserve
docker build -t docker_torchserve .      # 처음엔 20~40분 (torch, mmcv 다운로드)
docker run -d --name docker_torchserve -p 8080:8080 -p 8081:8081 docker_torchserve
curl http://127.0.0.1:8080/ping          # {"status": "Healthy"} 가 나오면 됨
```

모델 두 개가 올라오는 데 시작 후 1~2분 걸린다. 그 전에는 ping이 `Unhealthy`일 수 있다.

**미리 알고 있는 위험**

- Dockerfile이 `xtcocoapi`를 **버전 고정 없이** `git clone` 한다. 빌드가 여기서 깨지면
  특정 커밋으로 고정해서 해결한다. 원본 저장소를 고치지 말고, 고친 Dockerfile은
  이 저장소 쪽(예: `tools/animated-drawings/`)에 둔다.
- Windows git이 `core.autocrlf=true`라 Dockerfile·`config.properties`가 CRLF로
  받아졌다. 빌드에서 문제가 나면 줄바꿈부터 의심한다.
- Docker Desktop이 WSL2 메모리를 부족하게 잡으면 모델 로딩이 실패한다.
  공식 README는 16GB를 권한다. 필요하면 `%UserProfile%\.wslconfig`에 `memory=16GB`.

---

## ⑤ 어댑터 서버 — 할 일

`tools/stub-server/stub.py`는 계약서대로 가짜 응답을 준다. **분석(`POST /api/characters`)
부분만 실제 TorchServe 호출로 바꾼 어댑터**를 만든다. 나머지(이야기·steps·activity)는
스텁 그대로 둔다. 그러면 프론트는 거의 건드리지 않고 실제 모델로 테스트할 수 있다.

TorchServe 호출 방식은 `AnimatedDrawings/examples/image_to_annotations.py`를 따른다.

1. 긴 변이 1000px을 넘으면 1000px로 줄인다
2. `POST http://127.0.0.1:8080/predictions/drawn_humanoid_detector` (`files={"data": jpg}`)
   → `bbox` 목록. 점수 가장 높은 것 하나를 쓴다
3. `bbox`로 잘라낸 그림을
   `POST http://127.0.0.1:8080/predictions/drawn_humanoid_pose_estimator`로 보낸다
   → COCO 17점 `keypoints` (잘라낸 영역 기준 픽셀)
4. COCO 17점 → 우리 관절 이름으로 매핑 (위 파일 122~137행과 같은 방식.
   `neck`=코(0), `torso`=어깨 중점, `hip`=골반 중점)

어댑터에서 **반드시 정해야 하는 것** (근거는 `open-decisions.md`):

| 항목 | 문제 | 어댑터에서 임시로 할 일 |
|---|---|---|
| 관절 수 (1번) | 모델은 `head`를 내지 않는다. 프론트 `skeleton.ts`는 `head`가 필요하다 | **B안**: `torso → neck` 방향으로 연장해 `head`를 합성하고 16개로 보낸다 |
| 좌표 기준 (2번, backlog b) | 모델 좌표는 **잘라낸 영역 기준**인데 프론트는 **원본 그림** 위에 편다 | **나안**: 어댑터가 crop → 원본 기준 0~1로 되돌려 보낸다 (프론트 무수정). 가안(`croppedImageUrl`)은 팀 합의 후 |
| 신뢰도 | `confidence`와 관절별 `score` | 포즈 모델의 관절 점수를 `score`로, 검출 점수를 `confidence`로 |
| 실패 | 사람 0명·2명 이상 검출 | 계약서 오류 코드로 매핑 (`api-contract.md` 오류 절) |

임시로 정한 것은 `open-decisions.md` 1·2번에 「로컬 어댑터는 이렇게 했다」고 적는다.
팀 합의가 나면 어댑터를 거기 맞춘다.

---

## 코드에 남아 있는 알려진 문제

`backlog.md` P0-0 표가 원본이다. 실제 모델을 붙이면 직접 드러나는 것은 **b**다.

| # | 내용 | 급한가 |
|---|---|---|
| b | 잘라낸 그림을 줄 자리가 계약에 없다 | 그렇다 |
| g | `patchKeypoints`를 부르는 곳이 없다 (`S06Joints.tsx` 40행) | 그렇다 |
| h | `audioUrl`을 읽는 코드가 없다 (팀 결정 필요, `open-decisions.md` 14번) | 그렇다 |
| i | 개발 모드에서 POST가 두 번 나간다 (StrictMode) | 보통 |
| j | `shrink()`가 작은 그림은 원본 그대로 보낸다 | 보통 |
| c·d·e·f | 인증 계약 누락, S-08 진행 멈춤, SSE 재연결 없음, 토큰 미전송 | 보통~낮음 |

## 주의

- `.env`가 **`VITE_ENGINE=finetuned`** 로 되어 있다 (git에 안 올라감).
  8000번 서버 없이 `npm run dev` 하면 S-04에서 멈춘다. 목으로 보려면 `mock`으로.
- 로컬 커밋만 있고 **push는 하지 않았다.** push 전에 사용자에게 묻는다.
  커밋 작성자는 전역 git 설정의 이메일로 찍혔다.
