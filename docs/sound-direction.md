# 소리 기준

VARCO Sound(NC AI)로 만들 **효과음 6개**의 기준과 프롬프트.
그림은 [art-direction.md](art-direction.md), 어느 장면에 쓰는지는
pt_docs [03 5.4](https://github.com/seominji58/drawtale-pt_docs/blob/main/03-feature-spec.md) 에 있다.

> **미리 만들어 파일로 넣는다.** 서비스가 돌 때 소리를 만들지 않는다.
> 아이 자료가 바깥으로 나가지 않고, 크레딧이 사용량에 비례하지 않고,
> 아이가 들을 소리라 **사람이 들어 보고 고를 수 있다.**

---

## 1. 만들 것

| id | 언제 | 길이 | 느낌 |
|---|---|---|---|
| `tap` | 카드를 고를 때 | **0.2초** | 가볍게 톡. 하루에 수십 번 듣는다 |
| `done` | 네 칸을 다 채웠을 때 | 0.8초 | 밝게 올라가는 두세 음 |
| `page` | 장면을 넘길 때 | 0.5초 | 두꺼운 종이를 넘기는 소리 |
| `down` | ② 문제 장면 | 1.0초 | **가라앉는 느낌.** 무섭지 않게 |
| `up` | ④ 결과 장면 | 1.2초 | **밝아지는 느낌.** 해가 드는 듯 |
| `clear` | 순서 맞추기를 맞췄을 때 | 1.5초 | 작은 축하. 팡파르까지는 가지 않는다 |

**`down` 과 `up` 이 이 여섯 개의 핵심이다.** 긍정 · 부정을
**색(파랑 · 노랑) · 동작(좌절 · 점프) · 소리** 셋으로 겹쳐 두는 마지막 단서다.
글자를 읽지 못해도 이야기가 어디로 가는지 느끼게 하려는 것이다.

## 2. 지켜야 할 것

| | 왜 |
|---|---|
| **놀라게 하지 않는다** | 갑자기 커지는 소리, 날카로운 고음(4kHz 위), 쇠 긁는 소리를 쓰지 않는다. 소리에 예민한 아이가 있다 |
| **실패를 벌처럼 들리게 하지 않는다** | `down` 은 「틀렸다」가 아니라 「이야기가 가라앉았다」는 소리다. 삑 소리, 낮은 부저를 쓰지 않는다 |
| **여러 번 들어도 거슬리지 않는다** | `tap` 은 한 번 쓰는 동안 수십 번 난다. 꼬리를 짧게 끊는다 |
| **말소리를 덮지 않는다** | 읽어 주기와 겹친다. 효과음은 **읽어 주는 소리보다 낮게** 둔다 |
| **사람 목소리를 넣지 않는다** | 「와!」 같은 소리는 넣지 않는다. 읽어 주는 목소리와 섞여 혼란스럽다 |
| **악기 티가 강한 소리를 피한다** | 한 악기가 도드라지면 BGM 처럼 들린다. BGM 은 아직 넣지 않기로 했다 |

## 3. VARCO Sound 프롬프트

길이와 「아이용」 조건을 매번 같이 넣는다. 한 자리마다 **3~4개를 만들어 듣고 하나를 고른다.**

```
tap     A very short, soft wooden tap. Gentle, rounded, no metallic ring.
        0.2 seconds. Child-friendly UI click. Quiet.

done    A short, bright three-note rising chime. Soft mallet or music box.
        Warm, not sharp. 0.8 seconds. Positive confirmation for a children's app.

page    A single page turn of thick paper in a picture book.
        Soft paper rustle, no crinkle, no sharp high frequencies. 0.5 seconds.

down    A gentle descending tone that feels like the mood sinking.
        Soft, warm, slightly muffled. Not scary, not a buzzer, no dissonance.
        1 second. For a children's storybook when a problem appears.

up      A warm ascending tone like sunlight returning.
        Soft bells with a gentle bloom. Hopeful, calm, not a fanfare.
        1.2 seconds. For a children's storybook happy ending.

clear   A small, warm celebration. Two or three soft bell notes with a light
        sparkle tail. No crowd, no voices, no brass. 1.5 seconds.
```

**한국어로 넣어도 된다.** 다만 「무섭지 않게 · 날카롭지 않게 · 아이용」은 꼭 적는다.

## 4. 파일 규격

| | |
|---|---|
| 경로 | `public/sfx/{id}.mp3` — 예: `public/sfx/down.mp3` |
| 형식 | **mp3 128kbps.** VARCO 가 WAV 로 주면 바꿔서 넣는다 |
| 채널 | 모노. 태블릿 스피커는 어차피 하나다 |
| 크기 | 하나에 **50KB 아래.** 여섯 개 다 합쳐 200KB 를 넘기지 않는다 |
| 음량 | 여섯 개를 **같은 음량으로 맞춘다.** 하나만 크면 놀란다 |

받은 파일 정리 (한 줄):

```
ffmpeg -i down.wav -af loudnorm=I=-18:TP=-3 -ac 1 -b:a 128k public/sfx/down.mp3
```

`I=-18` 은 읽어 주는 목소리보다 **낮게** 두기 위한 값이다. 들어 보고 조절한다.

## 5. 검수

| 무엇 | 어떻게 |
|---|---|
| 태블릿 내장 스피커로 | 이어폰으로만 듣고 고르면 안 된다. 실제로 쓰는 기기로 듣는다 |
| 읽어 주기와 같이 | 효과음이 말소리를 덮지 않는지 겹쳐서 듣는다 |
| 스무 번 연달아 | `tap` 을 연달아 눌러 보고 거슬리면 바꾼다 |
| 소리를 끈 상태 | 「소리 전체 끄기」(S-13-03)에서 **효과음도 꺼지는지** 본다 |

## 6. 넣는 방법

| | |
|---|---|
| 누가 재생하나 | **화면(프론트)이 낸다.** 영상에 섞지 않는다 |
| 왜 섞지 않나 | 섞으면 「소리 전체 끄기」가 영상 소리를 못 끄고, 장면마다 다른 소리를 내려면 영상을 네 개 만들어야 한다 |
| 끄기 | `useSettings` 의 `muteAll` 을 읽어 그대로 따른다. 읽어 주기(`speak`)와 같은 규칙이다 |
| 파일이 없으면 | **소리 없이 그냥 넘어간다.** 효과음은 선택 기능이다 (F-PLY-05) |

## 7. 아직 아닌 것

| 무엇 | 왜 |
|---|---|
| **배경음악(BGM)** | 읽어 주는 목소리와 겹치고 교실에서 시끄럽다. 효과음을 먼저 넣어 보고 정한다 |
| 장소마다 다른 분위기 소리 | 숲의 새소리 같은 것. 여섯 개를 써 보고 모자라면 생각한다 |
| **만든 소리의 상업 이용** | **소유권 · 상업 이용 조건을 약관에서 찾지 못했다.** 발표 · 수업 범위는 괜찮지만 서비스로 내보내기 전에 확인해야 한다 (pt_docs L-09, `varco_sound@ncsoft.com`) |
