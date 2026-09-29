# 식별자 규칙

프론트와 백엔드가 같은 이름으로 부르기로 한 것들. 계약(`docs/api-contract.md`)에
실려 오가는 값이므로 한쪽이 바꾸면 반대쪽이 깨진다.

---

## 한눈에 보기

| 무엇 | 형식 | 누가 정하나 | 예시 |
|---|---|---|---|
| 단계 kind | 소문자 | **타입으로 고정** | `place` |
| 선택지 id | 소문자, 접두사 없음 | **서버** | `forest` |
| 관절 이름 | snake_case | **Meta 어노테이션 그대로** | `right_shoulder` |
| 모션 id | 소문자 | **타입으로 고정** | `walk` |
| 분석 단계 | snake_case | 타입으로 고정 | `estimating_pose` |
| 생성 단계 | snake_case | 타입으로 고정 | `generating_text` |
| 오류 코드 | SCREAMING_SNAKE | 타입으로 고정 | `NO_CHARACTER` |
| 엔진 id | 소문자 | 타입으로 고정 | `finetuned` |
| `analysisId` | 자유 | 서버 | `a-8f21c0` |
| `storyId` | 자유 | 서버 | `s-1726` |
| 브라우저 저장소 키 | `storyblanks.*` | **프론트 전용** | `storyblanks.token` |

「타입으로 고정」은 `src/types/`의 유니온 타입에 값이 박혀 있다는 뜻이다.
서버가 다른 값을 보내면 프론트가 조용히 무시하거나 깨진다. 늘리려면 양쪽을 같이 고친다.

---

## 1. 선택지 id — 가장 먼저 맞출 것

**서버가 정하고 프론트는 받아서 그대로 돌려준다.** 프론트에 목록이 박혀 있지 않다
(`api/mock/fixtures.ts`는 목 전용이다).

`GET /api/steps?kind={kind}&level={level}` 응답에 실려 오고,
`POST /api/stories` 본문에 그대로 담겨 돌아간다.

```json
{ "place": "forest", "problem": "lost", "action": "ask", "result": "home" }
```

kind가 키로 붙으므로 **id에 단계 접두사를 넣지 않는다.** `p-forest`가 아니라 `forest`다.

> `docs/api-contract.md`에 한때 `p-forest`로 적혀 있었다. 코드가 맞고 문서가 틀렸다.
> 지금은 고쳤다.

### 목 데이터 기준 24개

실서버가 이 목록을 그대로 쓸 필요는 없지만, 같이 가면 목과 실서버를 오갈 때 편하다.

| kind | id |
|---|---|
| `place` | `space` `forest` `sea` `school` `town` `cave` |
| `problem` | `lost` `rain` `hungry` `dark` `fall` `alone` |
| `action` | `ask` `run` `hide` `help` `wait` `shout` |
| `result` | `home` `friend` `gift` `sun` `sleep` `party` |

`label`은 서버가 내려주는 한국어 문장이다. 프론트는 그대로 보여주고 그대로 읽어준다
(선택지를 탭하면 라벨을 읽는다 — 설계서 S-07-02).

### DB에 둘 때

선택지 마스터는 **`(kind, id)` 복합 키**가 자연스럽다. id만으로는 유일하지 않다 —
지금은 겹치지 않지만 장소에 「해」를 넣으면 결과의 `sun`과 부딪힌다.

이야기가 고른 네 값은 컬럼 넷(`place_id`, `problem_id`, …)이든
`(story_id, kind, choice_id)` 행 넷이든 상관없다. 계약에 드러나지 않는다.

### 아이콘 파일 경로

**`/icons/{kind}/{id}.png`** — id가 kind 안에서만 유일하므로 파일도 kind로 가른다.
장소에 「해」를 넣으면 결과의 `sun`과 파일 이름이 부딪히기 때문이다.

```
/icons/place/forest.png
/icons/result/sun.png
```

목은 이 규칙으로 맞춰 두었다 (`fixtures.ts`의 `RAW` → `CHOICES`).
프론트는 서버가 내려주는 `iconUrl`을 그대로 쓰므로 화면 코드는 경로를 모른다.

> **백엔드와 합의할 것**: 서버도 같은 규칙으로 `iconUrl`을 만들어 달라.
> 다르게 가도 프론트는 깨지지 않지만, 목과 실서버가 같은 파일을 쓰려면 맞는 편이 낫다.

장면 배경은 `bg-{장소id}-{장면번호}.png`다 (`bg-forest-0.png`).
장면 번호는 0~3이고 `docs/art-direction.md` 4.3의 분위기 네 단계에 대응한다.

---

## 2. 관절 이름 — 바꾸지 않는다

Meta Amateur Drawings 어노테이션을 그대로 쓴다. **AI 담당자가 내보내는 이름과
어긋나면 변환 레이어가 하나 더 생긴다.** `src/types/character.ts`가 계약이다.

```
hip  torso  neck  head
right_shoulder  right_elbow  right_hand
left_shoulder   left_elbow   left_hand
right_hip  right_knee  right_foot
left_hip   left_knee   left_foot
```

- `root`는 프론트가 `hip`에서 만드는 파생 관절이다. **서버는 보내지 않는다.**
- `head`를 누가 만들지는 합의 전이다 → `docs/open-decisions.md` 1번
- `hand`·`foot`은 모델 이름이고 실제로는 **손목·발목** 위치다. 계약 이름은 그대로 두고
  S-06-03 관절 목록에 보이는 글자만 「손목」·「발목」으로 쓴다

DB에는 JSON 컬럼 하나로 통째로 넣으면 된다. 관절마다 행을 만들 이유가 없다.

---

## 3. 모션 id

```
idle  walk  jump  wave  look
```

`src/types/story.ts`의 `MotionId`와 `skeleton.ts`의 `MOTIONS`에 박혀 있다.
서버가 `scenes[].motion`으로 내려주지만 **이 다섯 개 밖의 값을 보내면
`MOTIONS.find()`가 `idle`로 떨어진다.**

장면 번호에 고정이므로 서버가 고를 여지도 사실상 없다.

| 장면 | 모션 |
|---|---|
| 0 | `walk` |
| 1 | `look` |
| 2 | `wave` |
| 3 | `jump` |

`idle`은 S-01·S-05 대기용이다. `walk`가 Meta 저장소 기본 모션에 없는 건
브라우저 렌더에서는 문제가 아니다 → `docs/open-decisions.md` 4번

---

## 4. 진행 단계와 오류 코드

SSE와 오류 응답에 실린다. 전부 타입 고정이고, **아이 화면에는 노출하지 않는다.**

```
분석  uploaded → segmenting → estimating_pose → building_skeleton → done
생성  generating_text → synthesizing_voice → done
오류  NO_CHARACTER  MULTIPLE_CHARACTERS  LOW_CONFIDENCE
      UNSUPPORTED_IMAGE  ENGINE_TIMEOUT  ENGINE_ERROR
엔진  finetuned  agent  mock
```

아이에게 보여줄 문장은 프론트가 코드로 고른다 (`api-contract.md` 4절).
단계 이름은 진단 모드(S-04-05)에서만 보인다.

SSE의 `label`은 예외다 — **서버가 보내는 한국어 문장을 아이에게 그대로 보여준다.**
「친구를 찾고 있어요」처럼 아이 말로 써야 한다.

---

## 5. 서버가 만드는 id

`analysisId`와 `storyId`는 형식이 자유다. 프론트는 문자열로만 다루고 URL 경로에 넣는다.

- **URL에 그대로 들어가므로 URL-safe여야 한다**
- **개인정보를 넣지 않는다.** 계정을 만들지 않고 기기 단위 식별자만 쓴다는 것이
  설계서 11장의 전제다. 이메일이나 기기 지문을 id에 녹이면 그게 URL에 실린다
- 추측하기 어려운 값이 좋다. 비회원 이야기도 `GET /api/stories/{id}`로 열린다

---

## 6. 브라우저 저장소 키 — 백엔드와 무관

프론트 안에서만 쓴다. 접두사는 앱 영문 표기 `storyblanks`다.

| 키 | 어디 | 무엇 |
|---|---|---|
| `storyblanks.token` | localStorage | 회원 토큰 |
| `storyblanks.email` | localStorage | 회원 이메일 |
| `storyblanks.mode` | sessionStorage | 비회원 표시 |
| `storyblanks.trial` | localStorage | 비회원 체험 횟수 (정수 하나) |
| `storyblanks.settings` | localStorage | 지원 수준·소리·진단 모드 |
| `storyblanks.stories` | **모드에 따라 갈림** | 회원은 localStorage, 비회원은 sessionStorage |

마지막 줄이 설계서 11.1의 핵심이다. 비회원 이야기는 탭을 닫으면 사라져야 한다.

> `storyblanks.email`만 상수로 빠져 있지 않고 `auth.ts`에 문자열이 네 번 반복된다.
> 다른 키는 전부 상수다. 정리해 두면 좋다.

---

## 7. 바꿀 때

1. **타입 고정 값을 늘리려면 양쪽을 같이 고친다.** 프론트만 고치면 서버가 모르는 값을
   보내고, 서버만 고치면 프론트가 무시한다.
2. **선택지 id는 서버가 언제든 늘릴 수 있다.** 프론트에 목록이 없기 때문이다.
   단 아이콘 파일이 같이 와야 한다.
3. **관절 이름은 건드리지 않는다.** 바꾸려면 `skeleton.ts`의 `PARENT`·`BONES`,
   `S06Joints.tsx`, 서버 어댑터가 전부 따라 움직인다.
4. 바꾼 뒤 `docs/api-contract.md`와 이 문서를 같이 고친다.
