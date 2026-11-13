# 한칸이야기 · 프론트엔드 — Antigravity 안내

이 저장소는 Claude Code 와 Antigravity 를 번갈아 쓴다. **어느 도구든 같은 문서를 읽고 같은 문서에 남긴다.**

## 먼저 읽을 것 (이 순서로)

1. **`AGENTS.md`** — 작업 규칙 전부. 화면에 쓰면 안 되는 말, 디자인 원칙, 라우팅, 작업 순서
2. **`docs/team-status.md`** — 지금 상태 한 장 요약. 영역별 진행 표, 브랜치, 바뀐 것
   (진행 표의 원본은 팀 공유 문서 https://claude.ai/code/artifact/ab310e00-4b6d-4c7a-87a5-11047d955e21 「진행 상황」)
3. **`docs/animated-drawings-local.md`** 「지금 상태」 — 로컬에서 백엔드·AI 까지 띄우는 법과 진행 표
4. 서버와 주고받는 것을 건드리면 `docs/api-contract.md` (원본 계약은 백엔드 저장소 `docs/api-contract.md`)

## 지금 상태 (2026-10-08)

- **11/13 지느러미 · 여러 다리형 검사**: 묶음 `tools/scene-check/out/forms-fr.json`(백엔드 `storage/card_stories/form-finned.jsonl` · `form-radial.jsonl` 에서). 화면 검사는 `REFH=0.52 EXTRA="sprite=out/real/fish.webp&frames=48&box=0.3613,0.4102,0.7949,0.6621&fit=width&facing=1&lift=0.14&size=0.5" node tools/scene-check/layout.mjs 20 10 forms-finned.json`, 여러 다리형은 `EXTRA="still=/scenes/props/octopus.webp&fit=height&facing=0&lift=0.15&size=0.8"`. 손 없는 주인공(사슬 · 날개 · 지느러미 · 촉수)이 받은 물건은 계획에서 곁 땅
- **11/13 붙는 물건**: 계단 말 앞뒤에 로켓 · 우주선이 있으면 `SceneStage` 가 로켓(배경 그림 · 소품 `rocketThing`) 옆에 붙이고 높은 쪽이 로켓에 닿게 뒤집는다(소품 `flip`). 계단은 움직임을 받지 않는다
- **11/12 손에 듦**: 주인공 손 자세(`hand`)는 제자리(calm, `heroHolds`)와 걷는 쪽(`withHero` 로 같이 옮겨 감)에서 그린다. 손에 든 · 주고받는 물건은 배경 같은 종류 거르기(`bgKinds`)에서 빠진다. 「○○이 보이지 않았어요」 배경 물건은 쪽 계획 `hideBg`. 검사 `node tools/scene-check/out/_givecheck.mjs`(먼저 `_gives.mjs`)
- **11/12 큰 붙박이 · 윗면**: `STRUCT` 는 빈자리가 없으면 배경 물건을 무시하고 서고, 그 자리의 글에 없는 배경 물건은 `hiddenBg` 로 감춘다. 식탁 · 책상 위 · 접시의 작은 물건은 자세 `top`(`plan.ts` `ON_TOP`)
- **11/12 넘어진 자세**: 폭 맞춤 형태(사슬 · 4족 · 날개 · 지느러미)는 `fallen-wide`(발끝 축 3도). 검사 페이지는 `?lift=&size=`(서버 형태 정의 hero.float · size)로 앱과 같게 그린다
- **11/12 사람 아닌 형태 검사**: `node tools/scene-check/out/organic.mjs forms-long.json`(형태별 검사 포함), 장면 검사는 `REFH=0.52 EXTRA="sprite=out/real/bird_side.webp&frames=48&box=…&fit=width&facing=1" node tools/scene-check/layout.mjs 512 16 forms-winged.json`. 작은 동물 대본 인물은 동물 그림(`ANIMAL_SRC`, 생김새 `CREATURE_DESC`)
- **11/12 물건 한도**: 한 쪽 물건 3개(`MAX_THINGS`)를 넘으면 큰 물건(키 0.28 이상)을 먼저 남긴다. 없다는 말은 그 물건 바로 뒤에서만 본다
- **11/12 미리 받기**: `S09Story` 는 지금 쪽 · 다음 쪽 장면 그림을 먼저 혼자 받고 나머지를 세 줄로. 재기는 `tools/scene-check/prefetch.mjs [kbps] [rtt] [이야기 …]`
- **11/12 유기 전수 점검**: `tools/scene-check/organic.ts` 가 쪽마다 동작 주인 · 든 물건 · 동물 · 인물 · 쪽 동작을 본다(주어 판단은 장면과 같은 `subjectOf`). 빙글 · 몸짓 주인은 그 말의 마디 끝까지(`sceneFx` `upToClause`), 손에 듦은 `HANDHELD_USE` · `HOLD_NOW` · `lightHolder` · 생김새 `CARRIED`, 동물 자리는 `animalPlace`, 대본에 없는 그 자리 사람은 `calledIn`, 가만히 있는 쪽은 대본 동작 안 함(`STILL_MOVE` · `STILL_LOOP`)
- **11/11 글이 말하는 물건**: `continuity.ts` 의 `SAID`(낱말 → 그림 이름, `@장소` 는 배경판에 그려진 것)로 글이 말하는 물건이 장면에 있는지 센다. 새 물건 그림을 넣으면 `plan.ts` `THINGS` · `ONLY_AT` · `KEEP_THINGS` 와 이 표를 같이 고친다. 몸에 걸친 물건은 `WORN_SRC`. 앞모습 꾸벅 원근은 `--persp`(주인공 키 3배)
- **11/11 기쁨 연출**: `SceneStage` `JOY_RING` 은 머리 위 반원 10조각. `joyful` 은 사람(`who`)마다 하나만, 둘이면 `JOY_RANK` 순(하트 > 별 > 꽃). 별 빛은 `ui.css` `.scene-joy.j-star` 한 겹 2px
- **11/11 글과 배경**: `plan.ts` `whereHeroIs(text, place, loc)` 가 `AT_SCENE`([그곳 말, 장면, 쓸 조건, 주인공 주어 필요]) 로 주인공이 있는 장면을 정한다(`locationFor` · 집 장면 뒤, 대본 scene.location 보다 앞). 카드 밖 장면 · 가게 안(`town-shop`)은 나간다는 말이 없으면 잇는다. 새 장소 경우는 `tools/scene-check/where.ts` 에 더한다. 걷기 · 뛰기는 대본 `action` 인데 `HEART_BEAT` 뿐이면 제자리
- **11/11 쪽 완성**: `S09Story` 는 `pageReady(i)` = `audioReady`(쪽 음성을 fetch 해 blob 주소로 `audioGot`) && `sceneReady`. 1쪽 전에는 `Waiting`(「책을 펴고 있어요」, `OPEN_WAIT_MS` 20초), 다음 쪽 단추는 `nextBusy`. 숨는 곳 커튼 `props/curtain.webp`
- **11/11 장면 5차**: `underPerson` 은 이어 남은 물건이 사람 · 주인공 자리(`placed[0]` 포함)와 겹치면 사람 뒤에(작은 것 폭 1할, 큰 것 2할). 검사 가림은 인물 · 주인공 모두 그림 칸 가운데 6할
- **11/11 장면 4차**: `personX` 순서는 틈 있는 자리 → 몸 7할 안 겹침(같은 쪽) → 반대쪽 빈자리(들어오는 사람) → 몸 반 안 겹침(같은 쪽) → 끝. 장소 그림을 쪽 소품으로 쓸 때는 `THINGS` 에 「장소/파일」(`playground/swing.webp`)과 `props-ar.json` 비율. 앉는 자리 `SEAT_WORDS` 에 빈 이름이면 앉는 자리 아님
- **11/11 장면 3차**: 사람 뒤에 그린 소품은 `data-behind="1"`(`behindPeople`), 검사 페이지가 `behind` 로 넘기고 `layout.mjs` 는 가림에서 뺀다. 함께 걷는 사람은 뒤 자리가 물건 위면 앞쪽(`clearOfThings`). `plan.ts` 꽃집 · 꽂는 깃발 제외
- **11/11 연출 주인 (마디)**: `subjectOf(sen, people, hero, at)` 의 넷째 인자는 연출 말 자리, `subjectNear` 가 그 마디(`CLAUSE_END`)의 사람 주어를 먼저 본다. `SceneFx` 눈물 · 그침 · 기쁨에 `pos`. 조사 없는 주인공 이름은 주어 아님. 함께 기뻐함은 `SceneStage` `together`. 시험 `tools/scene-check/subject.ts`(새 경우는 여기에 더한다)
- **11/11 연출 주인**: `plan.ts` `subjectOf` 는 몸 낱말(`BODY_WORD`) 바로 앞 낱말이 사람(`PERSON_WORD` · 인물 이름 · 주인공 이름 · 내)이면 그 사람을 주어로 (「친구 눈물이 뚝뚝」)
- **11/11 쪽 넘김 · 장면 2차**: `SceneStage` `preloadScene(plan, sprite, spriteLeft)` 가 한 쪽 그림(배치 · 배경판 · 배경 물건 · 쪽 소품 · 주인공 묶음)을 받아 풀어 둔다. `S09Story` 는 지금 쪽 다음부터 차례로 부르고 `sceneReady` 에 없으면 `nextBusy`(「만드는 중」, `SCENE_WAIT_MS` 8초). 인물은 함께 걷는 사람 먼저(`placeOrder` · `placePerson`), 이어 온 물건이 배경에 있으면 피함(`keptKinds`), 작은 이어 남은 물건 `smallPinned`(사람 칸 2할), 벽 소품은 `airPlaced` · `winSpan`. `plan.ts` 빵집 · 주머니 속
- **11/11 장면 인물 · 소품 자리 · 집 장면 · 꿈 쪽**: `SceneStage` 는 사람 자리(`figureSpans`, 주인공 + 인물)를 따로 두고 이어 남은 물건 · 글이 말하는 배경 물건 앞을 피한다(`clearOfThings`, 함께 걷는 사람은 `besideThings`). 들어오는 · 함께 걷는 사람은 물건을 피해도 주인공과 반 넘게 겹치는 자리로 가지 않는다. 큰 소품은 자리가 없으면 사람 뒤(`tryList` overPeople, `behindPeople`). `plan.ts` `HOME_TEXT` · `HOME_BED` · `LEAVE_HOME`(집 장면 바꾸기), `DREAM_TEXT`(꿈 쪽은 그 쪽 물건만, 이어 가지 않음), `SMALL_KEEP` · `SMALL_KEEP_MAX = 2`, 남의 것이 무너진 말(`othersOne`)은 이어 온 것 그대로. 검사 `layout.mjs` · `continuity.ts` 는 꿈 쪽 · 작은 물건 제한을 사라짐으로 세지 않음
- **11/10 밤낮 이어짐**: 다음 쪽 `prevEnv` 는 앞 쪽 끝 모습(S09 안의 셈, 검사 도구는 같은 셈 `plan.envAfter`). `planPages` 다섯째 인자 주인공 이름(`heroWord` · `isMe`). 넓은 풍경(`WIDE_SCENERY`) · 둥지는 사람 뒤에(`behindPeople`). 백엔드 쪽 음성은 끝나는 대로(`PageAudioProgress.done` · `_fill_page_audio`)
- **11/10 장면 물건 이어짐 · 대사에 맞춘 소품**: `plan.ts` 붙박이 물건 `KEEP_THINGS` 는 같은 배경 동안 이어 감(`ThingPlan.keep` 열쇠 · `kept`), 앉는 자리 `seatOf` → `HeroPlan.seat`, 제자리 쪽 `HeroPlan.stay`, 처음 나오는 소품 `appearAt`, 주기 `giveOf` → `give`. `SceneStage` 는 모듈 맵 `PINS`(물건 자리 · 크기) · `HERO_AT` · `PEOPLE_AT` 로 쪽 사이 자리를 기억(열쇠에 이야기 값, `PagePlan.key`). 책 화면은 밀어 넘기기 없음, 기다리는 동안 「만드는 중」. 검사 `continuity.ts`(esbuild 로 묶어 node) · `layout.mjs` · 검사 페이지 `?narr=`
- **11/10 소품 대체 점검**: 배경에 있어 소품을 또 놓지 않는 물건이 쪽 글에 나오면(`SceneStage` `saidKinds`: 쪽 소품 낱말 · 카드 표지판 · 글의 표지판 · 화살표) 그 배경 물건 앞을 비운다(`saidSpans`, 주인공은 `besideSaid` 로 옆에, 인물 · 소품은 `placed`). 돌 하나는 `props/pebble.webp`(`SAME_KIND` pebble = rocks), 다리 그림은 구름다리 · 징검다리 빼고. 검사 `node tools/scene-check/layout.mjs 1024 16 all-long.json`(목 엔진 5174) · 크기 `sizes.mjs`
- **11/10 첫 쪽만으로 책 열기**: 긴 이야기는 첫 쪽 음성이 나오면 성공, 남은 쪽은 `audio_pending: true` 로 두고 백엔드 `jobs.finish_page_audio`(따로 스레드)가 채운다(10분 지나면 응답에서 뗌). 화면 `S09Story` `BookView` 는 `fetchPageAudio` 로 2초마다 주소만 받아 `late` 에 두고, 다음 쪽 음성이 아직이면 「다음 쪽」 단추와 밀어 넘기기를 막는다(`nextLocked`, 소리를 껐으면 안 막음). 그래도 그 쪽에 와 있으면 빈 바(`.progress.is-waiting`)로 기다렸다 읽는다. 쪽 목록(`pages`)은 바꾸지 않는다(장면 계획을 다시 짜지 않게)
- **11/10 사람 아닌 주인공 카드 대본 운영 반영 · 잠수부 · 머리 자리**: 날개형 512편 새로 · 운영 사슬 · 4족 걸린 314편 고침 · draft 12편 approved, 백엔드 씨앗(`app/seed/form_stories.jsonl.gz`) + 마이그레이션(`f1a2b3c4d5e6` · `a2b3c4d5e6f7`)으로 운영 DB 에 (운영 DB 는 VM 에 SSH 로 읽기만, 내용 변경은 마이그레이션으로만). 만들기 · 검사 `scripts/batch_form_stories`(쓰기 → 자동 검사 → 틀린 쪽 고치기 → Opus 검수 → 검수 고치기, `--check` · `--fix-saved`). 바닷속 쪽 등장인물은 잠수부(`plan.ts asDiver`, 그림 `tools/art/gen_cast4.py`). AI 머리 자리는 눈 찾기(`eyes.py`, 검사 `experiments/head-check`). 지느러미 · 여러 다리형은 20편씩 시험만
- **11/10 주인공 몸짓 연출 · 사람 아닌 주인공 몸 규칙**: 쪽 글의 꾸벅 · 끄덕 · 덜덜 · 웅크리기(날개 접기 · 오므리기)는 나레이션이 그 말에 올 때 주인공 그림을 통째로 숙이기 · 두 번 움찔 · 좌우로 잘게 흔들기 · 낮게 눌렀다 펴기(`plan.ts` `GESTURES`, `SceneStage` `heroMove`, `ui.css` `.g-*`), 빙글 돌기와 같은 방식이라 날개형 · 물고기도 된다. 다른 사람이 하는 말이면 넘어가고 「꾸벅꾸벅 졸았어요」는 안 함. 확인 `node tools/scene-check/gesture.mjs [0|1]`(개발 서버 5174). 백엔드 몸 규칙에 빙글 · 꾸벅 · 끄덕 · 떨기 · 웅크리기를 쓸 수 있는 몸짓으로 넣음. 걷기 · 손 · 쫑긋은 백엔드 `book.body_problems` 가 잡아 틀린 쪽만 고침
- **11/9 소품 크기 · 그림띠 미리 읽기**: 소품 키는 `plan.ts` THINGS(주인공 0.52 = 아이 1.1m 기준), 큰 소품은 `SceneStage` 가 배경 물건을 피한 자리를 먼저. 내 소품 크기 `props.ts` `propHeight`(장면 · 미리 보기 같은 값), 그림 주소는 `thingSrc`. 그림띠는 `preloadStripsFor`(S09) 로 미리 읽고 풀린 것만 쓴다. 검사 `harness.html?flip=900` · `?mine=이름`
- **11/9 장면 등장인물 동작**: 그림띠는 `tools/people-moves/make.py`(AI `mask_from=alpha` · 관절 검사 → `regen.json`), 동작은 AI `scene_walk` · `scene_wave`(`runtime/tools/make_scene_motions.py`, 재적용 `scene_front.yaml`, 첫 장 = 그린 자세, 인사는 `loop_from` 부터 끝없이 되풀이). 렌더 도중에도 `merge.py` 로 정보 합치기. 만세는 뺐고 기쁜 쪽도 인사(`SceneStage`). 흰 옷 비침은 `tools/art/fill_white_clothes.py`. 인사 손은 `hand_flip.py` 로 미리 거울 뒤집기, AI 렌더는 오린 그림이면 그물 틀을 원래 모양대로(`mesh_mask` tight, 다리 · 팔 틈이 메워져 꺾이던 것). 보기 `/tools/people-moves/view.html`, 검사 `check.py`, 장면 재생 검사 `harness.html?play=hooray`
- **11/9 책 화면 뒤로 가기**: `S09Story` 장면 모드는 넘기는 동안 도착할 쪽 = 시작 모습(방향 상관없이), 들어온 쪽 = 늘 재생. 장면 층 이야기 기기 점검은 `tools/device-check/story.mjs`(실서버 모드 · 토큰 · 이야기 id).
- **11/9 장면 소품 배치**: 소품은 `plan.ts` `thingsFor`(낱말 · `NOT_REAL` · 장소 `ONLY_AT`), 배경 중복은 `SceneStage` `SAME_KIND`. 실제 이야기로 검사 `node tools/scene-check/layout.mjs`(목 엔진 5174 + 로컬 DB 카드 이야기를 `tools/scene-check/out/cases.json` 으로).
- **11/9 보호자 나이 확인**: 포트원 V2 + KG이니시스 본인인증, 가입할 때 한 번 만 14세 이상. 프론트 `features/identity/ageCheck.ts` · S-16 · `components/AgeGate`, 백엔드 `app/services/identity.py` · 계약 2-17. 개인정보는 저장하지 않는다.
- **11/9 기기 점검**: 높이가 낮은 가로 화면(폰을 가로로)은 `ui.css` 맨 끝 「낮은 가로 화면」 한 덩어리 + `DrawTools fitDraw` 의 `short`. 카드 줄 · 칸 수는 `components/useFitGrid` 가 칸을 재서 정한다(폭 규칙을 더하지 말 것). 검사 `tools/device-check/walk.mjs`.
- **11/9 화면 안내 음성**: 나레이터 파일로 안 바뀐 17문장을 만들어 112문장. 화면 문구 · 카드 · 형태 이름을 고치면 `node tools/guide-voice/check.mjs` 로 빠진 문장을 찾고 `lines.json` → `make.py`.
- **11/7 보호자 목소리 · S-06 · 말풍선**: 녹음은 날 녹음 44.1kHz(`features/voice/record.ts`), 백엔드는 잡음 걷기 끔. S-06 은 목록에서 고르고 그림을 눌러 옮김. `Coach` 기본 자리 위, S-09 만 `at="bottom"`.
- **11/7 실제 모드 형태 고르기 점검**: 세로 태블릿 형태 카드 두 장을 폭에 맞춤. 화면에 넓게 그린 4족형이 테두리만 움직이던 것은 AI `quadruped._place`(바탕이 고르면 상자를 그림까지 넓힘).
- **11/6 밤 화면 점검**: 목 엔진으로 모든 화면을 가로 1024 · 세로 768 · 폰 390 에서 찍어 봄. 그리기 화면 배치가 셋(`DrawTools` `fitDraw`: wide · mid · narrow), 세로 태블릿은 색 · 도구를 두 칸씩 종이 양옆에. 첫 화면 · S-11 · S-03 · E-01 은 900px 아래에서 위아래로. 화면 글에 긴 작대기를 쓰지 않는다(사용자).

- **11/6 밤 사람 아닌 주인공 다듬기**: 실제 이야기 15편 점검 → 짧은 이야기 동작 · 새 · 문어 기쁨 동작 · 아닌 말 고침, 형태별 대신 동작 표(AI 형태 정의 `fallback`), 4족형 소품을 그림에서 잰 입 · 머리 · 등(`still_body`)에. 음성 실패 정책(하나도 없을 때만 브라우저 음성). 회의 안건 6 ~ 9 는 pt_docs `team/회의-안건.md`.
- **11/6 채우기 작은 틈 (pt_docs 20 4-3)**: `features/draw/fill.ts`: 선을 3px 두껍게 본 판에서 칸을 찾아 6px 까지의 틈은 막힌 것으로 본다(바깥으로 새거나 옆 칸까지 칠해지지 않게). 검사 `node tools/draw-check/check_fill.mjs`.
- **11/6 기능 드러내기 (pt_docs 20 3장, 11/6)**: 위 줄 자물쇠(3초 꾹) → **톱니(설정, 한 번 누르면 열림)**. 설정은 **아이 칸**(이야기 길이 · 읽어주기 · 주인공 목소리 · 소리 끄기 · 읽어주기 빠르기 · 화면 안내 다시 보기 — 잠금 없음)과 **보호자 칸**(보호자 모드 · 사진 · 목소리 · 내 목소리 · 원본 보관 · 진단 · 만든 이야기 · 계정 · 비밀번호 바꾸기 — **보호자 비밀번호 숫자 4자리**, 한 번 열면 설정을 닫을 때까지). 보호자 기능은 꺼져 있어도 **🔒 로 보이고**(S-03 사진으로 그림 올리기 · S-07 카드에 없으면 · S-12 내 소품 · 제목, S-05 관절 고치기) 누르면 비밀번호 → 맞으면 보호자 모드와 그 기능을 켠다. 비밀번호는 서버(계정, 해시, 다섯 번 틀리면 5분 막힘), 잊으면 「비밀번호를 잊었어요」 → 다시 로그인 → 10분 안에 새로 정함. 처음 로그인한 보호자에게 **소개 카드 3장**(마지막에 비밀번호 만들기), 아이에게는 형태 고르기 · 그리기 · S-05 · S-09 에서 **말풍선**(처음 한 번, 소리로 읽음 — 나레이터 음성 파일). 코드 `store/guardian.ts` · `components/GuardianGate` · `GuardianIntro` · `LockedFeature` · `Coach` · `SettingsKey`, 백엔드 계약 2-16(migration `b7c8d9e0f1a2`)
- **11/3 S-09 장면 층**: 투명 캐릭터 프레임 묶음(AI) + 세부 장소 배경판 · 물건 · 인물(`features/scene/`). 백엔드 응답 스키마가 `sprite_frames` · `sprite_box` · `scene` · `character_sheet` 를 버려 MP4 로 그려지던 것은 백엔드 286965c 에서 고침. 대본 인물 종류는 `plan.ts` `personKind`(생김새 영어 → 한국어 이름)
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
  S-05 다음 `/name`(S05Name)에서 친구 이름을 지을지 고른다(11/2 부터 늘). 캐릭터 목소리면 나레이션이 그 이름으로 3인칭으로 들려준다
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
- 11/2: **보안** — 백엔드 분당 · 동시 제한(서민지 님) + 하루 한도(429 · 503 → E-01 BUSY, 429 는 Retry-After 60초 이하면 기다렸다 다시), 파일 주소 서명(책장에서 다시 열면 `refreshStory`), `POST /auth/logout`, 배포 헤더(`public/staticwebapp.config.json` CSP), Pillow 13
- 11/3: **S-09 장면 층**(`features/scene/` — locations · plan · sprite · SceneStage, 쪽에 `spriteUrl` · `sprite` · `scene`, 세부 장소 `public/scenes/{세부}`) — 로컬, push 전
- 11/4: **장면 소품 보강**(pt_docs 18) — `plan.ts` THINGS 에 A 5 · B 6 · C 12 더함, `SceneStage` 가 배경에 이미 있는 물건은 빼고(`kindOf`), 우주는 낮에도 별. 그림 `tools/art/gen_scene_props.py`
- 11/4: **해 · 달 · 날씨** — 낮이면 늘 해, 밤 · 아침은 카드 + 쪽 글(`NIGHT_TEXT` · `MORNING_TEXT`), 날씨 `weatherFor`(바깥만, `hasSkyBodies`). 번개는 하늘만 한 번 살짝(번쩍임 없음)
- 11/4: **장면 소품 움직임** — `plan.ts` `thingMotion` → `SceneStage` 의 `m-*` 클래스(ui.css). 하늘 소품은 늘, 공은 굴렸어요 쪽만, 바람 소품은 바람 쪽만. 설계서 2장 「장식용 움직임 없음」과 다름(사용자 결정)
- 11/3: **AI 마스크 · 동작 고침** — 팔 · 머리카락에 갇힌 종이 빼기(`analyzer.drop_pockets`, 흰 종이만), 걷기 · 뛰기 다리 정면 투영 + 무릎 굽힘, 점프 웅크림 줄임(`runtime/tools/make_soft_motions.py`, 이름 `walk` · `run` · `jumping_gentle` 그대로, 원래 판 `*_orig`)
- 11/3: **보호자 모드 스위치**(`settings.guardianMode`, `useWithAdult().guardian` — 끄면 어른과 함께 전부 꺼진 것으로) · S-05 보호자면 늘 관절 고치기 · E-01 다시 시도하기 · S-07 그림 카드 `.choice img.art`
- 11/3: **목업 그림 B 크레용으로 전부** — `public/icons/*/*.webp`(`choices.ts` `ICON_IDS`), `public/illust/`, `public/guide/`, `public/scenes/{장소}/layout.json`(S-09 에는 아직 안 씀), 스크립트 `tools/art/`
- 11/3: **S-09 이야기책 형광펜 없앰 · 글자 38px**(긴 쪽은 `fitSize` 로 칸에 맞춰 줄임)
- 11/3: **S-09 장면 크게 · 대본 작게**(`.book-area` · `.book-ctl`, 가로 화면은 오른쪽 칸에 글 + 조작, 다 봤어요는 마지막 쪽에만)
- 11/3: **S-12 「내 소품 그리기」 버튼**(행동 줄). 목업 그림은 층(배경판 · 뒤 물건 · 주인공 · 앞 물건/소품) + 장소별 좌표 표 안 — 목록 https://claude.ai/artifact/KJiDPVk9FDv756vPgYNinM
- 11/3: **「천천히」 음성** — 음성 파일은 `fileRate()`(0.9배 아래로 안 늘림). `eleven_v4_turbo` 는 `voice_settings.speed` 를 무시함(느린 판 시도 실패)
- 11/3: **S-09 형광펜 줄마다(`.said > .mark`) · 장면 칸을 영상 비율에 맞춤**(`FitStage`, `.stage-cell`, 컨테이너 단위)
- 11/3: **화면 안내 음성을 나레이터 목소리로** — `lib.ts` `speak()` 가 `src/features/voice/guide.json`(문장 → `public/voice/guide/*.mp3`, 95문장)에 있으면 파일, 없으면 브라우저 TTS. 문구 바꾸면 `tools/guide-voice/` 로 다시 만든다(글자가 정확히 같아야 함)
- 11/3: **S-09 쪽 넘김 움직임**(비스듬한 말림 띠 0.6초, 단추 · 자동 넘김 · 손가락 밀기, `BookView` 의 `turn` · `turnTo` · `turnFrame`)
- 11/2: **이메일 로그인은 목 엔진에서만**(백엔드에 없음, `emailLoginAvailable`) · 내 소품 단어표를 지금 카드 id 로 · 휴대폰 폭(S-09 진행 바 · 빠르기, S-13 줄, 한글 `keep-all`)
- 11/2: **이름 직접 적기**(S-05N 카드 아래 칸, 글자 · 숫자 10자). 말로 짓기는 뺐다
- 11/2: **이름 짓기 늘 묻기**(S-05 → `/name`, 지을지 단추로, 이름은 판과 상관없이 서버에 등록 · 나레이션 판 글엔 안 씀) · **제목 고치기 · 삭제는 로그인한 보호자만**(S-13) · **S-05 미리보기 반 / 관절 그림 반**(`JointView.tsx`). `docs/open-decisions.md` 0-18
- 11/2: **보호자 목소리로 나레이션** — S-13 「어른과 함께」 「내 목소리로 읽어주기」 → `/voice`(`S13Voice.tsx`, 동의 → 1~3분 녹음 → WAV 로 등록). 이야기 요청에 `narrator: "guardian"` + 로그인 토큰. 백엔드 `/api/v1/me/voice`(계약 2-12). 녹음은 서버에 저장하지 않는다. `docs/open-decisions.md` 0-17
- 11/2: **S-09 읽어주기 빠르기**(진행 바 옆 천천히 · 보통 · 빠르게, 설정 `speechRate` 에 남음, 서버 음성은 재생 속도만 바꿈) · 펼침면 그림 2.3 : 글 1 로 장면을 키움
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

