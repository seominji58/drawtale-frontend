# API 계약 v1.0

프론트가 부르는 엔드포인트 전부와 응답 모양이다. 화면 코드는 `src/api/index.ts`만
지나므로, 백엔드와 맞출 것은 이 문서 하나다.

**엔진이 파인튜닝이든 에이전트든 계약은 같다.** 교체는 응답의 `engine` 필드로만 드러난다.
프론트는 `VITE_ENGINE`으로 목/실서버만 가른다.

타입 원본은 `src/types/character.ts`, `src/types/story.ts`다. 이 문서와 어긋나면
타입 파일이 기준이다.

> **이 문서를 그대로 구현한 임시 서버가 `tools/stub-server/`에 있다.**
> `python tools/stub-server/stub.py`로 띄우면 아래 응답을 실제로 받아 볼 수 있다.
> 2026-09-29에 그것을 붙여 보고 **이 문서에 빠져 있는 것 여섯 개**가 나왔다 —
> 인증 엔드포인트, 이야기 생성 진행 통로, 잘라낸 그림을 줄 자리 등.
> `docs/backlog.md` P0-0과 `tools/stub-server/README.md`를 함께 본다.

---

## 엔드포인트 목록

| 화면 | 메서드 · 경로 | 용도 |
|---|---|---|
| S-01, S-12 | `GET /api/stories` | 저장된 이야기 목록 |
| S-03 | `POST /api/characters` | 그림 업로드 → `analysisId` |
| S-04 | `GET /api/characters/{id}/events` | SSE 진행 단계 |
| S-04 → S-05 | `GET /api/characters/{id}` | 분석 결과 |
| S-06 | `PATCH /api/characters/{id}/keypoints` | 관절 보정 좌표 전송 |
| S-07 | `GET /api/steps?kind={kind}&level={level}` | 단계별 선택지 |
| S-08 | `POST /api/stories` | 이야기 생성 (문장 + 음성) |
| S-09 | `GET /api/stories/{id}` | 이야기 하나 |
| S-10 | `POST /api/stories/{id}/activity` | 순서 맞추기 기록 |
| S-13 | `GET` · `PATCH /api/settings` | 어른 설정 |

---

## 1. 캐릭터 분석

### POST /api/characters

`multipart/form-data`, 필드명 `image`.

프론트가 보내기 전에 **긴 변 1600px로 리사이즈하고 JPEG 품질 0.85로 재인코딩한다.
원본은 보내지 않는다.** 10MB 초과와 미지원 형식은 업로드 전에 막는다.

```json
{ "analysisId": "a-8f21c0" }
```

### GET /api/characters/{id}/events — SSE

```json
{ "stage": "segmenting", "progress": 0.35, "label": "친구를 찾고 있어요" }
```

| stage | 순서 |
|---|---|
| `uploaded` | 1 |
| `segmenting` | 2 |
| `estimating_pose` | 3 |
| `building_skeleton` | 4 |
| `done` | 5 |

`label`은 **아이에게 그대로 보여주는 문장**이므로 서버가 한국어 아이 말로 보낸다.
단계 이름(`segmenting` 등)은 화면에 노출하지 않는다 — 진단 모드(S-04-05)에서만 쓴다.

타임아웃은 30초다. 넘기거나 `ENGINE_TIMEOUT`을 받으면 E-01로 간다.
연결이 끊기면 프론트가 3초 간격으로 두 번 재연결하고, 그래도 실패하면 오류 처리한다.

### GET /api/characters/{id}

성공:

```json
{
  "version": "1.0",
  "engine": "finetuned",
  "image": { "width": 820, "height": 1100 },
  "character": {
    "found": true,
    "confidence": 0.82,
    "bbox": [0.22, 0.12, 0.56, 0.78],
    "maskUrl": "https://.../mask.png",
    "keypoints": { "hip": { "x": 0.5, "y": 0.52, "score": 0.91 }, "...": {} }
  },
  "elapsedMs": 2840
}
```

실패:

```json
{
  "version": "1.0",
  "engine": "finetuned",
  "character": { "found": false },
  "error": { "code": "NO_CHARACTER", "message": "...", "retryable": true }
}
```

`message`는 로그용이다. **아이에게 보여주는 문장은 프론트가 코드로 고른다** (아래 E-01 표).

| 필드 | 쓰는 곳 | 비고 |
|---|---|---|
| `confidence` | S-05-05 조건부 노출 | `< 0.6`이면 「어른에게 도움 받기」가 뜬다 |
| `keypoints[].score` | S-05-05, S-06-01 | 하나라도 `< 0.4`면 보정 유도. S-06에서 다른 색으로 표시 |
| `bbox` | 현재 미사용 | `[x, y, w, h]` 정규화. 좌표 기준 결정 후 쓸지 정한다 |
| `maskUrl` | **현재 미사용** | `null`이면 원본으로 렌더하고 그대로 진행한다 (S-05-02) |
| `elapsedMs` | S-04-05 진단 모드 | |

### 관절 이름

Meta Amateur Drawings 어노테이션을 그대로 쓴다. **AI 담당자가 내보내는 이름과
어긋나면 변환 레이어가 하나 더 생기므로 `src/types/character.ts`를 그대로 계약으로 쓴다.**

```
hip  torso  neck  head
right_shoulder  right_elbow  right_hand
left_shoulder   left_elbow   left_hand
right_hip  right_knee  right_foot
left_hip   left_knee   left_foot
```

`root`는 프론트가 `hip`과 같은 자리로 만드는 파생 관절이므로 **서버가 보내지 않는다.**

> **`head`와 좌표 기준은 아직 합의 전이다. `docs/open-decisions.md` 1·2번을 먼저 읽는다.**
> Meta 모델은 `head`를 내지 않고 `neck`이 코 위치에 온다. 통합 정리 문서(2026-09-21)는
> 관절 15개로 통일하라고 했는데, 지금 타입과 `skeleton.ts`는 16개 기준이다.
>
> **백엔드에 요청하는 쪽**: 좌표 어댑터에서 `head`를 `neck` 위쪽으로 연장해 합성하고
> 16개로 보내 준다. 어차피 잘라낸 영역 → 정규화 좌표 변환을 하는 자리이고, 그렇게 하면
> 프론트 렌더 코드와 S-06의 머리 끌기가 그대로 유지된다. 이 경우 `head`는 `root`와 같은
> **파생 관절**이며, 모델이 실제로 내는 것은 15개라는 사실은 그대로다.

`hand`와 `foot`은 모델 이름이고 **실제로는 손목·발목 위치**다.
S-06-03 관절 목록의 화면 라벨은 「손목」·「발목」으로 쓴다.

### PATCH /api/characters/{id}/keypoints

```json
{ "keypoints": { "left_elbow": { "x": 0.41, "y": 0.48, "score": 1 }, "...": {} } }
```

어른이 보정한 좌표다. 보정하지 않은 관절도 함께 보낸다.
미보정 상태로 화면을 나가면 자동 추정값을 그대로 쓴다 (호출하지 않는다).

---

## 2. 이야기

### GET /api/steps?kind={kind}&level={level}

`kind`는 `place` · `problem` · `action` · `result` 넷이다.
`level`은 1·2·3이고 **서버가 개수를 맞춰 보낸다** (2·4·6개).

```json
[ { "id": "forest", "iconUrl": "https://.../place/forest.png", "label": "숲" } ]
```

**id에 단계 접두사를 넣지 않는다.** `kind`가 함께 오므로 필요 없다.
식별자 규칙 전체는 `docs/id-conventions.md`에 있다.

`label`은 선택지를 탭할 때 읽어주는 말이기도 하다.
로드에 실패하면 프론트가 직전 캐시를 쓰고 안내하지 않는다. 캐시도 없으면 E-01로 간다.

### POST /api/stories

네 단계 선택 결과를 **S-08에서 한 번에** 보낸다. S-07에서는 클라이언트에 보관만 한다.

```json
{ "place": "forest", "problem": "lost", "action": "ask", "result": "home" }
```

진행은 SSE 없이 `generating_text` → `synthesizing_voice` → `done` 두 단계를 흘린다.

응답:

```json
{
  "storyId": "s-1726",
  "title": "숲에 간 날",
  "createdAt": "2026-09-28",
  "scenes": [
    { "index": 0, "sentence": "내 친구가 숲으로 갔어요.", "audioUrl": "...", "motion": "walk",  "backgroundUrl": null },
    { "index": 1, "sentence": "그런데 길을 잃었어요.",   "audioUrl": "...", "motion": "look",  "backgroundUrl": null },
    { "index": 2, "sentence": "그래서 친구에게 물었어요.", "audioUrl": "...", "motion": "wave", "backgroundUrl": null },
    { "index": 3, "sentence": "마지막에 길을 찾았어요.",   "audioUrl": "...", "motion": "jump", "backgroundUrl": null }
  ]
}
```

**장면은 항상 4개다.** 모션은 아이가 고르는 것이 아니라 **장면 번호에 고정**된다.

| 장면 | 모션 |
|---|---|
| 0 | `walk` 걷기 |
| 1 | `look` 둘러보기 |
| 2 | `wave` 손 흔들기 |
| 3 | `jump` 점프 |

어떤 선택 조합이 와도 모션은 이 네 개로 끝난다. `idle`은 S-01·S-05 대기용이다.

> `walk`는 Meta 저장소 기본 모션에 없다. 브라우저 렌더에서는 `skeleton.ts`가
> 직접 계산하므로 문제가 없지만, 서버 렌더로 가면 BVH를 따로 구해야 한다.
> `docs/open-decisions.md` 4번.

**문장 생성은 성공했는데 음성 합성만 실패하면** `audioUrl: null`로 보내고 200을 낸다.
프론트는 S-09로 진행하되 낭독 버튼을 비활성으로 두고 어른 설정에 경고를 남긴다.
**부분 실패를 전체 실패로 처리하지 않는다.**

서버는 문장을 내보내기 전에 검열을 통과시킨다 (`omni-moderation`). 아동 대상 출력
안전장치이고, 프론트에는 통과한 문장만 온다.

### GET /api/stories · GET /api/stories/{id}

같은 `Story` 모양이다. 목록은 최신순으로 정렬해서 보낸다.
S-01은 **건수만** 쓴다 (0건이면 「내 이야기」 버튼이 비활성).
목록 조회가 실패하면 S-01은 오류 화면을 띄우지 않고 비활성을 유지한다.

### POST /api/stories/{id}/activity

```json
{ "tries": 2, "done": true }
```

S-10 순서 맞추기 시도 횟수와 완료 여부다.

---

## 3. 설정

### GET · PATCH /api/settings

```json
{ "level": 2, "muteAll": false, "keepOriginal": false, "diagnostics": false }
```

**계정을 만들지 않는다. 기기 단위 식별자만 쓴다.**
`keepOriginal`이 꺼져 있으면 서버는 분석 후 원본 이미지를 지운다. 기본 꺼짐이다.

---

## 4. 오류 코드와 아이 화면 문장

서버는 코드만 보낸다. 문장 선택은 프론트가 한다. **코드는 화면에 노출하지 않는다.**

| 코드 | 아이에게 보여주는 문장 | 보조 안내 | 1차 행동 |
|---|---|---|---|
| `NO_CHARACTER` | 그림에서 친구를 못 찾았어요 | 사람을 한 명만 크게 그려 볼까요? | 다시 찍기 |
| `MULTIPLE_CHARACTERS` | 친구가 여러 명이에요 | 한 명만 나오게 찍어 볼까요? | 다시 찍기 |
| `LOW_CONFIDENCE` | 그림이 조금 흐릿해요 | 더 밝은 곳에서 찍어 볼까요? | 다시 찍기 |
| `UNSUPPORTED_IMAGE` | 이 그림은 열 수 없어요 | 다른 그림을 골라 볼까요? | 앨범에서 고르기 |
| `ENGINE_TIMEOUT` | 시간이 오래 걸리고 있어요 | 잠시 뒤에 다시 해 볼까요? | 다시 하기 |
| `ENGINE_ERROR` | 잠깐 문제가 생겼어요 | 처음부터 다시 해 볼까요? | 처음으로 |

E-01은 **모달이 아니라 전체 화면**이다. 아이 화면에서 모달은 배경이 비쳐 혼란을 준다.
`LOW_CONFIDENCE`는 그대로 진행하는 선택지를 2차 행동으로 제공한다.

업로드 실패는 E-01로 보내지 않는다. S-03에서 재시도 버튼을 띄운다.

---

## 5. 인증

토큰은 보호자·교사 계정의 것이다. 아이는 로그인하지 않는다.

- 비회원: `sessionStorage`
- 회원: `localStorage` (`storyblanks.token`)

`src/api/auth.ts`가 다룬다. 비회원도 API를 부를 수 있어야 한다 (체험 2편).
