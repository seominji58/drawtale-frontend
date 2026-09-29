# API 계약 — 프론트가 백엔드 계약을 어떻게 받아 쓰나

**계약의 원본은 백엔드 저장소다.** `drawtale-backend` dev 브랜치 `docs/api-contract.md`
(초안 v0.1, 2026-09-28). 2026-09-29부터 프론트는 그 계약에 맞췄다.
이 문서는 원본을 옮겨 적지 않고, **프론트 쪽에서 무엇을 어떻게 바꿔 쓰는지**만 적는다.

- 서버와 주고받는 모양은 `src/api/index.ts` 안에만 있다. 화면은 `src/types/`의 모양만 본다.
- 백엔드 계약이 바뀌면 `src/api/index.ts`의 `Server*` 인터페이스와 변환 함수부터 고친다.
- 이전 계약(v1.0, 프론트가 먼저 쓴 것)은 git 이력에 있다. 왜 버렸는지는 `docs/worklog.md` 2026-09-29.

```text
프론트(5173) ─/api/v1→ 백엔드(8000) ─→ AI 서버(8001, drawtale-ai) ─→ TorchServe(8080)
             vite 프록시               내부 전용, 프론트는 모른다
```

---

## 1. 부르는 엔드포인트

| 화면 | 메서드 · 경로 | 프론트 함수 |
|---|---|---|
| S-04 | `POST /api/v1/characters` (multipart `image`) → 202 | `analyzeCharacter` |
| S-04 · S-08 | `GET /api/v1/jobs/{job_id}` — **1.5초 간격 polling** | `waitJob` (내부) |
| S-04 | `GET /api/v1/characters/{id}` | `analyzeCharacter` |
| S-06 | `PATCH /api/v1/characters/{id}/joints` | `saveJoints` |
| S-08 | `POST /api/v1/stories` → 202 | `generateStory` |
| S-08 | `GET /api/v1/stories/{id}` | `generateStory` |

**백엔드에 없어서 프론트가 들고 있는 것**

| 무엇 | 지금 | 근거 |
|---|---|---|
| S-07 선택지 목록 | `src/features/story/choices.ts` | 계약 2-5 ⚠ 「선택지를 서버가 내려줄지」 미정 |
| 이야기 목록 (S-01·S-12) | `store/library.ts` (sessionStorage / localStorage) | 목록 엔드포인트 없음 |
| 어른 설정 (S-13) | `store/settings.ts` | 설정 엔드포인트 없음 |
| S-10 시도 기록 | 보내지 않는다 | activity 엔드포인트 없음 |
| 로그인·회원가입 (S-15·S-16) | `src/api/auth.ts`가 `/api/v1/auth/*`를 부르지만 **백엔드에 없다**. 아래 4절이 프론트 제안 | 계약 4절 9번 「로그인/세션 없음 (비회원)」 |

---

## 2. 바꿔 쓰는 것

### 좌표 — 원본 픽셀 ↔ 0~1

서버는 **원본 이미지 픽셀**(`coordinate_space: "image_px"`)로 준다. 프론트는 받자마자
`image_width`·`image_height`로 나눠 0~1로 들고 다니고, `PATCH` 할 때 다시 곱해 보낸다
(소수 첫째 자리까지). 화면·캔버스는 0~1만 안다.

### 관절 — 15개, `head`는 프론트가 만든다

서버는 15개를 준다 (계약 1-1, Meta skeleton − root). 캔버스는 머리 조각을 그리려면
`head`가 필요해서 `skeleton.ts`의 `toPixels()`가 `torso → neck` 방향으로 0.5만큼
연장해 만든다. `root`는 `hip` 자리다. **둘 다 서버와 주고받지 않는다**
(`open-decisions.md` 1번 A안).

Meta 모델의 `neck`은 목이 아니라 **얼굴 가운데(코)** 다. S-06 목록에는 「얼굴」로 적는다.
`hand`·`foot`은 손목·발목이다 (3번).

### 관절 신뢰도 — 없다

서버는 `confidence`도 관절별 `score`도 주지 않는다. 그래서

- S-05의 「어른에게 도움 받기」는 조건 없이 늘 보이는 보조 링크다
- S-06은 신뢰도 숫자와 빨간 점 없이, **어른이 옮긴 관절**만 「옮김」으로 표시한다

모델은 점수를 낸다. AI 서버가 버리고 있을 뿐이다 (`open-decisions.md` 0-2).

### 오류 코드 → E-01

서버의 `error.message`는 어른용 문장이라 아이 화면에 띄우지 않는다.
E-01 문구는 여전히 프론트가 코드로 고른다 (`src/lib.ts` `ERROR_TEXT`).

| 백엔드 코드 | E-01 코드 |
|---|---|
| `NO_CHARACTER_DETECTED` | `NO_CHARACTER` |
| `INVALID_IMAGE`, `FILE_TOO_LARGE` | `UNSUPPORTED_IMAGE` |
| `AI_TIMEOUT`, 프론트 polling 제한 초과 | `ENGINE_TIMEOUT` |
| 그 밖 전부 (`AI_UNAVAILABLE`, `AI_ERROR`, `INTERNAL_ERROR` …) | `ENGINE_ERROR` |

`MULTIPLE_CHARACTERS`·`LOW_CONFIDENCE`는 백엔드가 내지 않는다. 문구표에는 남겨 둔다.

### 이야기 — `text` 한 덩어리 + MP4

서버는 문장을 `text` 하나로, 애니메이션을 **서버가 렌더한 MP4** 하나로 준다 (계약 2-6).

- S-09는 `animation_url`이 `.mp4`면 `<video>`로 반복 재생한다. 목 AI는 원본 그림 URL을
  넣어 보내므로 그땐 그림을, 목 엔진(`animationUrl: null`)이면 브라우저 캔버스를 쓴다
- 문장은 `src/lib.ts`의 `sentences()`가 마침표 기준으로 나눈다. S-09는 한 문장씩 짚으며
  읽고, S-10은 문장 카드로 순서를 맞춘다
- `audio_url`이 오면 그 파일을 재생하고, `null`이면 브라우저 TTS로 한 문장씩 읽는다
- 서버에는 선택지 **id가 아니라 라벨**을 보낸다 (계약이 자유 문자열 50자)
- 제목이 없어서 `「{장소}에 간 날」`을 프론트가 만든다 (S-12·S-13 목록용)

### 기다리는 시간

| 구간 | 프론트 제한 | 실측 (2026-09-29, 이 PC, CPU) |
|---|---|---|
| 분석 (S-04) | 30초 (`ANALYZE_LIMIT_MS`, S-04 타이머와 같다) | 17초. 게임이 CPU 40%를 쓰던 때라 부풀려진 값. 오전 단독 실측은 검출 2.1~2.6초 |
| 이야기 + MP4 (S-08) | 300초 (`STORY_LIMIT_MS`, 백엔드 AI 타임아웃과 같다) | 54초 |

---

## 3. 로컬에서 실제로 띄우기

`docs/animated-drawings-local.md`에 순서가 있다. 요약하면 `drawtale-ai`를
`docker compose up -d`, `drawtale-backend`를 `docker compose --profile app up -d`
(`.env`에 `AI_USE_MOCK=false`), 프론트 `.env`는 `VITE_ENGINE`을 `mock`이 아닌 값으로.

---

## 4. 로그인 — 소셜 로그인 (카카오 · 네이버 · 구글)

**원본은 백엔드 `feat/social-login` 브랜치** (github.com/seominji58/drawtale-backend,
2026-09-29 push, dev 에 합쳐지기 전)의 계약서 2-7·2-8 이다. 여기에는 프론트 쪽 동작만 적는다.
백엔드 계약 4절 9번은 이 브랜치에서 「소셜 로그인 추가, 선택 사항」으로 바뀐다.

### 4-1. 흐름 — 인가 코드 방식

```text
S-15/S-16 [○○ 로그인]
  → 제공자 인가 화면 (client_id, redirect_uri, response_type=code, state)
  → {origin}/auth/{provider}/callback?code=…&state=…     ← S15Callback.tsx
  → POST /api/v1/auth/{provider} { code, redirect_uri, state, agreed }
  → { token, account } 로 로그인
```

| 제공자 | 인가 주소 | scope |
|---|---|---|
| kakao | `https://kauth.kakao.com/oauth/authorize` | 없음 |
| naver | `https://nid.naver.com/oauth2.0/authorize` | 없음 (콘솔 동의 항목 최소) |
| google | `https://accounts.google.com/o/oauth2/v2/auth` | `openid` (필수 최소값) |

- **받는 것은 제공자 회원번호뿐이다.** 이름·이메일·프로필 사진은 받지 않는다
- `state`는 떠날 때 sessionStorage에 두고 돌아와서 맞춰 본다 (CSRF). 네이버는 토큰 교환에도
  필요해서 백엔드에 함께 보낸다
- **시크릿은 백엔드에만 있다.** 프론트에는 client id(`VITE_{KAKAO|NAVER|GOOGLE}_CLIENT_ID`)만.
  비어 있는 제공자는 실서버 모드에서 버튼을 숨긴다
- 개발 모드 StrictMode 에서 콜백 effect 가 두 번 돌아도 인가 코드는 한 번만 쓴다

### 4-2. 처음 온 사람 — `SIGNUP_REQUIRED`

`agreed: false`로 처음 보는 회원번호가 오면 백엔드가 `409 SIGNUP_REQUIRED`를 준다.
프론트는 S-16으로 보내 「처음 오셨네요. 약관에 동의하고 ○○ 계정으로 가입해 주세요」를 띄우고,
동의 체크 전에는 소셜 버튼을 잠근다. **제공자 동의 화면은 우리 약관 동의를 대신하지 않는다.**

| 경우 | 프론트 처리 |
|---|---|
| `SIGNUP_REQUIRED` | S-16으로 |
| 제공자에서 `error=access_denied` (사용자가 취소) | 조용히 S-15로 |
| 그 밖 (`state` 불일치, `OAUTH_FAILED`, `PROVIDER_NOT_CONFIGURED` …) | 콜백 화면에 오류, 「로그인으로 돌아가기」 |

토큰은 `localStorage`의 `storyblanks.token`에 둔다. **아직 다른 API 호출에 싣지 않는다** —
백엔드도 아직 로그인을 요구하는 API가 없다 (`GET /api/v1/auth/me` 뿐).

### 4-3. 이메일 로그인

`POST /api/v1/auth/login` · `/auth/signup` — **백엔드에 없다.** 예전 화면이 남아 있을 뿐이다.
둘지 뺄지는 `open-decisions.md` 0-3.

### 4-4. 개발자 콘솔에서 할 일 (사람이 해야 한다)

| | 카카오 | 네이버 | 구글 |
|---|---|---|---|
| 콘솔 | developers.kakao.com | developers.naver.com | console.cloud.google.com |
| 프론트 `.env` | REST API 키 → `VITE_KAKAO_CLIENT_ID` | Client ID → `VITE_NAVER_CLIENT_ID` | OAuth 클라이언트 ID(웹) → `VITE_GOOGLE_CLIENT_ID` |
| 백엔드 `.env` | `KAKAO_CLIENT_ID`·`KAKAO_CLIENT_SECRET` | `NAVER_CLIENT_ID`·`NAVER_CLIENT_SECRET` | `GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET` |
| Redirect URI | `http://localhost:5173/auth/kakao/callback` | `…/auth/naver/callback` | `…/auth/google/callback` |
| 동의 항목 | 아무것도 켜지 않는다 | 필수 항목을 최소로 | scope `openid`만 |

### 4-5. 버튼 그림 — 세 곳 모두 공식 리소스, 고치지 않는다

| 제공자 | 파일 | 출처 |
|---|---|---|
| 카카오 | `public/brand/kakao/kakao_login_kr_medium.svg` | developers.kakao.com 리소스 「전체 다운로드」 |
| 네이버 | `public/brand/naver/NAVER_login_Light_KR_green_narrow_H56.png` | developers.naver.com 로그인 BI `NAVER_login_KR.zip` |
| 구글 | `public/brand/google/signin_light_square.svg` | Google 브랜딩 가이드 `signin-assets.zip` |

구글 공식 파일은 영어(「Sign in with Google」)뿐이다. 가이드는 한국어 현지화를 허용하지만
로고만 따로 있는 파일이 없어 원본 그대로 쓴다. 자세한 것은 각 폴더의 `README.txt`.
