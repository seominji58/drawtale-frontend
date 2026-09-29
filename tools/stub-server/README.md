# 백엔드 스텁 서버

`docs/api-contract.md` 를 그대로 구현한 **임시 서버**다. 팀원의 진짜 FastAPI 서버가
8000번을 차지하면 이 폴더를 지운다.

```bash
python tools/stub-server/stub.py
```

띄운 뒤 <http://localhost:8000/> 을 열면 시나리오 조작판이 나온다.
프론트는 `.env` 의 `VITE_ENGINE` 이 `mock` 이 아니면 이 서버를 본다.

```bash
# .env
VITE_ENGINE=finetuned
```

```bash
npm run dev     # 5173. /api 요청은 vite 가 8000 으로 넘긴다
```

파이썬 표준 라이브러리만 쓴다. `pip install` 도 `.venv` 도 필요 없다.

---

## 왜 있나

**목 엔진이 못 덮는 구간이 있다.** `VITE_ENGINE=mock` 은 `src/api/index.ts` 의 함수
첫 줄에서 리턴해 버린다. 그래서 그 아래 실서버 분기 — vite 프록시, multipart 업로드,
`EventSource` SSE, HTTP 오류 매핑 — 는 **한 번도 실행된 적이 없는 코드**다.
통합 당일에 처음 돌리는 대신 지금 돌려 본다.

**계약서를 실행 가능한 형태로 만든다.** 팀원은 어떤 JSON 을 뱉어야 하는지 돌려보고
확인할 수 있다. 문서를 읽고 해석하는 것보다 어긋날 여지가 적다.

### 하지 않는 것

DB, Alembic, Docker, Azure, 실제 AI, 실제 TTS. 전부 팀원 몫이다
(`backend/한칸이야기_Backend_단계별_개발환경_통합가이드.md` 23·30절).

**계약에 없는 필드는 만들지 않는다.** 스텁이 편의로 필드 하나를 더 뱉으면 프론트가
거기 기대게 되고, 진짜 서버가 붙는 날 깨진다.

---

## 조작판

<http://localhost:8000/> 에서 시나리오를 바꾼다. 서버를 다시 띄울 필요는 없다.

| 항목 | 무엇을 보나 |
|---|---|
| 분석 실패 6종 | S-04 → E-01 이 코드마다 맞는 문장을 고르는지 (계약 4절) |
| `ENGINE_TIMEOUT` | `done` 을 보내지 않는다. S-04 의 30초 타이머가 먼저 터져야 맞다 |
| 관절 수 16 / 15 | `open-decisions.md` 1번. 15 로 두면 프론트가 깨지는 것을 눈으로 본다 |
| 좌표 기준 original / crop | `open-decisions.md` 2번. crop 이면 캐릭터가 어긋난다 (아래 참고) |
| 신뢰도 0.82 / 0.55 | 0.6 미만이면 S-05 에 「어른에게 도움 받기」가 떠야 한다 |
| 관절 score 낮춤 | `right_elbow` 를 0.34 로. S-06 보정 유도 |
| 음성 null / wav | `audioUrl` 이 null 이면 S-09 낭독 버튼이 비활성이어야 한다 |
| SSE 끊기 | 중간에 연결을 끊는다. 재연결이 되는지 본다 |
| HTTP 500 | `characters` · `steps` · `stories` 각각에 500 을 주입 |
| 단계 간격 | SSE 단계 사이 간격. 3초로 두면 느린 서버를 흉내낸다 |

조작판 아래 「받은 요청」 칸에 프론트가 실제로 보낸 것이 찍힌다.

`curl` 로도 바꿀 수 있다.

```bash
curl -X POST localhost:8000/__stub/config -d '{"fail":"NO_CHARACTER"}'
curl localhost:8000/__stub/config
```

---

## 샘플 그림

S-03 의 「샘플 그림으로 해보기」 버튼은 **목 엔진에서만 보인다**
(`src/screens/S03Upload.tsx` 49행). 실서버 모드에서는 고를 그림이 따로 필요하다.

`sample-drawing.png` 가 그것이다. 서버가 처음 뜰 때 만든다.
「앨범에서 고르기」로 넣으면 된다. **스텁이 내려주는 관절 좌표가 이 그림의 뼈대와
일치하도록** 그려져 있어서 S-05 에서 캐릭터가 제자리에 선다.

---

## 구현한 엔드포인트

계약서의 전부다.

| 메서드 · 경로 | 비고 |
|---|---|
| `POST /api/characters` | multipart. 받은 파일의 크기·형식을 로그에 찍는다 |
| `GET /api/characters/{id}/events` | SSE. 5단계 |
| `GET /api/characters/{id}` | 성공/실패 응답 |
| `PATCH /api/characters/{id}/keypoints` | **프론트가 보낸 관절을 검증해 로그에 남긴다** |
| `GET /api/steps?kind=&level=` | level 1·2·3 → 2·4·6개 |
| `POST /api/stories` | 장면 4개, 모션 고정 |
| `GET /api/stories` | 최신순 |
| `GET /api/stories/{id}` | |
| `POST /api/stories/{id}/activity` | |
| `GET · PATCH /api/settings` | |
| `POST /api/auth/login` · `signup` | 계약서에 없다 — 아래 2번 |
| `GET /health` | 백엔드 가이드 1주차 |

`POST /api/characters` 는 받은 이미지의 크기와 MIME 을 읽어서, 프론트가 정말
**긴 변 1600px · JPEG** 로 줄여 보내는지(계약 1절) 확인하고 어긋나면 ⚠ 를 찍는다.

`PATCH .../keypoints` 는 받은 관절 이름을 검증한다. `root` 가 오거나(프론트 파생
관절이라 보내면 안 된다) 빠진 관절이 있으면 로그에 ⚠ 를 남긴다.

---

## 붙여 보고 나온 것

스텁을 돌리면서 **계약서와 코드가 어긋난 지점**이 나왔다. 스텁 문제가 아니라
프론트·계약 쪽에서 정해야 하는 것들이다.

전 구간(S-01~S-11)을 실서버 모드로 돌려서 확인한 것들이다.
전체 목록과 손볼 곳은 `docs/backlog.md` P0-0 표에 있다.

### 1. `localhost` 가 요청마다 2초를 먹는다 ⚠ 팀원 서버에도 그대로 생긴다

Windows 에서 `localhost` 는 `::1` 을 먼저 시도한다. 서버가 IPv4 에만 붙어 있으면
`::1` 연결이 거절된 뒤 `127.0.0.1` 로 넘어가느라 **요청마다 약 2초**가 붙는다.

실측 (이 스텁, IPv4 단독으로 띄웠을 때):

```text
127.0.0.1    [18, 1, 1, 1] ms
localhost    [2020, 2010, 2032, 2022] ms
```

`vite.config.ts` 의 프록시 대상이 `http://localhost:8000` 이므로 **프론트의 모든
API 호출이 이 2초를 먹는다.** S-04 는 30초 타임아웃이 있어서 티가 덜 나지만
S-07 선택지 로드는 매번 2초씩 걸린다.

이 스텁은 `127.0.0.1` 과 `::1` 양쪽에 붙어서 피한다.
**팀원의 uvicorn 은 기본값이 IPv4 단독이라 같은 일이 생긴다.**

**고쳤다 (2026-09-29).** `vite.config.ts` 의 프록시 대상을 `http://127.0.0.1:8000` 으로
바꿨다. 이쪽이 백엔드가 어느 주소에 붙든 듣는다.

### 2. `POST /api/auth/login` · `signup` 이 계약서에 없다

`src/api/auth.ts` 13·27행이 부르는데 `docs/api-contract.md` 5절에는 토큰을 어디에
저장하는지만 있고 **엔드포인트가 없다.** 요청·응답 모양도 적혀 있지 않다.
스텁은 코드가 기대하는 `{token, email}` 로 맞춰 뒀지만, 계약서에 적어야 한다.

### 3. 실서버 모드에서 S-08 진행 표시가 멈춘다

`generateStory` 의 실서버 분기(`src/api/index.ts` 65~72행)는 **`onProgress` 를
한 번도 부르지 않는다.** `POST /api/stories` 한 방이고 SSE 가 없기 때문이다.

계약 2절은 「`generating_text` → `synthesizing_voice` → `done` 두 단계를 흘린다」고
적혀 있는데 흘릴 통로가 없다. 그래서 S-08 의 진행 표시(`steps={2} current={step}`)가
`current=0` 에 멈춘 채로 응답을 기다린다. 목에서는 `mockGenerate` 가 콜백을 불러서
안 보이던 문제다.

정할 것: 이야기 생성에도 SSE 를 둘지, 아니면 S-08 을 단계 없는 대기 화면으로 볼지.

### 4. SSE 재연결이 구현돼 있지 않다

계약 1절은 「연결이 끊기면 프론트가 3초 간격으로 두 번 재연결하고, 그래도 실패하면
오류 처리한다」고 적혀 있다. 그런데 `src/api/index.ts` 36행은

```ts
es.onerror = () => { stop(); reject(new Error("sse failed")); };
```

첫 오류에서 바로 닫고 거절한다. `EventSource` 의 기본 재연결도 `es.close()` 로
막힌다. 조작판의 「SSE 끊기」로 확인할 수 있다.

### 5. 서버가 잘라낸 그림을 줄 자리가 계약에 없다 ⚠ 렌더링에 영향

`open-decisions.md` 2번의 통일안은 「잘라낸 캐릭터 영역 기준. 서버가 잘라낸 그림과
마스크를 함께 보낸다」이고, 계약서는 「`imageUrl` 에 잘라낸 그림을 주면 그대로 맞는다」고
적혀 있다. **그런데 프론트는 서버가 준 이미지를 쓰지 않는다.**

`CharacterCanvas` 가 받는 `imageUrl` 은 `useSession` 의 값이고, 그것은
`URL.createObjectURL(file)` — **아이가 고른 원본 파일**이다
(`src/store/session.ts` 44행). `CharacterOk` 에는 잘라낸 그림을 담을 필드가
아예 없다. `maskUrl` 하나뿐이고 그것도 미사용이다.

즉 서버가 통일안대로 crop 기준 좌표를 보내면 **캐릭터가 통째로 어긋난다.**
조작판의 「좌표 기준 → crop」으로 눈으로 볼 수 있다.

정할 것: `CharacterOk` 에 `croppedImageUrl` 같은 필드를 두고 프론트가 그것을 쓰게
할지, 아니면 서버가 원본 기준으로 변환해서 보낼지.

### 6. 인증 토큰을 API 호출에 싣지 않는다

계약 5절에 토큰이 있는데 `src/api/index.ts` 의 어느 `fetch` 도 `Authorization`
헤더를 붙이지 않는다. 회원/비회원 구분이 서버에 전달되지 않는다.
스텁은 토큰을 요구하지 않으므로 지금은 문제가 드러나지 않는다.

### 7. 어른이 맞춘 관절이 서버로 가지 않는다

`patchKeypoints` 는 계약에도 있고 `src/api/index.ts` 41행에 구현도 돼 있는데
**부르는 곳이 없다.** `S06Joints.tsx` 40행의 「다 했어요」는 `setKeypoints` 로 세션만
고치고 `nav("/confirm")` 한다. 전 구간을 돌리는 동안 스텁에 `PATCH` 가 한 번도
들어오지 않았다.

### 8. `audioUrl` 을 읽는 코드가 없다

`<audio>` 도 `new Audio` 도 저장소 전체에 없다. `S09Story.tsx` 28행은 항상
`speak(scene.sentence, muteAll)` — 브라우저 TTS 다. 서버가 음성을 합성하든 안 하든
화면은 달라지지 않는다. `docs/open-decisions.md` 14번.

### 9. 개발 모드에서 같은 요청이 두 번 나간다

`React.StrictMode` 가 effect 를 두 번 돌리는데, cleanup 의 `abort()` 는 **이미
서버에 도착한 요청을 되돌리지 못한다.** 스텁 로그 실측:

```text
POST /api/characters  7KB image/png (820, 1100)   (2회)
POST /api/stories {...} → s-000317cd              (2회, 이야기 두 편이 생겼다)
GET  /api/steps kind=place level=1 → 2개          (2회)
```

프로덕션 빌드에는 없는 일이다. 다만 **개발과 통합 테스트 내내 GPU 분석·OpenAI·TTS
비용이 두 배로 나간다.** 백엔드에 멱등키를 두는 선택지가 있다.

### 10. `shrink()` 가 작은 그림은 원본 그대로 보낸다 ⚠ 백엔드 디코더에 영향

`src/lib.ts` 21행:

```ts
if (ratio === 1 && file.size < 2_000_000) return file;   // 원본 그대로
```

계약 1절은 「JPEG 품질 0.85 로 재인코딩한다. **원본은 보내지 않는다**」인데,
긴 변 1600px 이하이고 2MB 미만이면 원본 바이트가 그대로 올라간다.
스텁이 `⚠ image/png — 계약은 JPEG` 를 찍어서 드러났다.

**백엔드는 PNG·WebP·HEIC 까지 디코딩할 수 있어야 한다.** 아이폰 앨범에서 고른
작은 HEIC 이 그대로 올라올 수 있다.

---

## 알아 둘 것

- 아이콘은 `data:` URI 로 만든 이모지다. `public/icons/{kind}/{id}.png` 가 아직
  비어 있어서 파일에 의존하지 않게 해 뒀다. 목 엔진과 같은 방식이다.
- `backgroundUrl` 은 계약대로 전부 `null` 이다. 그림이 아직 없다.
- 음성은 실제 TTS 가 아니라 사인파 한 음이다. 낭독 버튼과 재생 경로가 살아 있는지만 본다.
- 데이터는 메모리에만 있다. 서버를 다시 띄우면 만든 이야기가 사라진다.
- 8000번을 이미 쓰고 있으면 못 뜬다. 팀원 서버와 동시에 띄울 수 없다 (띄울 이유도 없다).
