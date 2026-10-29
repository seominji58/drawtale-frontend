# 한칸이야기 · 프론트엔드 — Antigravity 안내

이 저장소는 Claude Code 와 Antigravity 를 번갈아 쓴다. **어느 도구든 같은 문서를 읽고 같은 문서에 남긴다.**

## 먼저 읽을 것 (이 순서로)

1. **`AGENTS.md`** — 작업 규칙 전부. 화면에 쓰면 안 되는 말, 디자인 원칙, 라우팅, 작업 순서
2. **`docs/team-status.md`** — 지금 상태 한 장 요약. 영역별 진행 표, 브랜치, 바뀐 것
   (진행 표의 원본은 팀 공유 문서 https://claude.ai/code/artifact/ab310e00-4b6d-4c7a-87a5-11047d955e21 「진행 상황」)
3. **`docs/animated-drawings-local.md`** 「지금 상태」 — 로컬에서 백엔드·AI 까지 띄우는 법과 진행 표
4. 서버와 주고받는 것을 건드리면 `docs/api-contract.md` (원본 계약은 백엔드 저장소 `docs/api-contract.md`)

## 지금 상태 (2026-10-08)

- **10/28 화면 디자인 「그림책 종이」(시안 https://claude.ai/artifact/33DwE22K8py2a91zkFXycq 의 A): 크림 종이 · 크레파스 색 · 갈색 선 · 손글씨 제목(개구) · 고운돋움, 어른 화면은 Pretendard. S-01 도화지 + 인사, S-12 책 표지 책장, S-07 고른 카드에 압정(확인 단계에서도 표시), S-13 스크롤 고침 · 묶음 칩, S-14 이름 · 세 단계 배치, S-14 · S-15 · S-16 은 찢은 종이 가장자리 카드(`index.html` 의 SVG 필터 `#paper-torn`). 기본 바탕 질감은 지금 점무늬 유지 — 다시 고민하기로(사용자).**
- **10/27**: S-03D 직접 그리기(색 8 · 굵기 3 · 지우개, 도장 뺌). 지원 수준을 없애고 카드 4장 고정(`FIXED_LEVEL = 2`, open-decisions 0-12). S-07 은 네 칸 4가지 선택(인물 · 기분 칸은 시험 뒤 뺌, `ASK_EXTRAS = false`, 0-11), 행동 카드는 문제마다 4장(목업). 긴 이야기 대본은 백엔드 dev 에서 Claude Opus 5.5(0-10). **내 소품**(0-13): 보호자 모드에서만 — 그리거나 종이 그림을 올려 이름 · 크기(작게 · 보통 · 크게)를 정해 등록, 이름이 카드 물건과 맞으면 S-09 그 단계 첫 쪽에서 소품들(최대 3) 2.2초 → 주인공. 기본 소품은 못 바꿈. S-09 진행 바: 이 쪽 하나의 바가 그 쪽 음성 길이에 맞춰 회색 → 초록. 디자인 다듬기는 나중에. 서민지 님 커밋 8개 병합(S-09 펼침면 · AI 생성 표시). 시연 전 고칠 목록 `docs/demo-fix-list.md`, AI API 정리 `docs/ai-api-usage.md`, 그림 교체 목록 `docs/image-replacement-plan.md`

- **설계 문서는 `hankan-story/drawtale-pt_docs/`** (github.com/seominji58/drawtale-pt_docs, main) — **어긋나면 이 문서가 최우선** (2026-10-12 사용자). 01 요구사항 정의서 · 02 시스템 아키텍처 · 03 기능정의서 ·
  04 플로우차트 · 05 화면설계서 · 06 입력 그림 요구사항 · 07 사용자 조사 · 08 기술 스택 · 09 DB ERD, `policy/` · `legal/` (10/12 번호가 바뀜). 발표 덱은 `presentation/`
- 프론트는 **React 유지** (Vue 아님, 2026-10-01 확인)
- S-07 아이콘 24장은 10/2 에 체크무늬를 지워 투명 PNG(512px)로 바꿨다. 행동 · 결과 12장이 같은 그림인 것은 그대로 — `docs/backlog.md` 0-6
- 10/2: S-03 받지 않은 파일 안내(S-03-09), S-06 처음 자리로 되돌리기(S-06-07, 서버 `analysis.joints`), 기다리는 중 연결 끊김 · 502~504 면 다시 묻기
- 10/2 (세 저장소 같이): **관절 신뢰도** — S-05-05 는 자신 없는 관절(score < 0.4)이나 낮은 검출(< 0.6)일 때만, S-06 은 그 관절을 빨간 점으로.
  **여러 명 · 사람 아닌 그림**은 E-01 (`MULTIPLE_CHARACTERS` · `LOW_CONFIDENCE`). **원본 그림 보관을 끄면 그림을 떠날 때 서버 원본을 지운다**
  (`features/character/originals.ts`). **S-10 시도 기록**을 보낸다. AI 는 `feat/joint-confidence`, 백엔드는 dev. 근거와 잰 값은 `docs/worklog.md` 맨 위

- 작업 브랜치: **`feat/backend-contract`** (push 됨, main 에 합치기 전)
- 프론트는 **백엔드 계약(drawtale-backend dev) 기준**이다. 변환은 `src/api/index.ts` 한 곳
- 실제 모델로 S-01~S-11 이 돈다. S-09 는 서버 렌더 MP4 를 튼다
- 백엔드는 팀 합의로 **`dev` 하나에서 작업**한다 (`hankan-story/drawtale-backend-git/`, 로컬 백엔드도 여기서 띄운다)
- 소셜 로그인: 카카오·구글. 백엔드 쪽도 dev 에 있다. 네이버는 보류로 뺐다
- 소셜 로그인 client id 는 프론트 `.env` 에 있다 (팀원이 전달, 2026-10-08, `VITE_ENGINE=agent`). 백엔드 `.env` 의
  `KAKAO_CLIENT_ID/SECRET` · `GOOGLE_CLIENT_ID/SECRET` 이 비어 있으면 버튼은 보여도 로그인이 끝나지 않는다 (시크릿은 팀원에게 받는다)
- MP4 에서 팔이 뭉개지는 문제: S-02 권장 카드(프론트), 순화 동작(AI `feat/gentle-motions`,
  `hankan-story/drawtale-ai-git/`, 검토 대기), 동작 매핑(백엔드 dev). AI 를 합치기 전에는 백엔드가 원래 동작으로 렌더한다
- S-07 카드 + 말로 덧붙이기(STT, 어른 설정에서 켬) + 안내 나레이션. 이야기 음성은 백엔드 `TTS_PROVIDER` (openai / elevenlabs)
- 10/8: ElevenLabs 목소리 가안 **Anna Kim**(한국어), 모델 `eleven_v4` (청취로 고름) → 10/29 `eleven_v4_turbo`(별 차이 없고 크레딧 절반). S-09 는 `audioUrl` 이 있으면 그 MP3 를 튼다.
  S-13 「읽어주기」: 나레이션만 / 캐릭터 목소리 → 서버 `voice_mode`. 대사는 `“ ”` 안, `sentences()` 는 따옴표 안에서 끊지 않는다
  캐릭터 목소리면 S-13 「주인공 목소리」(여자아이/남자아이)도 보낸다. 다른 인물 목소리는 백엔드 `voices.py` 가 종류로 고른다
  캐릭터 목소리면 S-05 다음 `/name`(S05Name)에서 친구 이름을 짓고, 나레이션이 그 이름으로 3인칭으로 들려준다
  S-05 · 이름 짓기의 캐릭터는 서버 Meta 렌더 미리보기(`preview_url`)를 튼다 — `CharacterPreview.tsx`. 없으면 브라우저 `CharacterCanvas`
  비회원 체험 한도는 개발 서버에서 세지 않는다 (배포 빌드만, `store/auth.ts`)
  긴 동화책(15쪽 이내) 대비 음성 구조 가안은 `docs/open-decisions.md` 0-6
  노트북에서 렌더가 300초를 넘으면 AI `.env` 에 `RENDER_MAX_FRAMES=150` (AI README)
- 10/12: **긴 이야기 1단계** — S-13 「이야기 길이」(기본 길게) → 서버 `length=long` → 쪽 단위 `book`. S-09 쪽 넘기기, S-10 대표 쪽 네 장. pt_docs(네 문장)와 어긋나 서민지 님 확인 필요
- 10/12: **「어른과 함께」(F-SET-06) 1단계** — 사진 올리기 · 말로 덧붙이기는 로그인한 보호자만 S-13 에서 켠다(기본 꺼짐, `useWithAdult()`). 꺼져 있으면 S-03 은 화면에 그리기만
- 10/23: **S-07 카드 옆 「카드에 없으면」** — 카드 고르는 화면에서 바로 말하거나 적어 그 칸을 정한다(문제 · 행동 · 결과만, 장소는 카드만, 50자, 「이걸로 할래요」로 확정). 「더 말해 볼래요?」 화면은 없앴다. `docs/open-decisions.md` 0-9 들은 글도 칸에 먼저 들어가고 「이대로 할래요」로 확정해야 이야기에 들어간다. 타이핑을 따로 켤지는 `docs/open-decisions.md` 0-9
- 10/12: **동물 · 괴물 그림** 실험 (코드 변경 없음). Meta 는 서 있는 그림만 맞고, 모양에서 뼈대를 뽑는 방법은 13장 모두 움직였다.
  실험 코드 `hankan-story/experiments/animal-monster/`, 판단할 것은 `docs/open-decisions.md` 0-7
- 10/19: **뱀 · 지렁이**(팔다리 없는 긴 몸) 시험 (코드 변경 없음). Meta 는 지원 안 함. 모양 뼈대에 「몸 축을 따라 꿈틀」을 더해 S자 · 한 줄 뱀 · 지렁이가 움직임, 똬리는 아직
- 10/20: 그 실험 `shape_rig.py` 를 **아무 그림 파일 · 폴더로** 돌릴 수 있게 함 (`python shape_rig.py 내그림.jpg --out 결과`, 이 PC 경로 의존 삭제, 가장자리에 닿은 그림 처리). 실제 아이 그림 사진은 아직
- 10/20: **네발 동물 전용 걷기** `experiments/animal-monster/quadruped.py` (코드 변경 없음). 배 아래 다리 찾기 + 네발 걷기 순서, 꼬리는 있을 때만, 네발 아니면 일반 방식으로. 경우의 수 11장 + 카톡 그림 2장 모두 맞음. 다리 곡선은 CMU 사람 걷기 mocap 에서 뽑은 모양(`--gait cmu`)
- **S-03D 화면에 그리기** (`/draw`, 설계서에 없음): 부위별 안내 + 손 그리기·도장. `features/draw/drawing.ts`.
  요소표 초안은 `docs/open-decisions.md` 0-4

## 작업을 끝낼 때마다 (빠뜨리지 않는다)

`AGENTS.md` 7절과 같다.

1. `docs/worklog.md` 맨 위에 항목 추가 — 무엇을, 왜, 무엇을 확인했고 무엇을 못 했는지
2. `docs/team-status.md` 갱신 — 팀원이 이것만 보고 알 수 있게
3. `docs/animated-drawings-local.md` 「지금 상태」 표 갱신
4. 이 파일(`GEMINI.md`)의 「지금 상태」 갱신
5. 새 할 일은 `docs/backlog.md`, 팀 판단이 필요한 것은 `docs/open-decisions.md`

## 이 PC 에서 알아 둘 것

- 확인: `npm run typecheck` 필수. 목 모드와 실서버 모드 둘 다 브라우저로 S-01~S-11 을 돌린다
- **push 는 사용자에게 묻고 한다.** main 에 바로 커밋하지 않고 브랜치에서 한다
- GitHub 로그인은 에이전트 셸에서 안 된다(대화형 창을 못 띄움). 필요하면 사용자가 자기 터미널에서
  `git push` 로 한 번 로그인하게 한다. 그 뒤로는 저장된 자격 증명으로 된다
- `drawtale-ai/`, `drawtale-backend-dev/` 는 zip 으로 받은 폴더라 git 이 아니다. `drawtale-backend-dev/` 는 더 쓰지 않는다
- API 키는 백엔드 `.env` 에만 둔다. 채팅·문서·커밋에 붙이지 않는다
- `AnimatedDrawings/` (Meta 원본) 는 수정하지 않는다

