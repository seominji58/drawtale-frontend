# 그림 뽑기 — 복사용 프롬프트

ChatGPT 웹에서 수동으로 뽑을 때 쓰는 문서. 화풍 기준과 왜 이렇게 정했는지는
`docs/art-direction.md`에 있다. 여기는 **붙여넣을 글자만** 모아 둔 곳이다.

**대화 하나를 열고 위에서 아래로 내려간다.** 앵커를 한 번 선언해 두면 이후에는
대상만 보내면 되고, 같은 대화 맥락이라 화풍도 덜 흔들린다.

---

## 0. 대화 시작 — 한 번만 보낸다

```
지금부터 아동용 웹앱에 쓸 아이콘과 배경을 만들 거야.
모든 이미지에 아래 스타일 규칙을 똑같이 적용해 줘.
내가 다음부터 대상만 말하면 이 규칙으로 그려 줘.

Soft watercolor storybook painting, rounded and gentle. Completely flat —
no 3D rendering, no volumetric shading, no glossy highlights, no plastic or
clay look. No harsh outlines, no black. Pastel palette sitting on a pale
blue-white base (#E6EEFB). Shadows carry their own hue, never grey. Every
form has generously rounded corners — nothing sharp or angular. Calm and
quiet, low visual noise, still readable as a silhouette at 104 pixels.
Subtle soft paper grain. The subject occupies about 70% of the frame with
generous empty margin around it.
No text, no letters, no numbers, no watermark.

세 가지만 더 지켜 줘.
1. 배경은 투명하게. 흰 사각형이 남으면 안 돼.
2. 사람이 들어가는 그림에는 얼굴을 그리지 마. 자세만으로 상황을 보여줘.
3. 입체적으로 그리지 마. 점토나 3D 피규어처럼 보이면 안 되고,
   종이에 그린 수채화처럼 납작해야 해.

준비됐으면 "네"라고만 답해 줘.
```

> **1차 시도에서 걸린 것** — 실루엣 인물이 점토 피규어처럼 나왔고, 장소 아이콘에
> 단계 색을 강제했더니 파란 나무가 됐다. 위 규칙은 그걸 반영해 고친 것이다.
> 자세한 경위는 `docs/art-direction.md` 3·4.1·4.2절 인용문에 있다.

> **투명 배경이 안 나오면** 흰 배경으로 받은 뒤 따로 지워야 한다. 아이콘은 카드
> 안에서 `--milk` 색 위에 얹히기 때문에, 흰 사각형이 남으면 네모가 그대로 보인다.
> 1단계에서 이것부터 확인할 것.

---

## 1단계 — 화풍 확정 (3장)

**이 셋만 먼저 뽑는다.** 종류가 다른 셋이 한 세트로 보이는지가 유일한 판단 기준이다.
어긋나면 대상 설명이 아니라 **0번 앵커를 고쳐서** 새 대화로 다시 시작한다.

```
1) A single cluster of three round-topped trees centered, nothing else in
frame — no ground line, no scene, no people. Natural colors — green leaves,
warm brown trunk — kept in the same soft pastel range as the rest of the set.
Transparent background. Square composition.
```

```
2) One simple rounded human figure, standing still with both hands held
together in front. The figure is a flat single-color paper-cutout shape in
#74CDAE — no shading inside the shape, no highlights, no gradient, no face,
no facial features, no hair detail, no clothing detail. The pose alone must
tell what is happening. Transparent background. Square composition.
```

```
3) A wide empty forest background for a children's story, bright clear
daylight, calm and open. Desaturated and soft so a child's own drawing placed
on top stays the clear focus. No characters, no people, no animals, no
foreground objects. The lower third is kept simple and open — a character
will stand there. Horizontal 3:2 composition.
```

확인할 것 — 셋이 같은 손에서 나온 것처럼 보이나 · 배경이 투명한가 ·
실루엣에 얼굴이 생기지 않았나 · 글자가 끼어들지 않았나

저장: `public/icons/place/forest.png` · `public/icons/action/wait.png` ·
`public/bg/bg-forest-0.png`

---

## 2단계 — 선택지 아이콘 24장

화풍이 확정된 뒤에 간다. **단계별로 묶어서** 뽑으면 색 일관성을 보기 쉽다.

### 장소 6장 — `public/icons/place/{id}.png`

**자연색을 쓴다.** 단계 색(`#7FB2F0`)을 칠하지 않는다 — 아이가 사물을 알아보는 것이
먼저다. 단계 구분은 S-07 하단 칩이 한다.

뒤에 붙일 공통 문구: `Natural colors, kept in the same soft pastel range as the
rest of the set. Transparent background, square composition.`

| id | 보낼 글자 |
|---|---|
| `space` | `A single small round planet with a soft ring, centered.` + 공통 |
| `forest` | (1단계에서 완료) |
| `sea` | `One gentle rolling wave, centered.` + 공통 |
| `school` | `A small school building with a round clock, centered.` + 공통 |
| `town` | `A few small rooftops close together, centered.` + 공통 |
| `cave` | `A rounded cave mouth in a soft hill, centered.` + 공통 |

### 문제 6장 — `public/icons/problem/{id}.png`

실루엣 색은 `#F4909F`. **무섭거나 슬프게 만들지 않는다.**

| id | 보낼 글자 |
|---|---|
| `lost` | `One simple rounded human figure, standing still with head turned and both arms slightly open at the sides. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. Transparent background, square composition.` |
| `rain` | `One simple rounded human figure standing with shoulders drawn in, a few soft raindrops falling above. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. Transparent background, square composition.` |
| `hungry` | `One simple rounded human figure standing with one hand resting on its stomach. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. Transparent background, square composition.` |
| `dark` | `One simple rounded human figure standing small beneath a soft crescent moon. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. Transparent background, square composition.` |
| `fall` | `One simple rounded human figure sitting on the ground with one hand resting beside it — calm, not distressed. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. Transparent background, square composition.` |
| `alone` | `A single small rounded human figure with wide empty space all around it. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. Transparent background, square composition.` |

### 행동 6장 — `public/icons/action/{id}.png`

실루엣 색은 `#74CDAE`.

| id | 보낼 글자 |
|---|---|
| `ask` | `One simple rounded human figure with one hand raised beside its head, leaning slightly forward. Flat single-color paper-cutout shape in #74CDAE, no shading inside the shape, no face. Transparent background, square composition.` |
| `run` | `One simple rounded human figure mid-stride, leaning forward with one leg lifted. Flat single-color paper-cutout shape in #74CDAE, no shading inside the shape, no face. Transparent background, square composition.` |
| `hide` | `One simple rounded human figure crouching low behind a soft rounded shape. Flat single-color paper-cutout shape in #74CDAE, no shading inside the shape, no face. Transparent background, square composition.` |
| `help` | `Two simple rounded human figures, one reaching a hand toward the other. Flat single-color paper-cutout shapes in #74CDAE, no shading inside the shapes, no faces. Transparent background, square composition.` |
| `wait` | (1단계에서 완료) |
| `shout` | `One simple rounded human figure with both hands cupped beside its mouth, head tilted up. Flat single-color paper-cutout shape in #74CDAE, no shading inside the shape, no face. Transparent background, square composition.` |

### 결과 6장 — `public/icons/result/{id}.png`

실루엣 색은 `#F5C46B`.

| id | 보낼 글자 |
|---|---|
| `home` | `One simple rounded human figure walking toward a small rounded house. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. Transparent background, square composition.` |
| `friend` | `Two simple rounded human figures facing each other, close together. Flat single-color paper-cutout shapes in #F5C46B, no shading inside the shapes, no faces. Transparent background, square composition.` |
| `gift` | `One simple rounded human figure holding a small wrapped box with both hands. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. Transparent background, square composition.` |
| `sun` | `One simple rounded human figure standing beneath a large round sun. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. Transparent background, square composition.` |
| `sleep` | `One simple rounded human figure curled up on its side, resting. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. Transparent background, square composition.` |
| `party` | `Three simple rounded human figures side by side with arms raised. Flat single-color paper-cutout shapes in #F5C46B, no shading inside the shapes, no faces. Transparent background, square composition.` |

---

## 3단계 — 장면 배경 24장

`public/bg/bg-{장소id}-{장면번호}.png`. **장소 하나당 네 장을 연달아** 뽑아야
분위기 변화가 이어진다.

장소 여섯: `space`(outer space) · `forest`(forest) · `sea`(seaside) ·
`school`(schoolyard) · `town`(small town) · `cave`(cave interior)

장면 번호별 분위기 — 뒤에 붙일 글자다.

| 번호 | 분위기 |
|---|---|
| 0 | `bright clear daylight, calm and open` |
| 1 | `overcast and dimmer, cooler light, still gentle` |
| 2 | `light beginning to return, warmer than before` |
| 3 | `warm golden late-afternoon light` |

틀:

```
A wide empty {장소} background for a children's story, {분위기}.
Desaturated and soft so a child's own drawing placed on top stays the clear
focus. No characters, no people, no animals, no foreground objects. The lower
third is kept simple and open — a character will stand there. Horizontal 3:2
composition.
```

**1번(문제)을 무섭게 만들지 않는다.** `still gentle`을 빼지 말 것.

---

## 4단계 — 삽화 6장

`components/illust.tsx`를 갈아끼울 그림이다. 화면에 크게 나오므로 이것만
품질을 높여 뽑는다. 저장 위치는 나중에 정한다 (지금은 SVG 코드라 교체 방식이 다르다).

| 자리 | 보낼 글자 |
|---|---|
| 캐릭터 | `A friendly rounded child-like figure standing and waving one hand. Only two simple dots for eyes and a small curved smile — no other facial detail. Transparent background, square composition.` |
| 그림 종이 | `A sheet of white paper with a simple child's drawing on it, slightly tilted. Transparent background, square composition.` |
| 연필 | `A short round-tipped pencil, slightly tilted. Transparent background, square composition.` |
| 갸웃하는 얼굴 | `A soft round face tilted to one side with a small puzzled expression — curious, never sad. Transparent background, square composition.` |
| 축하 | `A small burst of soft rounded confetti shapes. Transparent background, square composition.` |
| 장면 배경 | `A simple empty pastel landscape with a low horizon. Transparent background, square composition.` |

갸웃하는 얼굴은 E-01 오류 화면에 쓴다. 설계서 E-01-01이 **「슬픔이 아니라 갸웃하는
표정」**을 요구한다 — 아이가 자기 잘못으로 느끼지 않게 하려는 것이다.

---

## 저장하고 확인하기

파일을 `public/` 아래 규칙대로 넣은 뒤 **검수 페이지**를 연다.

```
tools/icon-review.html   ← 더블클릭해서 브라우저로 열면 된다
```

24장을 한 화면에 늘어놓고, 실제 카드 크기와 104px 두 가지로 보여준다.
**한 장씩 보면 다 괜찮은데 모아 놓으면 따로 노는 경우가 흔하다** — 그걸 잡는 용도다.

다 넣었으면 `src/api/mock/fixtures.ts`의 스위치를 켠다.

```ts
const USE_REAL_ICONS = true;
const USE_REAL_BG = true;
```

그 전까지는 임시 이모지로 돌아간다.
