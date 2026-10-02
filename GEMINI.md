# 한칸이야기 · 프론트엔드 — Antigravity 안내

이 저장소는 Claude Code 와 Antigravity 를 번갈아 쓴다. **어느 도구든 같은 문서를 읽고 같은 문서에 남긴다.**

## 먼저 읽을 것 (이 순서로)

1. **`AGENTS.md`** — 작업 규칙 전부. 화면에 쓰면 안 되는 말, 디자인 원칙, 라우팅, 작업 순서
2. **`docs/team-status.md`** — 지금 상태 한 장 요약. 영역별 진행 표, 브랜치, 바뀐 것
   (진행 표의 원본은 팀 공유 문서 https://claude.ai/code/artifact/ab310e00-4b6d-4c7a-87a5-11047d955e21 「진행 상황」)
3. **`docs/animated-drawings-local.md`** 「지금 상태」 — 로컬에서 백엔드·AI 까지 띄우는 법과 진행 표
4. 서버와 주고받는 것을 건드리면 `docs/api-contract.md` (원본 계약은 백엔드 저장소 `docs/api-contract.md`)

## 지금 상태 (2026-10-02)

- **설계 문서는 `hankan-story/drawtale-pt_docs/`** (github.com/seominji58/drawtale-pt_docs, main). 01 시스템 아키텍처 · 02 기능정의서 ·
  03 플로우차트 · 04 화면설계서 v0.3, 문서마다 맨 위에 발표용 한 장 그림(`tools/poster/`). 발표 덱은 `presentation/` — 15~18번은 팀원 각자
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
- 개발자 콘솔 키가 없어 실서버 모드(5173)에서는 소셜 버튼이 숨겨진다. 로그인 화면은 목 모드(5174)로 본다
- MP4 에서 팔이 뭉개지는 문제: S-02 권장 카드(프론트), 순화 동작(AI `feat/gentle-motions`,
  `hankan-story/drawtale-ai-git/`, 검토 대기), 동작 매핑(백엔드 dev). AI 를 합치기 전에는 백엔드가 원래 동작으로 렌더한다
- S-07 카드 + 말로 덧붙이기(STT, 어른 설정에서 켬) + 안내 나레이션. 이야기 음성은 백엔드 `TTS_PROVIDER` (openai / elevenlabs)
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

