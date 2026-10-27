# 목업 그림 바꾸기 — 교체 목록과 프롬프트

2026-10-27 작성. 화면에 남아 있는 임시 그림(같은 그림 복사본 · 이모지 · 손으로 짠 SVG)을
실제 그림으로 바꾸기 위한 목록이다. 화풍과 제약은 `docs/art-direction.md`,
손으로 뽑는 기존 프롬프트는 `docs/image-prompts.md` 를 그대로 따른다. **새 화풍을 만들지 않는다.**

> 이 문서는 목록과 프롬프트만 정리했다. 그림은 아직 하나도 뽑지 않았고, 유료 API 도 부르지 않았다.

---

## 0. 요약

**새로 뽑을 그림: 확정 23장 + 회의 후 확정 18장 = 최대 41장.**
그 밖에 **S-02 예시 6장은 뽑지 않고 실제 아이 그림을 찍어서** 넣는다 (설계서 요구).

| 우선 | 무엇 | 장수 | 왜 이 순서 |
|---|---|---|---|
| **1** | 결과 카드 | 6 | 지금 6장이 **모두 문제 카드 「길을 잃었어요」 복사본**이다 (분홍색이라 단계 색까지 틀림). 시연에서 바로 보인다 |
| **1** | 행동 카드 | 6 | 지금 6장이 **모두 같은 그림**(한 손을 머리 옆에 올린 자세 = 「물어봤어요」로 보임). 시연에서 바로 보인다 |
| **1** | 삽화 · 손 흔드는 친구 | 1 | S-01 첫 화면, S-04, S-14 에 나온다 |
| 2 | 삽화 · 연필 · 축하 · 그림 종이 | 3 | S-08 · S-11 · S-03 (시연 흐름에 나온다) |
| 2 | S-02 예시 (실제 그림 촬영) | 6 | 생성이 아니다. 팀원이 그려서 찍는다 |
| 3 | 대체 배경 (장소별 1장) | 6 | 실시간 배경 생성이 **실패할 때만** 쓴다. 삽화 「장면 배경」도 이걸로 대신한다 |
| 3 | 삽화 · 갸웃하는 얼굴 | 1 | E-01 오류 화면에서만 나온다 |
| 회의 후 | 인물 6 · 문제 때 기분 6 · 마지막 기분 6 | 18 | 로컬 시험 기능(`RAW_EXTRA`). 회의에서 빠질 수 있다 |

**바꾸지 않는 것**
- 장소 6장 · 문제 6장 — 이미 실제 그림이다 (`public/icons/place/`, `public/icons/problem/`, 512×512 투명 PNG, 파일이 모두 다름).
- `public/brand/` 의 카카오 · 구글 로그인 버튼 — **공식 리소스라 고치면 안 된다** (각 폴더 `README.txt`).
- 미리 만든 장면 배경 24장(장소 6 × 분위기 4) — 10/27 방향이 「장면 배경은 GPT Image 로 실시간 생성(배경 안에 다른 인물도), 아이 그림은 그 위에 겹침」이라 **필요 없을 수 있다**. 대체용 6장만 남겼다.

---

## 1. 교체 목록

크기 · 형식은 이미 들어 있는 실제 아이콘(512×512, RGBA 투명 PNG)에 맞췄다.

### 1.1 확정 23장

| 무엇 | 지금 상태 | 파일 경로 (이 이름 그대로 덮어쓴다) | 크기 | 형식 | 화면 | 우선 | 비고 |
|---|---|---|---|---|---|---|---|
| 행동 · 물어봤어요 | 실제 그림 1장 (아래 5장이 이 복사본) | `public/icons/action/ask.png` | 512×512 | 투명 PNG | S-07 | 1 | 지금 그림도 「물어봤어요」 자세로 보인다. 나머지 5장과 한 세트로 보이게 **같이 다시 뽑기를 권한다**. 그대로 둘지는 팀 판단 |
| 행동 · 달려갔어요 | ask 복사본 | `public/icons/action/run.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 행동 · 숨었어요 | ask 복사본 | `public/icons/action/hide.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 행동 · 도와줬어요 | ask 복사본 | `public/icons/action/help.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 행동 · 기다렸어요 | ask 복사본 | `public/icons/action/wait.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 행동 · 크게 불렀어요 | ask 복사본 | `public/icons/action/shout.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 결과 · 집에 갔어요 | 문제 `lost` 복사본 (분홍) | `public/icons/result/home.png` | 512×512 | 투명 PNG | S-07 | 1 | 결과 색은 노랑 `#F5C46B` |
| 결과 · 친구를 만났어요 | 〃 | `public/icons/result/friend.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 결과 · 선물을 받았어요 | 〃 | `public/icons/result/gift.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 결과 · 해가 떴어요 | 〃 | `public/icons/result/sun.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 결과 · 잠이 들었어요 | 〃 | `public/icons/result/sleep.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 결과 · 모두 기뻐했어요 | 〃 | `public/icons/result/party.png` | 512×512 | 투명 PNG | S-07 | 1 | |
| 삽화 · 손 흔드는 친구 (`Friend`) | 손으로 짠 SVG | 새 파일 제안 `public/illust/friend.png` | 1024×1024 | 투명 PNG | S-01 · S-04(대기) · S-14 | 1 | 화면에 최대 340px. SVG 는 팔을 흔드는 움직임(`wave`)이 있는데, PNG 로 바꾸면 팔 흔들기는 사라진다. S-04 의 둥실거림은 바깥 틀(`.wait .mark`)에 걸려 있어 그대로 남는다 |
| 삽화 · 연필 (`Pencil`) | SVG | `public/illust/pencil.png` | 1024×1024 | 투명 PNG | S-08(대기) | 2 | 대기 화면 200px 원 안에 들어간다 |
| 삽화 · 축하 (`Party`) | SVG | `public/illust/party.png` | 1024×1024 | 투명 PNG | S-11 | 2 | |
| 삽화 · 그림 종이 (`Paper`) | SVG | `public/illust/paper.png` | 1024×1024 | 투명 PNG | S-03(비었을 때) | 2 | **S-02 예시 카드 4장도 지금 이 그림을 쓰지만, S-02 는 아래 1.3 의 실제 그림으로 바꾼다.** 이 삽화는 S-03 빈 자리용이다 |
| 삽화 · 갸웃하는 얼굴 (`Puzzled`) | SVG | `public/illust/puzzled.png` | 1024×1024 | 투명 PNG | E-01 | 3 | 설계서 E-01-01 「슬픔이 아니라 갸웃하는 표정」 |
| 대체 배경 · 우주 | 없음 | `public/bg/bg-space-0.png` | 1536×1024 (3:2) | 불투명 PNG | S-09 | 3 | 실시간 배경 생성 실패 때만. 기존 이름 규칙 `bg-{장소id}-{장면번호}` 의 0번(맑음)을 쓴다 |
| 대체 배경 · 숲 | 없음 | `public/bg/bg-forest-0.png` | 1536×1024 | 불투명 PNG | S-09 | 3 | 이 장은 삽화 「장면 배경」(`Scene`) 대신으로도 쓴다 |
| 대체 배경 · 바다 | 없음 | `public/bg/bg-sea-0.png` | 1536×1024 | 불투명 PNG | S-09 | 3 | |
| 대체 배경 · 학교 | 없음 | `public/bg/bg-school-0.png` | 1536×1024 | 불투명 PNG | S-09 | 3 | |
| 대체 배경 · 마을 | 없음 | `public/bg/bg-town-0.png` | 1536×1024 | 불투명 PNG | S-09 | 3 | |
| 대체 배경 · 동굴 | 없음 | `public/bg/bg-cave-0.png` | 1536×1024 | 불투명 PNG | S-09 | 3 | |

- **삽화 「장면 배경」(`Scene`)은 따로 뽑지 않는다.** S-09 에서 영상도 그림도 없을 때만 나오는 자리라, 대체 배경 `bg-forest-0.png` 를 그대로 쓰면 된다. (기존 `image-prompts.md` 4단계는 이 자리를 「투명 · 정사각」으로 적었지만, 실제 자리는 가로 무대다.)
- 삽화 저장 위치 `public/illust/` 는 제안이다. 기존 문서는 「나중에 정한다」로 남겨 두었다.
- 1536×1024 는 GPT Image 가 내는 가로 크기로 알고 있으나 **지금 다시 확인하지는 못했다.** 3:2 만 지키면 된다.

### 1.2 회의 후 확정 18장 (로컬 시험 `RAW_EXTRA`)

지금 작업 트리에서 이 코드가 잠시 치워져 있어 **코드로는 확인하지 못했고**, 받은 목록대로 적었다.
지금은 이모지 임시다. 경로는 `public/icons/{who|feelProblem|feelResult}/{id}.png` 로 제안한다.

| 무엇 | id | 파일 경로 | 크기 · 형식 | 우선 |
|---|---|---|---|---|
| 인물 · 친구 | `friend` | `public/icons/who/friend.png` | 512×512 투명 PNG | 회의 후 |
| 인물 · 강아지 | `dog` | `public/icons/who/dog.png` | 〃 | 회의 후 |
| 인물 · 엄마 | `mom` | `public/icons/who/mom.png` | 〃 | 회의 후 |
| 인물 · 아빠 | `dad` | `public/icons/who/dad.png` | 〃 | 회의 후 |
| 인물 · 토끼 | `rabbit` | `public/icons/who/rabbit.png` | 〃 | 회의 후 |
| 인물 · 공룡 | `dino` | `public/icons/who/dino.png` | 〃 | 회의 후 |
| 문제 때 기분 · 무서웠어요 | `scared` | `public/icons/feelProblem/scared.png` | 〃 | 회의 후 |
| 문제 때 기분 · 슬펐어요 | `sad` | `public/icons/feelProblem/sad.png` | 〃 | 회의 후 |
| 문제 때 기분 · 걱정됐어요 | `worried` | `public/icons/feelProblem/worried.png` | 〃 | 회의 후 |
| 문제 때 기분 · 놀랐어요 | `surprised` | `public/icons/feelProblem/surprised.png` | 〃 | 회의 후 |
| 문제 때 기분 · 궁금했어요 | `curious` | `public/icons/feelProblem/curious.png` | 〃 | 회의 후 |
| 문제 때 기분 · 화났어요 | `angry` | `public/icons/feelProblem/angry.png` | 〃 | 회의 후 |
| 마지막 기분 · 기뻤어요 | `happy` | `public/icons/feelResult/happy.png` | 〃 | 회의 후 |
| 마지막 기분 · 신났어요 | `excited` | `public/icons/feelResult/excited.png` | 〃 | 회의 후 |
| 마지막 기분 · 뿌듯했어요 | `proud` | `public/icons/feelResult/proud.png` | 〃 | 회의 후 |
| 마지막 기분 · 고마웠어요 | `thankful` | `public/icons/feelResult/thankful.png` | 〃 | 회의 후 |
| 마지막 기분 · 졸렸어요 | `sleepy` | `public/icons/feelResult/sleepy.png` | 〃 | 회의 후 |
| 마지막 기분 · 아쉬웠어요 | `sorry` | `public/icons/feelResult/sorry.png` | 〃 | 회의 후 |

회의에서 같이 정할 것:
1. **기분 카드와 「얼굴 없이」 규칙이 부딪힌다.** `art-direction.md` 2절 4번은 얼굴 · 표정을 넣지 않고 자세만으로 말하게 한다. 아래 프롬프트는 이 규칙대로 **자세만으로** 기분을 보이게 썼다. 얼굴 표정 카드로 가려면 규칙을 바꾸는 팀 결정이 먼저다.
2. **무서웠어요 · 슬펐어요 · 화났어요는 「부정 표현을 쓰지 않는다」(2절 5번)와도 닿는다.** 프롬프트는 부드럽게 썼지만, 이 세 장을 카드로 둘지 자체를 정해야 한다.
3. **엄마 · 아빠를 얼굴 없이 구분하면 머리 모양 · 옷에 기대게 된다.** 성 고정관념, 그리고 엄마 · 아빠가 없는 아이에게 어떻게 보일지 함께 본다.
4. **색.** 인물 · 기분 칸의 단계 색이 아직 없다. 아래는 제안이다 — 동물 · 공룡은 장소처럼 자연색, 사람은 실루엣 색 `{WHO_COLOR}`(미정), 문제 때 기분은 문제 색 `#F4909F`, 마지막 기분은 결과 색 `#F5C46B`.
5. **폴더 이름.** `docs/id-conventions.md` 는 단계 kind 를 「소문자」로 정했다. `feelProblem` 처럼 대문자가 섞이면 규칙과 어긋나고, Windows(대소문자 구분 안 함)에서는 되다가 리눅스 서버에서 깨질 수 있다. 받은 제안대로 적었지만 `feel-problem` · `feel-result` 같은 소문자 이름도 고려한다.

### 1.3 S-02 예시 — 뽑지 않고 실제 그림을 찍는다 (6장)

설계서 `05-screen-spec.md` 6.2: **「예시 그림은 생성 이미지가 아니라 실제로 돌려 본 그림에서 고른다 (모델이 실제로 성공 · 실패하는 조건을 보여 주는 기능이기 때문이다)」.** `art-direction.md` 1절도 같은 말이다. 동의 문제를 피하려면 팀원이 직접 그려 같은 조건으로 찍는다.

| 요소 | 무엇 | 이름표 | 파일 제안 | 지금 코드 |
|---|---|---|---|---|
| S-02-02 | 사람 한 명 | 좋아요 | `public/guide/one-person.jpg` | 카드 있음, 그림은 `Paper` 삽화 |
| S-02-03 | 흰 종이 | 좋아요 | `public/guide/white-paper.jpg` | 〃 |
| S-02-04 | 팔다리 띄우기 | 이러면 더 잘 움직여요 | `public/guide/limbs-apart.jpg` | 〃 |
| S-02-05 | 여러 명 | 아직 어려워요 (Level 1 숨김) | `public/guide/many-people.jpg` | 〃 |
| S-02-07 | 두 발로 선 동물 | 좋아요 | `public/guide/biped-animal.jpg` | **카드 없음** (설계서 v0.4 추가분, 코드에 아직 없음) |
| S-02-08 | 네 발로 선 동물 | 아직 어려워요 (Level 1 숨김) | `public/guide/quadruped-animal.jpg` | **카드 없음** |

- 「좋아요」 그림은 **실제로 캐릭터가 만들어진 그림**, 「아직 어려워요」 그림은 **실제로 안 된 그림**이어야 한다. 찍은 그림을 한 번씩 돌려 보고 넣는다.
- 크기 · 형식은 정하지 않았다. 사진이라 JPG 가 맞고, 카드 안에서 최대 340px 정도라 긴 변 800px 정도면 충분하다.

---

## 2. 붙여넣을 프롬프트

### 2.0 대화 시작 — 한 번만 (기존 `image-prompts.md` 0번 그대로)

ChatGPT 웹에서 **대화 하나를 열고** 이것부터 보낸다. 이후에는 아래 대상 문장만 보낸다.
API 로 뽑을 때는 대화가 이어지지 않으니 **매번 아래 앵커 문단 + 대상 문장**을 붙여 보낸다 (`art-direction.md` 3절).

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

**화풍 맞추기 먼저.** 이미 있는 장소 · 문제 아이콘과 한 세트로 보여야 한다. 새 대화라면 첫 장을 뽑기 전에
`public/icons/problem/lost.png` 와 `public/icons/place/forest.png` 를 올리고 「이 두 장과 같은 화풍으로」라고 한 줄 붙이면 덜 흔들린다
(이 방법은 기존 문서에 없는 제안이다).

모든 실루엣 문장 끝에는 기존 문서와 같은 꼬리말을 붙였다:
`Flat single-color paper-cutout shape in {색}, no shading inside the shape, no face. Transparent background, square composition.`
여기에 이번에 **`No logos, no brand marks.`** 만 더했다.

### 2.1 행동 6장 — 색 `#74CDAE`

**한눈에 구분하는 열쇠** — 기존 자세 문장은 그대로 두고, 104px 에서도 갈리도록 작은 소품 하나씩만 더했다.
같은 단계 6장이 모두 「서 있는 사람 하나」면 Level 3 에서 서로 헷갈린다.

| id | 구분 열쇠 |
|---|---|
| `ask` | 한 손 + **빈 말풍선** |
| `run` | **몸이 크게 기울어진 대각선** + 뒤로 흐르는 선 |
| `hide` | **둥근 덤불 뒤**, 머리 꼭대기만 보임 |
| `help` | **두 사람**, 앉은 사람을 일으켜 줌 |
| `wait` | **곧게 선 정지 자세** + 작은 모래시계 |
| `shout` | **두 손을 입가에** + 퍼지는 둥근 소리 물결 |

`ask` — 물어봤어요
```
One simple rounded human figure with one hand raised beside its head, leaning slightly forward, as if asking someone a question. A small empty rounded speech bubble floats near the head — completely empty inside, no marks, no symbols. Flat single-color paper-cutout shape in #74CDAE, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

`run` — 달려갔어요
```
One simple rounded human figure running mid-stride, body leaning strongly forward on a diagonal, one leg stretched back and the other knee lifted, arms swinging. Two or three short soft curved lines trail behind it to show speed. Flat single-color paper-cutout shape in #74CDAE, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

`hide` — 숨었어요
```
One simple rounded human figure crouching low behind a large soft rounded bush, so that only the top of its head and one hand peek out above the bush. The bush is a soft pastel green in the same watercolor style. Flat single-color paper-cutout shape in #74CDAE for the figure, no shading inside the shape, no face. Playful, like hide-and-seek, not scared. No logos, no brand marks. Transparent background, square composition.
```

`help` — 도와줬어요
```
Two simple rounded human figures: one is sitting on the ground, the other stands beside it and reaches down to take its hand and help it stand up. Flat single-color paper-cutout shapes in #74CDAE, no shading inside the shapes, no faces. Kind and gentle. No logos, no brand marks. Transparent background, square composition.
```

`wait` — 기다렸어요
```
One simple rounded human figure standing perfectly still and upright, both hands held together in front, next to a small soft rounded hourglass. The hourglass is a pale pastel shape in the same watercolor style. Flat single-color paper-cutout shape in #74CDAE for the figure, no shading inside the shape, no face. Calm and patient. No logos, no brand marks. Transparent background, square composition.
```

`shout` — 크게 불렀어요
```
One simple rounded human figure with both hands cupped beside its mouth, head tilted up, calling out loudly. Three soft rounded curved arcs spread outward from the hands like sound waves — arcs only, no letters, no symbols. Flat single-color paper-cutout shape in #74CDAE, no shading inside the shape, no face. Cheerful, not angry. No logos, no brand marks. Transparent background, square composition.
```

### 2.2 결과 6장 — 색 `#F5C46B`

| id | 구분 열쇠 | 헷갈리기 쉬운 짝 |
|---|---|---|
| `home` | **작은 집**을 향해 걷기 | — |
| `friend` | **두 사람이 손잡고 마주 봄** | `help`(한 명은 앉아 있음) · `party`(세 명, 팔 위로) |
| `gift` | **리본 달린 상자**를 두 손으로 | — |
| `sun` | **화면 위쪽 큰 해** + 팔 벌림 | 문제 `dark`(초승달) |
| `sleep` | **누워서 웅크림** + 베개 · 이불, 달 없음 | 문제 `dark` |
| `party` | **세 사람 모두 팔 위로** + 둥근 색종이 | `friend` |

`home` — 집에 갔어요
```
One simple rounded human figure walking toward a small rounded house with a warm glowing window. The house uses soft natural pastel colors in the same watercolor style. Flat single-color paper-cutout shape in #F5C46B for the figure, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

`friend` — 친구를 만났어요
```
Two simple rounded human figures standing close together, facing each other and holding hands. Flat single-color paper-cutout shapes in #F5C46B, no shading inside the shapes, no faces. Warm and friendly. No logos, no brand marks. Transparent background, square composition.
```

`gift` — 선물을 받았어요
```
One simple rounded human figure holding up a small wrapped gift box with a ribbon bow in both hands. The box is soft pastel pink with a pale ribbon, in the same watercolor style. Flat single-color paper-cutout shape in #F5C46B for the figure, no shading inside the shape, no face. No logos, no brand marks, no writing on the box. Transparent background, square composition.
```

`sun` — 해가 떴어요
```
One simple rounded human figure standing with both arms opened wide beneath a large round warm sun with short rounded rays. The sun fills the upper part of the frame and is a slightly deeper warm orange than the figure so the two stay separate. Flat single-color paper-cutout shape in #F5C46B for the figure, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

`sleep` — 잠이 들었어요
```
One simple rounded human figure lying curled up on its side on a small soft pillow, with a rounded blanket shape over it, resting peacefully. No moon, no stars. The pillow and blanket are pale pastel shapes in the same watercolor style. Flat single-color paper-cutout shape in #F5C46B for the figure, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

`party` — 모두 기뻐했어요
```
Three simple rounded human figures side by side, all with both arms raised high, a few soft rounded confetti dots in pastel colors floating around them. Flat single-color paper-cutout shapes in #F5C46B, no shading inside the shapes, no faces. No logos, no brand marks. Transparent background, square composition.
```

### 2.3 삽화 5장 (기존 `image-prompts.md` 4단계 그대로)

화면에 크게(최대 340px) 나오므로 이것만 품질을 높여 뽑는다. 캐릭터와 갸웃하는 얼굴은 설계서가 표정을 요구하는 자리라
(S-01-02 「손 흔드는 캐릭터」, E-01-01 「갸웃하는 표정」) **점 두 개 + 작은 곡선** 수준만 허용한다. 실제 사람 얼굴처럼 그리지 않는다.

`friend.png` — 손 흔드는 친구 (S-01 · S-04 · S-14)
```
A friendly rounded child-like figure standing and waving one hand. Only two simple dots for eyes and a small curved smile — no other facial detail. No logos, no brand marks. Transparent background, square composition.
```

`paper.png` — 그림 종이 (S-03 빈 자리)
```
A sheet of white paper with a simple child's drawing on it, slightly tilted. No letters or writing on the paper. Transparent background, square composition.
```

`pencil.png` — 연필 (S-08 대기)
```
A short round-tipped pencil, slightly tilted. No logos, no brand marks, no writing on the pencil. Transparent background, square composition.
```

`party.png` — 축하 (S-11)
```
A small burst of soft rounded confetti shapes. Transparent background, square composition.
```

`puzzled.png` — 갸웃하는 얼굴 (E-01)
```
A soft round face tilted to one side with a small puzzled expression — curious, never sad. Only simple dots for eyes and a small mouth. Transparent background, square composition.
```

### 2.4 대체 배경 6장 (기존 3단계 틀 + 분위기 0번)

실시간 배경 생성이 실패했을 때 깔 배경이다. 10/27 방향의 실시간 배경은 배경 안에 다른 인물을 넣지만,
**대체 배경에는 아무도 넣지 않는다** — 어느 이야기에 깔려도 어긋나지 않아야 하기 때문이다.
「투명하게」 규칙은 배경에는 적용하지 않는다 (불투명). ChatGPT 웹에서는 문장 앞에 「이건 배경이라 투명하지 않게」라고 한 줄 붙인다.

틀 (`{장소}` 만 바꾼다):
```
A wide empty {장소} background for a children's story, bright clear daylight, calm and open. Desaturated and soft so a child's own drawing placed on top stays the clear focus. No characters, no people, no animals, no foreground objects. The lower third is kept simple and open — a character will stand there. No text, no signs, no logos. Horizontal 3:2 composition, not transparent.
```

| 파일 | `{장소}` |
|---|---|
| `bg-space-0.png` | outer space |
| `bg-forest-0.png` | forest |
| `bg-sea-0.png` | seaside |
| `bg-school-0.png` | schoolyard |
| `bg-town-0.png` | small town |
| `bg-cave-0.png` | cave interior |

학교 · 마을은 간판 글자가 끼어들기 쉽다. `No text, no signs` 를 빼지 말 것.

### 2.5 회의 후 확정 18장

결정이 나면 쓴다. 1.2 의 「회의에서 같이 정할 것」을 먼저 본다.

**인물 6장** — 동물 · 공룡은 장소처럼 자연색, 사람은 실루엣. `{WHO_COLOR}` 는 미정이다.

`friend` — 친구
```
One simple rounded child-sized human figure standing and waving one hand in greeting. Flat single-color paper-cutout shape in {WHO_COLOR}, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

`mom` — 엄마
```
One simple rounded adult human figure, taller than a child, standing with arms slightly open in a welcoming way, hair gathered in a soft rounded bun. Flat single-color paper-cutout shape in {WHO_COLOR}, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

`dad` — 아빠
```
One simple rounded adult human figure, taller than a child, standing with one hand raised in a friendly wave, short rounded hair and broad rounded shoulders. Flat single-color paper-cutout shape in {WHO_COLOR}, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

`dog` — 강아지
```
A single small friendly puppy seen from the side, sitting, with floppy rounded ears and a short wagging tail. Natural soft colors — warm light brown — kept in the same soft pastel range as the rest of the set. Simple shape, no detailed facial features. No logos, no brand marks. Transparent background, square composition.
```

`rabbit` — 토끼
```
A single small rabbit seen from the side, sitting, with two long upright rounded ears and a round fluffy tail. Natural soft colors — white with pale pink inner ears — kept in the same soft pastel range as the rest of the set. Simple shape, no detailed facial features. No logos, no brand marks. Transparent background, square composition.
```

`dino` — 공룡
```
A single small friendly baby dinosaur seen from the side, standing on four legs, with soft rounded plates along its back and a short thick tail. Natural soft colors — pastel green — kept in the same soft pastel range as the rest of the set. Cute and gentle, not scary, no teeth, no claws, no detailed facial features. No logos, no brand marks. Transparent background, square composition.
```

**문제 때 기분 6장** — 색 제안 `#F4909F`. 모두 「무섭거나 슬퍼 보이지 않게, 부드럽게」.

| id | 자세 (구분 열쇠) |
|---|---|
| `scared` 무서웠어요 | 몸을 작게 웅크리고 두 손을 가슴 앞에 |
| `sad` 슬펐어요 | 고개 숙이고 어깨가 처짐 + 작은 눈물방울 하나 |
| `worried` 걱정됐어요 | 두 손을 턱 밑에 모으고 고개를 갸웃 |
| `surprised` 놀랐어요 | 몸을 뒤로 젖히고 두 팔을 번쩍 |
| `curious` 궁금했어요 | 허리를 숙여 땅의 작은 돌을 들여다봄 |
| `angry` 화났어요 | 팔짱 끼고 발을 벌려 섬 + 머리 위 작은 김 |

```
scared — One simple rounded human figure crouching small with both hands held close to its chest and shoulders drawn up, leaning slightly back. Gentle and soft, not distressed, nothing frightening in the frame. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
sad — One simple rounded human figure standing with head bowed and shoulders drooping, arms hanging loosely, one small soft rounded teardrop shape beside the head. Quiet and gentle, not dramatic. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
worried — One simple rounded human figure standing with both hands clasped together under its chin, head tilted to one side. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
surprised — One simple rounded human figure leaning back with both arms flung up and fingers spread, one foot lifted, a few short soft lines around the head. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
curious — One simple rounded human figure bending forward to look closely at a small round pebble on the ground, one hand resting on its knee. The pebble is a pale pastel shape. Flat single-color paper-cutout shape in #F4909F for the figure, no shading inside the shape, no face. No question marks, no symbols. No logos, no brand marks. Transparent background, square composition.
```
```
angry — One simple rounded human figure standing with arms crossed and feet planted apart, a small soft rounded puff of steam above its head. Mild and a little grumpy, not aggressive, no fists. Flat single-color paper-cutout shape in #F4909F, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

**마지막 기분 6장** — 색 제안 `#F5C46B`.

| id | 자세 (구분 열쇠) | 헷갈리기 쉬운 짝 |
|---|---|---|
| `happy` 기뻤어요 | 혼자, 두 팔을 활짝 옆으로 | 결과 `sun` · `party` |
| `excited` 신났어요 | **두 발이 땅에서 뜬 점프** | 결과 `party` |
| `proud` 뿌듯했어요 | 두 손을 허리에, 가슴을 폄 | — |
| `thankful` 고마웠어요 | 두 손을 모으고 살짝 숙여 인사 | 행동 `wait` |
| `sleepy` 졸렸어요 | **선 채로** 한 팔 뻗어 기지개 | 결과 `sleep`(누움) |
| `sorry` 아쉬웠어요 | 걸어가며 어깨 너머로 돌아보고 손 흔듦 | — |

```
happy — One simple rounded human figure standing alone with both arms opened wide to the sides and head tilted up, a few tiny soft rounded sparkles nearby. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
excited — One simple rounded human figure jumping in the air with both feet off the ground and both arms up, a few short soft curved lines below its feet. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
proud — One simple rounded human figure standing tall with both hands on its hips, chest out and chin slightly lifted. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
thankful — One simple rounded human figure bowing slightly forward with both hands placed together in front of its chest, as if saying thank you. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
sleepy — One simple rounded human figure standing, one arm stretched up in a big sleepy stretch and the other hand raised to its eye area, head tilted. Standing, not lying down. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```
```
sorry — One simple rounded human figure walking away while looking back over its shoulder and gently waving one hand, as if it wished it could stay longer. Flat single-color paper-cutout shape in #F5C46B, no shading inside the shape, no face. No logos, no brand marks. Transparent background, square composition.
```

---

## 3. 만드는 방법 두 가지

| | (a) ChatGPT 웹에서 손으로 | (b) GPT Image API |
|---|---|---|
| 돈 | **API 비용 없음.** 팀 구독 안에서 끝난다. 다만 구독의 이미지 생성 횟수 제한이 있는지는 **확인하지 못했다** | 장당 과금. **공식 가격은 이번에 확인하지 못했다 — 뽑기 직전에 확인 필요.** (`art-direction.md` 5절에 예전 단가 기록이 있으나 출처가 `docs/source` 이고 「자주 바뀌니 다시 확인」이라고 적혀 있다) |
| 장수 | 같음 | 확정 23장 (행동 6 · 결과 6 · 삽화 5 · 대체 배경 6), 회의 후 +18장 = 최대 41장. 다시 뽑기를 3~5배로 잡으면 확정분 69~115번, 전부면 123~205번 호출 |
| 시간 | 느리다. 한 장씩 보내고 받고, 내려받아 이름을 바꿔 저장한다. 23장이면 반나절 정도로 짐작 (재 보지 않았다) | 스크립트 한 번이면 빠르다. 대신 스크립트를 짜고 키를 다루는 준비가 든다 |
| 일관성 | **대화 하나에 앵커를 한 번 선언**하면 맥락이 이어져 덜 흔들린다. 대신 대화가 길어지면 앞 규칙을 잊는 일이 있다 | 매번 앵커를 붙여 보내므로 규칙은 빠지지 않는다. 대신 앞 그림을 「기억」하지 않아 장마다 조금씩 달라질 수 있다 |
| 투명 배경 | 가끔 흰 배경으로 나온다. 그러면 따로 지워야 한다 (`image-prompts.md` 0번 주의) | 투명 배경 옵션이 있는 것으로 알고 있으나 **확인 필요** |
| 검수 | 사람이 한 장씩 보며 바로 다시 뽑는다 | 한꺼번에 뽑고 나중에 본다. 「한 장씩은 괜찮은데 모으면 따로 논다」를 놓치기 쉽다 |

**권하는 순서:** (a) 로 간다. 확정분이 23장뿐이라 API 준비 시간이 더 든다.
(b) 를 쓸 때는 **호출 전에 모델 · 장수 · 예상 금액을 말하고 허락받는다**(팀 규칙). 작은 모델로 몇 장 먼저 보고, 같은 프롬프트를 반복해 돌리지 않는다.
API 키는 프론트 코드에 넣지 않는다 (`AGENTS.md` 3.2).

어느 쪽이든 **한 번에 다 뽑지 않는다** (`art-direction.md` 5절).
1. 행동 `wait` 1장 + 결과 `home` 1장을 먼저 뽑아 기존 `problem/lost.png` · `place/forest.png` 옆에 놓고 한 세트로 보이는지 본다.
2. 맞으면 행동 · 결과를 **단계별로 6장씩 묶어** 뽑는다.
3. 삽화 5장, 대체 배경 6장 순서.

---

## 4. 바꾼 뒤 확인할 것

### 4.1 코드에서 바꿀 곳

| 무엇 | 어디 | 할 일 |
|---|---|---|
| 행동 · 결과 12장 | `public/icons/action/`, `public/icons/result/` | **파일만 같은 이름으로 덮어쓴다. 코드는 그대로.** 스위치 `USE_REAL_ICONS` 는 이미 `true` 다. 위치는 `src/features/story/choices.ts` 22행 (`image-prompts.md` · `public/icons/README.md` 는 `src/api/mock/fixtures.ts` 라고 적혀 있는데 옛 위치다) |
| 브라우저 캐시 | — | `public/` 파일은 이름에 해시가 붙지 않아 같은 이름으로 덮으면 옛 그림이 보일 수 있다. 강력 새로고침으로 확인한다 |
| 인물 · 기분 18장 | `choices.ts` 의 `RAW_EXTRA` | 이모지 → `/icons/{kind}/{id}.png`. 지금 `CHOICES` 는 `RAW` 만 `USE_REAL_ICONS` 로 바꾸므로, `RAW_EXTRA` 에도 같은 방식이 걸리는지 본다 (코드를 지금 볼 수 없어 확인 못 함) |
| 삽화 5장 | `src/components/illust.tsx` | 각 함수 안의 `<svg>` 를 `<img src="/illust/friend.png" className="illust" alt="" />` 처럼 바꾼다. **함수 이름과 인자(`Friend` 의 `wave`)는 남겨 두면** 쓰는 화면(S-01 · S-02 · S-03 · S-04 · S-08 · S-11 · S-14 · E-01)을 안 고쳐도 된다. `wave` 는 PNG 에서는 의미가 없어진다. 맨 위 같은 주석이 두 번 들어가 있으니 하나 지운다 |
| 삽화 「장면 배경」 | `illust.tsx` 의 `Scene` | `<img src="/bg/bg-forest-0.png">` 로 바꾸거나 SVG 를 그대로 둔다. 쓰는 곳은 `S09Story.tsx` 68행 · 191행 (영상도 그림도 없을 때만) |
| S-02 예시 | `src/screens/S02Guide.tsx` | 카드마다 같은 `<Paper />` 를 쓰고 있다. `CARDS` 에 그림 경로를 하나씩 붙여 `<img>` 로 바꾼다. 설계서의 S-02-07 · S-02-08 카드 2장은 **아직 코드에 없다** |
| 대체 배경 | — | **지금 코드에 연결된 곳이 없다.** `USE_REAL_BG` 스위치도 `src` 에서 찾지 못했다 (문서에만 남아 있음). 실시간 배경을 서버 렌더 영상 안에 넣을지, 프론트가 뒤에 깔지가 정해져야 대체 배경을 어디서 고를지 정해진다 (설계서 9장 「장면 배경」 미결정) |

### 4.2 그림 검수 (`art-direction.md` 6절 + 이번에 더한 것)

- [ ] **`tools/icon-review.html`** 을 열어 24장을 한 화면에 놓고 본다. 실제 카드 크기와 104px 를 같이 보여 준다. (인물 · 기분이 들어가면 이 파일의 `KINDS` 에도 추가해야 보인다)
- [ ] **104px · 100px(좁은 화면)** 으로 줄였을 때 옆 카드와 구분되는가. 특히 2.1 · 2.2 · 2.5 의 「헷갈리기 쉬운 짝」
- [ ] **Level 1 (라벨 없음, 카드 2장, 아이콘 160px)** 에서 그림만으로 무엇인지 아는가. 라벨을 가리고 팀원에게 맞혀 보게 한다
- [ ] 흑백으로 바꿔도 구분되는가 (색이 아니라 모양으로 구분 — `AGENTS.md` 3.5)
- [ ] **대비.** 카드 위쪽 바탕은 `--milk #E6EEFB` 다. 직접 계산해 보니 실루엣 색과의 대비가 낮다 — 결과 `#F5C46B` 1.38 : 1, 행동 `#74CDAE` 1.62 : 1, 문제 `#F4909F` 1.93 : 1 (그림 요소 권장 기준 3 : 1 에 못 미침). 고른 카드 바탕 `--butter #FFEA99` 위에서는 노랑이 1.35 : 1 로 더 낮다. 이미 들어간 문제 카드도 같은 조건이라 지금 규칙을 깬 것은 아니지만, **노란 결과 카드가 고른 상태에서 묻히는지 실제 화면에서 본다.** 묻히면 실루엣만 같은 색조로 한 단계 진하게 뽑는 방법이 있다 (화풍 변경이라 팀 판단)
- [ ] 투명 배경에 흰 네모가 남지 않았는가 (카드 바탕 위에 얹어 본다)
- [ ] 글자 · 숫자 · 워터마크 · 상표가 없는가 (말풍선 · 상자 · 연필 · 간판에 특히 잘 끼어든다)
- [ ] 실루엣에 얼굴이 생기지 않았는가
- [ ] 문제 · 기분 카드가 무섭거나 슬프지 않은가
- [ ] 결과 카드가 **노랑**인가 (지금 복사본은 분홍이다)
- [ ] 파일 크기. 기존 장소 아이콘이 75~262KB 다. 비슷하게 맞춘다
- [ ] 대체 배경 위에 아이 그림을 얹었을 때 아이 그림이 앞에 서는가, 아래 3분의 1이 비었는가
- [ ] 코드를 고쳤으면 `npm run typecheck`, 목 엔진으로 S-01 ~ S-11 을 끝까지 돌려 본다

---

## 확인하지 못한 것

- `RAW_EXTRA` 코드 — 작업 트리에서 잠시 치워져 있어 직접 보지 못했다. 18장 목록 · 경로는 받은 내용대로 적었다.
- GPT Image 공식 가격, 투명 배경 옵션, 1536×1024 크기 — 이번에 다시 확인하지 않았다.
- ChatGPT 구독의 이미지 생성 횟수 제한.
- 대체 배경을 어디에 연결할지 — 실시간 배경이 어디서 합쳐지는지(서버 렌더 / 프론트)가 아직 정해지지 않았다.
- S-03 빈 자리(`Paper`)가 시연 흐름에 실제로 나오는지 — 사진 올리기가 꺼진 기본 설정에서 S-03 을 거치는지 화면을 돌려 보지 않았다.
