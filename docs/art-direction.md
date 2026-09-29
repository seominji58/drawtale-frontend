# 그림 기준

GPT Image로 만들 그림의 화풍과 프롬프트. 설계서 9장의 미결정 항목 중
**선택지 아이콘**(2주차)과 **장면 배경**(3주차)을 여기서 확정한다.

결정: 아이콘은 **장소만 사물, 문제·행동·결과는 실루엣 인물**.
배경은 **장소 6개 × 장면 분위기 4단계 = 24장**.

---

## 1. 만들 것

| 종류 | 수량 | 비율 | 배경 | 쓰이는 곳 |
|---|---|---|---|---|
| 선택지 아이콘 | 24 | 1:1 | 투명 PNG | S-07 선택지 카드 |
| 장면 배경 | 24 | 3:2 가로 | 불투명 | S-09 `StoryScene.backgroundUrl` |
| 삽화 | 6 | 1:1 | 투명 PNG | `components/illust.tsx` 교체 |

삽화 6종은 캐릭터, 그림 종이, 연필, 갸웃하는 얼굴, 축하, 장면 배경이다.

**S-02의 예시 사진 3장은 여기서 만들지 않는다.** 「사람 한 명」·「흰 종이」·「여러 명」은
Meta 모델이 실제로 성공·실패하는 조건을 보여주는 기능이라, 생성 이미지가 아니라
**1주차 PoC에서 실제로 돌려본 그림** 중에서 골라야 한다. 동의 문제를 피하려면
팀원이 직접 그려 같은 조건으로 찍는다.

---

## 2. 지켜야 할 것

기능에서 나온 제약이다. 화풍 취향보다 먼저다.

1. **아이 그림이 주인공이다.** S-09에서 아이가 그린 캐릭터가 배경 위에 선다.
   배경이 튀면 주인공이 묻힌다. 배경은 채도를 낮추고 아래 3분의 1을 비워 둔다.
2. **글자 없이 읽혀야 한다.** Level 1은 아이콘 아래 라벨이 아예 없다
   (`--show-label: none`). 그림만으로 무엇인지 알아야 한다.
3. **104px에서 읽혀야 한다.** Level 3 아이콘이 104px, 좁은 화면에서는 100px다.
   디테일이 많으면 뭉개진다. 실루엣만으로 구분되는지가 기준이다.
4. **얼굴과 표정을 넣지 않는다.** 아이 캐릭터와 경쟁하고, 감정을 과하게 지정한다.
   실루엣 인물은 자세만으로 상황을 말한다.
5. **부정 표현을 쓰지 않는다.** 설계서 S-02-04의 「아직 어려워요」와 같은 선이다.
   「넘어졌어요」는 넘어지는 순간이 아니라 **앉아 있는 모습**으로,
   「혼자가 됐어요」는 슬픈 얼굴이 아니라 **둘레의 빈 공간**으로 그린다.
6. **글자를 넣지 않는다.** 프롬프트에 매번 못 박는다. 생성 모델은 두면 넣는다.
7. **단계 색과 맞춘다.** 아이콘 톤을 그 단계 색에 맞추면 지금 어느 칸인지
   색으로도 읽힌다.

| 단계 | 토큰 | 값 |
|---|---|---|
| 장소 | `--c-place` | `#7FB2F0` |
| 문제 | `--c-problem` | `#F4909F` |
| 행동 | `--c-action` | `#74CDAE` |
| 결과 | `--c-result` | `#F5C46B` |

바탕은 `--milk #E6EEFB`, 무대는 `--cloud #FFFFFF`, 주된 행동은 `--grape #7386F5`,
고른 것은 `--butter #FFEA99`다.

---

## 3. 스타일 앵커

**모든 프롬프트 맨 앞에 이 문단을 그대로 붙인다.** 24장이 한 세트로 보이려면
여기를 고치지 않는 것이 가장 중요하다. 대상 설명만 바꾼다.

```
Soft watercolor storybook painting, rounded and gentle. Completely flat —
no 3D rendering, no volumetric shading, no glossy highlights, no plastic or
clay look. No harsh outlines, no black. Pastel palette sitting on a pale
blue-white base (#E6EEFB). Shadows carry their own hue, never grey. Every
form has generously rounded corners — nothing sharp or angular. Calm and
quiet, low visual noise, still readable as a silhouette at 104 pixels.
Subtle soft paper grain. The subject occupies about 70% of the frame with
generous empty margin around it.
No text, no letters, no numbers, no watermark.
```

「구름과 젤리」라는 기존 방향을 문장으로 옮긴 것이다 (`tokens.css` 첫 줄 주석).
각진 것을 두지 않고, 모서리를 크게 굴리고, 그림자는 회색 대신 자기 색을 머금는다.

> **1차 시도(2026-09-28)에서 배운 것.** 처음 앵커는 `Flat shapes with gentle tonal
> shading` 이었는데, 실루엣 인물이 **점토 피규어처럼 볼륨과 광택을 달고 나왔다.**
> 같은 앵커로 뽑은 나무·배경은 평면 수채라 셋을 나란히 놓으면 하나만 딴 세상이었다.
> `Completely flat — no 3D rendering...` 을 명시적으로 넣어야 막힌다.
> 여백도 `even margins` 만으로는 부족해서 70% 비율을 숫자로 못 박았다.

---

## 4. 종류별 프롬프트 틀

### 4.1 장소 아이콘 (6장)

```
{스타일 앵커}

A single {대상} centered, nothing else in frame — no ground line, no scene,
no people. Natural colors for the object, kept in the same soft pastel range
as the rest of the set. Transparent background. Square composition.
```

> **단계 색을 아이콘에 칠하지 않는다.** 1차 시도에서 `#7FB2F0` 을 강제했더니
> **파란 나무**가 나왔다. 배경의 숲은 초록인데 아이콘은 파랑이라 같은 숲으로 읽히지
> 않는다. 설계서 2장의 「글자 없이도 진행」은 아이콘만으로 사물을 알아본다는 뜻이고,
> Level 1 은 라벨이 아예 없어서 더 중요하다.
> 단계 색 구분은 S-07 하단 칩이 이미 하고 있다.
>
> 실루엣 인물은 사물이 아니라 「누군가」라서 단계 색을 그대로 쓴다.

| id | 라벨 | `{대상}` |
|---|---|---|
| `space` | 우주 | a small round planet with a soft ring |
| `forest` | 숲 | a cluster of three round-topped trees |
| `sea` | 바다 | one gentle rolling wave |
| `school` | 학교 | a small school building with a round clock |
| `town` | 마을 | a few small rooftops close together |
| `cave` | 동굴 | a rounded cave mouth in a soft hill |

### 4.2 실루엣 인물 아이콘 (18장)

```
{스타일 앵커}

One simple rounded human figure, {자세}.
The figure is a flat single-color paper-cutout shape in {단계색} — no shading
inside the shape, no highlights, no gradient, no face, no facial features,
no hair detail, no clothing detail. The pose alone must tell what is
happening. Transparent background. Square composition.
```

> `soft single-tone silhouette` 이라고 썼더니 **3D 오브젝트로 해석됐다.**
> 「종이를 오린 모양」이라고 말해야 평면으로 나온다.

**문제 — `{단계색}` = `#F4909F`**

| id | 라벨 | `{자세}` |
|---|---|---|
| `lost` | 길을 잃었어요 | standing still, head turned, both arms slightly open at the sides |
| `rain` | 비가 내렸어요 | standing with shoulders drawn in, a few soft raindrops falling above |
| `hungry` | 배가 고팠어요 | standing with one hand resting on its stomach |
| `dark` | 어두워졌어요 | standing small beneath a soft crescent moon |
| `fall` | 넘어졌어요 | sitting on the ground, one hand resting beside it |
| `alone` | 혼자가 됐어요 | a single small figure with wide empty space all around it |

**행동 — `{단계색}` = `#74CDAE`**

| id | 라벨 | `{자세}` |
|---|---|---|
| `ask` | 물어봤어요 | one hand raised beside its head, leaning slightly forward |
| `run` | 달려갔어요 | mid-stride, leaning forward, one leg lifted |
| `hide` | 숨었어요 | crouching low behind a soft rounded shape |
| `help` | 도와줬어요 | two figures, one reaching a hand toward the other |
| `wait` | 기다렸어요 | standing still with both hands held together in front |
| `shout` | 크게 불렀어요 | both hands cupped beside its mouth, head tilted up |

**결과 — `{단계색}` = `#F5C46B`**

| id | 라벨 | `{자세}` |
|---|---|---|
| `home` | 집에 갔어요 | walking toward a small rounded house |
| `friend` | 친구를 만났어요 | two figures facing each other, close together |
| `gift` | 선물을 받았어요 | holding a small wrapped box with both hands |
| `sun` | 해가 떴어요 | standing beneath a large round sun |
| `sleep` | 잠이 들었어요 | curled up on its side, resting |
| `party` | 모두 기뻐했어요 | three figures side by side with arms raised |

### 4.3 장면 배경 (24장 = 장소 6 × 분위기 4)

```
{스타일 앵커}

A wide empty {장소} background for a children's story, {분위기}.
Desaturated and soft so a child's own drawing placed on top stays the
clear focus. No characters, no people, no animals, no foreground objects.
The lower third is kept simple and open — a character will stand there.
Horizontal 3:2 composition.
```

`{장소}`는 4.1의 여섯 곳을 그대로 쓴다 (outer space / forest / seaside /
schoolyard / small town / cave interior).

`{분위기}`는 장면 번호에 대응한다. 이야기 흐름이 배경으로도 읽히게 하는 장치다.

| 장면 | 단계 | 모션 | `{분위기}` |
|---|---|---|---|
| 0 | 장소 도착 | `walk` | bright clear daylight, calm and open |
| 1 | 문제 발생 | `look` | overcast and dimmer, cooler light, still gentle |
| 2 | 행동 | `wave` | light beginning to return, warmer than before |
| 3 | 결과 | `jump` | warm golden late-afternoon light |

**1번(문제) 분위기를 무섭게 만들지 않는다.** 어두워지는 정도가 아니라 흐려지는
정도다. `still gentle`을 프롬프트에서 빼지 말 것.

파일 이름은 `bg-{장소id}-{장면번호}.png`로 둔다 (`bg-forest-0.png`).

### 4.4 삽화 6장

```
{스타일 앵커}

{대상}, centered, transparent background, square composition.
```

| 자리 | `{대상}` |
|---|---|
| 캐릭터 | a friendly rounded child-like figure standing, waving one hand, no facial features beyond two simple dots and a small curved smile |
| 그림 종이 | a sheet of white paper with a simple child's drawing on it, slightly tilted |
| 연필 | a short round-tipped pencil, slightly tilted |
| 갸웃하는 얼굴 | a soft round face tilted to one side with a small puzzled expression — curious, never sad |
| 축하 | a small burst of soft rounded confetti shapes |
| 장면 배경 | a simple empty pastel landscape with a low horizon |

갸웃하는 얼굴은 E-01 오류 화면에 쓴다. 설계서 E-01-01이 **「슬픔이 아니라 갸웃하는
표정」**을 요구한다 — 아이가 자기 잘못으로 느끼지 않게 하려는 것이다.

---

## 5. 만드는 순서

**한 번에 54장을 뽑지 않는다.** 화풍이 어긋나면 전부 다시 만들어야 한다.

1. **화풍 확정 (Mini, 3장).** 스타일 앵커로 `forest` 아이콘 1장, `wait` 실루엣 1장,
   `bg-forest-0` 1장을 뽑는다. 종류가 다른 셋이 한 세트로 보이는지가 기준이다.
   통합 정리 문서의 비용 전략대로 **탐색은 Mini로** 한다.
2. **앵커 수정.** 어긋나면 대상 설명이 아니라 **앵커를 고친다.** 그리고 다시 3장.
3. **아이콘 24장.** 앵커 고정. 단계별로 6장씩 묶어 뽑으면 색 일관성을 보기 쉽다.
4. **배경 24장.** 장소 하나당 4장을 연달아 뽑아야 분위기 변화가 이어진다.
5. **삽화 6장.** 화면에 크게 나오므로 이것만 high 품질로 뽑는다.

### 비용

| 항목 | 수량 | 단가 | 합계 |
|---|---|---|---|
| 아이콘 (정사각 medium) | 24 | $0.053 | $1.27 |
| 배경 (가로 medium) | 24 | $0.041 | $0.98 |
| 삽화 (정사각 medium) | 6 | $0.053 | $0.32 |
| **소계** | | | **$2.57** |

탐색과 재시도를 3~5배로 잡아도 $8~13이다. 통합 정리 문서가 A안(라이브러리 재사용)에
잡아 둔 이미지 생성 약 41,000원(≈$27, 환율 1,500원) 안에 넉넉히 들어간다.
배경을 6장이 아니라 24장으로 늘려도 예산이 문제되지 않는다.

단가는 `docs/source` 출처 기준이고 자주 바뀌므로 **뽑기 직전에 다시 확인**한다.

---

## 6. 검수 기준

뽑은 뒤 사람이 본다. 통합 정리 문서가 미리 생성 방식을 고른 이유가 이것이다 —
**사람이 검수할 수 있고 비용이 고정된다.**

- [ ] 104px로 줄였을 때 옆 아이콘과 구분되는가 (실제로 줄여서 본다)
- [ ] 라벨을 가려도 무엇인지 알 수 있는가 (Level 1에는 글자가 없다)
- [ ] 글자·숫자·워터마크가 들어가지 않았는가
- [ ] 실루엣 인물에 얼굴이 생기지 않았는가
- [ ] 문제 단계 6장이 무섭거나 슬프지 않은가
- [ ] 배경 위에 아이 그림을 얹었을 때 아이 그림이 앞에 서는가 (실제로 얹어 본다)
- [ ] 배경 아래 3분의 1이 비어 있는가
- [ ] 24장을 한 화면에 늘어놓았을 때 한 세트로 보이는가

마지막 항목이 가장 중요하다. 한 장씩 보면 다 괜찮아 보이는데 모아 놓으면
따로 노는 경우가 흔하다.

---

## 7. 누가 만들고 누가 서빙하나

**이 둘은 다른 일이다.** 섞으면 역할이 헷갈린다.

### 만드는 일 — 개발 전 준비, 런타임 아님

54장은 **앱이 돌 때 생성하는 것이 아니다.** 개발 시작 전에 한 번 만들어 파일로 둔다.
통합 정리 문서가 A안(라이브러리 재사용)을 고른 것이 이 뜻이고, 매 장면 새로
생성하는 C·D안은 예산이 넘쳐 탈락했다 (D안은 674,500원, 원안이 375,000원).

그래서 **프론트/백엔드 역할 문제가 아니다.** OpenAI 계정이 있는 사람이 로컬에서
뽑아 PNG로 저장하면 끝이고, 그 API 키는 코드 어디에도 들어가지 않는다
(AGENTS.md 3.2의 「API 키는 서버 환경변수에만」과 무관한 작업이다).

고를 일은 **누가 화풍을 검수하느냐**다. 6절 체크리스트를 보는 사람이 필요하고,
그건 화면을 아는 사람 — 프론트·UX 쪽이 맞다. 비용은 팀 공용 OpenAI 선충전
잔액에서 나가므로 누가 뽑든 같은 지갑이다.

### 서빙하는 일 — 백엔드

계약상 두 URL 모두 서버가 내려준다.

| 무엇 | 어디에 실려 오나 |
|---|---|
| `iconUrl` | `GET /api/steps?kind={kind}&level={level}` 응답의 각 선택지 |
| `backgroundUrl` | `POST /api/stories` · `GET /api/stories/{id}` 응답의 `scenes[]` |

**프론트가 파일 목록을 알면 안 된다.** 선택지가 늘거나 배경이 바뀔 때 화면 코드를
고쳐야 하기 때문이다. 서버가 장소 id와 장면 번호로 경로를 만들어 넣는다.

파일을 어디에 두는지는 따로 정하면 된다. 8주 MVP라면 백엔드 정적 디렉터리나
Azure for Students 크레딧 안의 정적 호스팅으로 충분하고, CDN까지 세울 일은 아니다.
서버가 계약대로 URL만 내려주면 프론트는 어디에 있든 상관하지 않는다.

### 목 엔진은 예외 — 개발 중에는 프론트가 들고 있다

`VITE_ENGINE=mock`일 때는 백엔드가 없으므로 프론트가 파일을 직접 참조해야 한다.
개발과 발표 시연이 여기서 돈다.

- `public/icons/{kind}/{id}.png`, `public/bg/bg-{장소id}-{장면번호}.png`에 둔다
  (경로 규칙은 `docs/id-conventions.md` 1절)
- 파일을 다 넣은 뒤 `api/mock/fixtures.ts`의 `USE_REAL_ICONS`·`USE_REAL_BG`를
  `true`로 바꾼다. 그 전까지는 임시 이모지로 돌아간다
- `api/mock/engine.ts`의 `mockGenerate`와 `S09Story.tsx`는 이미 연결해 두었다

백엔드가 준비되면 **같은 파일을 서버에도 올려** 실서버 경로로 내려주면 된다.
프론트 코드는 그대로다.

### 삽화 6장은 프론트 자산이다

`components/illust.tsx`를 통째로 갈아끼운다. 서버를 타지 않는다.
README에 적힌 대로 **이 파일만 바꾸면 되도록** 만들어져 있다.
