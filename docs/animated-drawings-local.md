# 실제 모델로 로컬 실행 — 진행 상황과 다음 단계

**이어서 작업하는 에이전트는 이 파일의 「지금 상태」부터 읽는다.**
기준일 2026-09-29.

---

## 지금 상태

| 단계 | 상태 |
|---|---|
| WSL2 · Docker Desktop 설치 | **끝** |
| Meta AnimatedDrawings TorchServe 이미지 | **끝** — 직접 빌드했다가 팀원 `drawtale-ai` 것으로 갈아탔다 (아래) |
| 팀원 AI 서버(`drawtale-ai` dev) 띄우기 | **끝** — `docker compose up -d`, 8001·8080 |
| 팀원 백엔드(`drawtale-backend` dev) 띄우기 | **끝** — 로컬 Postgres, `AI_USE_MOCK=false`, 8000 |
| **프론트를 백엔드 계약에 맞춤** | **끝** — `docs/api-contract.md`. 화면까지 백엔드 흐름으로 (S-09 MP4, S-10 문장 카드) |
| 실제 모델로 S-01~S-11 전 구간 | **끝** — 브라우저로 확인. 목 모드도 끝까지 돈다 |
| 커밋 · push | **끝** — 프론트 `feat/backend-contract`, 백엔드 `feat/social-login` 둘 다 push. main/dev 합치기와 PR 은 아직 |
| 소셜 로그인 (카카오·구글. 네이버는 보류로 뺌) | **프론트 끝** — 목 모드로 확인. **백엔드는 `drawtale-backend` `feat/social-login` 브랜치에 push** (테스트 20개 통과, migration 양방향 확인). 개발자 콘솔 등록과 dev 합치기는 남음 (`api-contract.md` 4절) |

**팀원용 한 장 요약은 `docs/team-status.md`**, Antigravity 는 `GEMINI.md` 부터 읽는다.

**다음 할 일**: `docs/team-status.md` 「팀원에게 부탁할 것」을 팀원에게 전달
(관절 score·confidence, 모션 매핑, 설계서 S-09·S-10 갱신).

---

## 폴더 배치

```
Desktop/hankan-story/
├─ drawtale-frontend/     ← 이 저장소 (github.com/seominji58/drawtale-frontend)
├─ drawtale-ai/           ← 팀원 AI 저장소 dev 브랜치 zip (git 아님, 읽기 전용으로 쓴다)
├─ drawtale-backend/      ← 팀원 백엔드 main 브랜치 zip (뼈대뿐)
├─ drawtale-backend-dev/  ← 팀원 백엔드 dev 브랜치 zip — 이것을 띄운다
├─ drawtale-backend-git/  ← 팀원 백엔드 저장소 clone (git). feat/social-login 브랜치 작업용
└─ AnimatedDrawings/      ← Meta 원본 저장소 (수정하지 않는다)
```

두 팀원 저장소는 비공개라 이 PC의 git 자격 증명으로 clone 되지 않아서, 사용자가
GitHub에서 zip으로 받아 풀었다. **git 저장소가 아니므로 pull 로 갱신되지 않는다.**
새 코드가 필요하면 zip을 다시 받는다.

---

## 띄우는 순서

### 1. AI 서버 (`drawtale-ai`)

```bash
cd ../drawtale-ai
docker compose up -d          # 첫 빌드 20~30분 (mmcv 컴파일)
docker compose ps             # torchserve 가 healthy 가 되면 ai 가 뜬다
curl http://127.0.0.1:8001/internal/v1/health   # model_loaded: true
```

### 2. 백엔드 (`drawtale-backend-dev`)

`.env`는 `.env.example`을 복사해 **세 줄을 바꾼 것**이다 (이미 만들어 둠).

```bash
DATABASE_URL=postgresql+psycopg://drawtale:drawtale@db:5432/drawtale   # 컨테이너 안에서 db 를 본다
AI_SERVICE_URL=http://host.docker.internal:8001                        # 호스트의 AI 서버
AI_USE_MOCK=false
```

```bash
cd ../drawtale-backend-dev
docker compose --profile app up -d --build    # db + backend. migration 은 시작할 때 자동
curl http://127.0.0.1:8000/health
```

백엔드 가이드는 Azure 공유 DB를 쓰라고 하지만 접속 주소와 IP 등록이 필요해서
로컬 Postgres(`db` 서비스)로 띄웠다. `.env.example`의 기본값 `127.0.0.1:5433`은
백엔드를 venv로 돌릴 때용이라 컨테이너 안에서는 닿지 않는다.

### 3. 프론트

```bash
npm run dev      # .env 의 VITE_ENGINE 이 mock 이 아니면 /api/v1 이 8000 으로 간다
```

---

## 경위 — 왜 팀원 것으로 갈아탔나

처음 계획은 Meta 원본 `torchserve/Dockerfile`을 직접 빌드하고, 스텁 서버의 분석
부분만 TorchServe를 부르는 어댑터로 바꾸는 것이었다. 둘 다 만들어 돌렸다.

- 원본 Dockerfile은 **그대로는 빌드되지 않는다.** 베이스 이미지가 Debian 11(bullseye)인데
  지원 종료 뒤 `deb.debian.org`의 bullseye-security 패키지가 404 난다.
  `archive.debian.org`로 돌려 빌드했다 (이미지 32.9GB, CUDA 포함).
- 어댑터로 실제 모델을 돌려 보니 CPU로 장당 2.5~3초, crop → 원본 좌표 변환이 정확했다.

그 뒤 사용자가 팀원의 `drawtale-ai`를 받아 왔다. 같은 문제를 이미 풀었고(snapshot 저장소),
**CPU 전용 PyTorch로 이미지가 5.85GB**, 작업자 1개로 메모리 1.4GB다. 같은 Meta 가중치라
관절 좌표는 내 어댑터와 이미지 크기의 1% 안에서 같았다. 그리고 `drawtale-backend` dev가
이미 AI 서버를 부르고 있어서, 프론트는 **백엔드 계약에 맞추는 것이 맞다**고 판단했다
(사용자 지시: 「기준은 백엔드 기준으로」). 직접 만든 이미지·어댑터·스텁은 지웠다.

## 알려진 것

- **분석 시간**: 오전 단독 실측은 검출 2.1~2.6초. 오후 브라우저 실측은 17초였는데
  게임 클라이언트가 CPU 40%를 쓰던 때였다. S-04 제한이 30초라 다른 무거운 프로그램이
  돌면 넘을 수 있다
- **이야기 + MP4**: 54초. 백엔드 가이드는 30~40초라고 했다
- 모델은 여전히 Meta 사전학습 그대로다. 손그림 전용 모델(팀원 A2)은 아직 없다
- 팀원 AI 서버 실험 기록: `../drawtale-ai/docs/관절인식-실험-기록.md`
  (4등신 그림에서 관절이 안쪽으로 몰림, 후처리로는 효과 작음)
