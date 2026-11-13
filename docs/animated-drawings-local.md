# 실제 모델로 로컬 실행 — 진행 상황과 다음 단계

**이어서 작업하는 에이전트는 이 파일의 「지금 상태」부터 읽는다.**
기준일 2026-09-29.

---

## 지금 상태

| 단계 | 상태 |
|---|---|
| 11/13 지느러미형 · 여러 다리형 점검 | **끝**: 20편씩(백엔드 `storage/card_stories` jsonl, 운영 미반영). 유기 점검 20 → 5, 화면 배치 0. `plan.ts` 달팽이 ≠ 팽이 · 손 없는 주인공이 받은 물건은 곁 땅. 묶음 `out/forms-finned.json` · `forms-radial.json` · `forms-fr.json` |
| 11/12 건네준 · 든 물건 · 안 보인다는 배경 | **끝**: 손에 듦 792개 모두 손(전 바닥 80 · 없음 8), 장면 검사 문제 쪽 99 → 65(사람 아닌 형태 날개 37 · 사슬 39 · 4족 5, 검사는 `REFH=0.52`). `plan.ts` `thingMotion` 「바위 틈까지 · 돌 위를」은 굴러간 곳 · 계단은 움직임 없음, `SceneStage` 로켓 계단은 로켓 옆에 붙임(`flip`). 받는 사람 주인공은 제자리 쪽에서 가만히 서서 듦(`plan.ts` `heroHolds`), 걷는 쪽은 든 채 같이 옮겨 감(`SceneStage` `hand` · `withHero`), 손에 든 물건은 배경 같은 종류가 있어도 그림, `hands.json` 잠수부 · 외계인. 「로켓이 보이지 않았어요」는 다시 보일 때까지 감춤(`hideBg`), 「굴러가는 달 돌」 굴림. 검사 `out/_givecheck.mjs` |
| 11/12 소품 크기 · 대본에만 있던 소품 | **끝**: `SceneStage` `hiddenBg`(큰 붙박이 자리의 글에 없는 배경 물건 감춤) · 자세 `top`(식탁 · 책상 위), `plan.ts` `ON_TOP` · 소리말 우는 문장 뒤 문장까지 · 「손에는 … 있었어요」, 큰 붙박이 크기, 새 그림 11장 |
| 11/12 사람 아닌 형태 전수 점검 | **진행**: 날개 · 사슬 · 4족 841편, 걸린 쪽 388 → 149. `plan.ts` 날기 주어(`heroLead` · 어찌말) · 작은 동물 대본 인물(`ANIMAL_SRC` · `CREATURE_DESC`) · `locations.ts` 등대 곁 부두. 형태별 장면 검사 `EXTRA=… layout.mjs` 돌리는 중 |
| 11/12 글이 말하는 물건 남은 130 | **끝**: 130 → 16. `plan.ts` 계단 뒤돌아보기 · 없음 말 자리 · 큰 물건 먼저(한도 3) · 숨는 쪽 큰 붙박이 · `COVERS` 계단 · 소파 · 책장 · 버스 · 표지판 · 교문 · 로켓 문 앞 장소 |
| 11/12 다음 쪽 먼저 받기 | **끝**: `S09Story` 지금 · 다음 쪽 먼저, 나머지 세 줄. 느린 망 다음 쪽 2.25 → 1.38초(`prefetch.mjs`) |
| 11/12 대본 · 장면 유기 전수 점검 | **끝**: `organic.ts` 걸린 쪽 987 → 249. `plan.ts` `upToClause`(빙글 · 몸짓 주인) · `HANDHELD_USE` · `HOLD_NOW` · `lightHolder` · `CARRIED` · 이어 들기 · `animalPlace` · `calledIn` · `ACTION_SAY` / `STILL_*`, 동물 그림 5장 |
| 11/11 난간 | **끝**: `props/railing.webp`, `plan.ts` 난간 규칙, `SceneStage` 주인공 뒤 손 높이(`WIDE_SCENERY`). 글 물건 없음 166 → 128 |
| 11/11 글이 말하는 물건 · 꾸벅 · 걸친 물건 | **끝**: `continuity.ts` `SAID` 로 장면에 없는 물건 문장 637 → 153, 새 그림 9장(`gen_scene_props5.py` · `6.py`), `plan.ts` `WORN_SRC` · 장소 규칙(구름다리 · 터널 → 놀이터, 방파제 → 부두, 교문 → 학교, 「물속」 좁힘), `SceneStage` `--persp`(주인공 키 3배). 남은 것: 난간 38 |
| 11/11 기쁨 연출 10개 · 별 빛 · 한 사람에 하나 | **끝**: `SceneStage` `JOY_RING` 10개 · `JOY_RANK`(하트 > 별 > 꽃) · `together` 친구 포함, `ui.css` 별 빛 한 겹 2px. 확인 4쪽 모두 한 사람 한 고리 · 10조각 |
| 11/11 글과 배경 · 가게 안 · 중의적 말 | **끝**: `plan.ts` `whereHeroIs` · `AT_SCENE`(가는 길 `ON_THE_WAY`, 보이기만 `NOT_THERE`) · 카드 밖 장면 잇기 · 가게 안 잇기, `scenes/town-shop`, `PERSON_WORD` 자연 「님」 제외, `HEART_BEAT` · `MOVE_WORDS`, 목소리 떨림. 시험 `tools/scene-check/where.ts` |
| 11/11 쪽 완성 뒤 보여 주기 · 커튼 | **끝** (실제 모드 확인): `S09Story` `pageReady`(음성 `audioGot` + 장면 `sceneReady`) · `opened`(1쪽 완성 뒤 편다) · 세 쪽씩 미리 받기, `preloadScene` 에 등장인물 그림띠, 커튼 `props/curtain.webp` (연출 주인 소리 · 앞 문장 · 숙소 · 비유 이불은 서민지 님 `a8a70d8`) |
| 11/11 장면 남은 문제 5차 | **끝**: 문제 쪽 78 → 50. `underPerson` 작은 것(키 0.2 미만) 폭 1할 · 주인공 자리 포함, `layout.mjs` 가림은 인물도 몸 가운데 6할 |
| 11/11 장면 남은 문제 4차 | **끝**: 문제 쪽 95 → 78. `personX` 반대쪽 빈자리를 반 사람 겹치기보다 먼저, `plan.ts` 그네 소품(`playground/swing.webp`) · 등대 계단 앉기(`lighthouse`) · 구름 침대 제외 · 「누구 품에서」 든 사람 |
| 11/11 장면 남은 문제 3차 | **끝**: 문제 쪽 154 → 95. `plan.ts` 꽃집 · 꽂는 깃발, `SceneStage` 함께 걷는 사람 앞쪽 자리 · 사람 뒤 소품 `data-behind`(검사 `harness.tsx` · `layout.mjs` 가 가림에서 뺌) |
| 11/11 쪽 넘김 · 장면 남은 문제 2차 | **끝** (쪽 넘김은 실제 모드 확인 전): 다음 쪽 음성과 장면 그림(`SceneStage` `preloadScene`)이 다 준비돼야 「다음 쪽」(`S09Story` `nextBusy`, 8초 넘으면 연다). 장면 문제 쪽 297 → 154, 서민지 님 `cd93d73` · `0b2dcbd` 와 합침(겹친 곳은 서민지 님 것) |
| 11/11 장면 인물 · 소품 자리 · 집 장면 · 꿈 쪽 | **끝**: 1,024편 장면 검사 문제 쪽 1,240 → 297(사라짐 904 → 0 · 뜬 인물 132 → 0 · 가림 153 → 127). `SceneStage` 사람 자리 `figureSpans` · `clearOfThings`, `plan.ts` `HOME_TEXT`(집 침실 · 거실) · `DREAM_TEXT`(꿈 쪽은 꿈 물건만) · `SMALL_KEEP`(작은 물건 최근 2개). 남음: 인물끼리 겹침 120 · 소품과 배경 물건 겹침 50 · 커튼 숨기 그림 |
| 11/10 밤낮 이어짐 · 쪽 음성 쪽마다 | **끝**: 앞 쪽 끝 모습에서 시작(깜빡임 144편 → 0, 합친 뒤 2쪽은 일부러 넣은 버섯 빛 깜빡임), 카드 밤 한 번만 · 굴 밖은 낮, 넓은 풍경은 사람 뒤, 백엔드 쪽 음성은 끝나는 대로 채움, 단추 깜빡임 없앰. 화면 검사 문제 쪽 1,240 → 586 |
| 11/10 장면 물건 이어짐 · 대사에 맞춘 소품 | **끝**: 붙박이 물건 이어짐(사라짐 918 → 8쪽), 앉는 자리, 처음 나오는 소품은 그 말에서 · 주기는 주는 사람 손 → 받는 사람 손, 책 화면 「만드는 중」 단추 · 밀어 넘기기 없앰. 남은 것: 앉는 자리 겹침을 세는 가림 검사 기준, 배경 겹침 70쪽 |
| 11/10 소품 대체 점검 | **끝**: 대체 규칙은 모두 됨, 글이 말하는 배경 물건 가림 38 → 0쪽(`SceneStage` `saidSpans`), 구름다리 · 징검다리 · 작은 돌 그림 고침. 검사 `tools/scene-check/layout.mjs` · `sizes.mjs` |
| 11/10 첫 쪽만으로 책 열기 | **끝**: 첫 쪽 음성이 나오면 책을 열고 나머지 쪽은 뒤에서 채움(백엔드 `finish_page_audio` · 쪽 `audio_pending`, 화면 `BookView` 가 2초마다 다시 묻고, 다음 쪽 음성이 아직이면 「다음 쪽」 · 밀어 넘기기를 막음). 로컬 시험 책으로 브라우저 확인, 실제 녹음 목소리 시간은 아직 |
| 11/10 사람 아닌 주인공 카드 대본 운영 반영 | **끝**: 날개형 512 · 사슬 · 4족 고친 314 · draft 12 approved, 마이그레이션 `a2b3c4d5e6f7` 까지 배포 확인(운영 approved 사슬 511 · 4족 509 · 날개 508). 로컬 Postgres(5433)도 `alembic upgrade head` 로 형태 칸 · 씨앗까지. 운영 DB 읽기: `ssh -i ~/.ssh/drawtale-v_key.pem azureuser@20.196.129.38` → `cd ~/drawtale/drawtale-backend/deploy && sudo docker compose -f docker-compose.prod.yml exec db psql -U drawtale -d drawtale` (SELECT 만, IP 가 바뀌면 VM 방화벽 22번) |
| 11/10 잠수부 · AI 머리 자리 | **끝**: 바닷속 쪽 인물은 잠수부 그림 · 그림띠, AI 눈 찾기로 날개 · 사슬 · 지느러미형 머리(로컬 AI 컨테이너에 반영) |
| 11/10 주인공 몸짓 연출 · 몸 규칙 검사 | **끝**: 꾸벅 · 끄덕 · 떨기 · 웅크리기 화면 연출(그림을 통째로, 어느 형태든), 확인 `node tools/scene-check/gesture.mjs`. 백엔드 몸 규칙에 화면 몸짓을 넣고 걷기 · 손 · 쫑긋은 자동 검사(`book.body_problems`) → 틀린 쪽만 고치기. 날개형 대본 시험 Sonnet · Opus 결과는 worklog |
| 11/9 장면 등장인물 동작 | **끝 (커밋 전)**: 33명 걷기 · 인사 그림띠를 새 동작(AI `scene_walk` · `scene_wave`)으로 다시 렌더. AI 를 고치면 도커에 반영(`docker cp` + 재시작 또는 다시 빌드) 뒤 `python tools/people-moves/make.py` → 결과 `people-moves.{포트}.json` 을 `people-moves.json` 에 합친다. 두 서버로 나눠 돌리면 빠르다(두 번째 AI 는 같은 이미지를 8002 에 `TORCHSERVE_URL=http://torchserve:8080`) |
| 11/9 보호자 나이 확인(본인인증) | **테스트 채널로 실제 가입 확인 (커밋 전)**: Google · 카카오 가입 둘 다 본인인증 → 계정에 시각 · 방법 · 인증 번호만. 시험 환경은 백엔드 덮어쓰기 `scratchpad/be-age-test.yml`(로컬 DB · 파일 로컬) + 프론트 5173(agent). 로컬은 키가 없으면 묻지 않는다. 실제로 보려면 백엔드 `.env` 에 `PORTONE_API_SECRET` · `PORTONE_STORE_ID`, 프론트 `.env` 에 `VITE_PORTONE_STORE_ID` · `VITE_PORTONE_IDV_CHANNEL_KEY` 를 넣고 `alembic upgrade head`(`c8d9e0f1a2b3`). 시험 계정(`dev_login`)은 인증한 것으로, `--no-age` 면 안 한 계정 |
| 11/9 기기 점검(폰 가로 · 아이패드) | **끝 (커밋 전)**: 에뮬레이터 `Medium_Phone_API_37.0` 을 `adb shell wm size` 로 갤럭시 크기에, iOS 는 WebKit. 방법은 `tools/device-check/walk.mjs` 첫머리. 에뮬레이터 화면 크기는 끝나면 `adb shell wm size reset` · `wm density reset` |
| 11/9 화면 안내 음성 빠진 17문장 | **끝 (커밋 전)**: 112문장, 검사 `node tools/guide-voice/check.mjs` 112 / 112. 브라우저 청취는 아직 |
| 11/7 보호자 목소리 청취 시험 준비 | 로컬 `.env` 에 `TTS_PROVIDER` 가 없어 openai 로 읽힌다. 시험은 덮어쓰기 설정(로컬 DB · `TTS_PROVIDER=elevenlabs` · CORS 5173)으로 백엔드를 띄우고 `dev_login --front http://localhost:5173` 링크로 녹음 · 등록. 끝나면 `docker compose up -d backend` 로 원래 설정 |
| 11/7 실제 모드 형태 고르기 · 사람 아닌 주인공 점검 | **고침**: 세로 형태 카드, AI 4족형 그림 영역(넓게 그린 그림). 시험 프론트를 5173 이 아닌 포트로 띄우면 백엔드 `CORS_ORIGINS` 에 그 포트를 더해야 캐릭터 영상 바탕이 지워진다 |
| 11/6 밤 화면 점검(가로 1024 · 세로 768 · 폰 390, 목 엔진) | **고침**: 세로 태블릿 그리기 · 첫 화면 · 책 제목 · S-11, 폰 위 줄 점. 형태 고르기 · 사람 아닌 주인공 화면은 목 엔진이 건너뛰어 실제 모드로 따로 볼 것 (`docs/worklog.md` 맨 위) |
| 11/6 밤 로컬 `.env`: 공유 개발 DB `psql-drawtale-dev` · Blob `stdrawtaledev` · `STORAGE_BACKEND=azure` | **끝**, 도커 안 백엔드는 `AI_SERVICE_URL=http://host.docker.internal:8001` 이어야 AI 에 닿는다(`127.0.0.1` 이면 형태가 사람 하나만 나옴). 공유 DB 를 건드리지 않고 시험하려면 `DATABASE_URL` 을 로컬 `db` 로 덮어쓴다 |
| 11/6 로컬 시험 계정 로그인 | `docker exec drawtale-backend-git-backend-1 python -m scripts.dev_login [--pin 2580 --onboarded]` → 알려 준 `http://localhost:5173/?dev_token=…` 를 연다 (개발 서버 · 로컬 APP_ENV 에서만). 공유 DB 를 쓰는 중이면 공유 DB 에 시험 계정 하나가 생긴다 |
| 11/6 밤 채우기 작은 틈(6px 까지 막힘 · 옆 칸 새지 않음, `features/draw/fill.ts`), 백엔드 · AI 형태별 대신 동작 · 새 · 문어 기쁨 동작 · 짧은 이야기 동작 · 아닌 말 | **push**: 프론트 `feat/backend-contract`, 백엔드 · AI `dev`, 운영 반영(VM 켬, 프론트 배포 다시 돌림) |
| WSL2 · Docker Desktop 설치 | **끝** |
| Meta AnimatedDrawings TorchServe 이미지 | **끝** — 직접 빌드했다가 팀원 `drawtale-ai` 것으로 갈아탔다 (아래) |
| 팀원 AI 서버(`drawtale-ai` dev) 띄우기 | **끝** — `docker compose up -d`, 8001·8080 |
| 팀원 백엔드(`drawtale-backend` dev) 띄우기 | **끝** — 이제 git clone `drawtale-backend-git/`(dev)에서 띄운다. 로컬 Postgres, `AI_USE_MOCK=false`, 8000 |
| 10/27 S-03D 그리기 도구 · 카드 4장 고정 · 문제별 행동 카드 · 내 소품(보호자 모드) · S-09 진행 바, 백엔드 긴 이야기 대본 Claude Opus 5.5 | **push** — 프론트 `feat/backend-contract` 66822cf, 백엔드 dev 8b32c1d(`ANTHROPIC_API_KEY` 필요, 없으면 OpenAI 로), migration `e7f0a1b2c3d4` · `f8a1b2c3d4e5` (`docs/worklog.md` 맨 위) |
| **프론트를 백엔드 계약에 맞춤** | **끝** — `docs/api-contract.md`. 화면까지 백엔드 흐름으로 (S-09 MP4, S-10 문장 카드) |
| 실제 모델로 S-01~S-11 전 구간 | **끝** — 브라우저로 확인. 목 모드도 끝까지 돈다 |
| 커밋 · push | **끝** — 프론트 `feat/backend-contract`(+ 로컬 `main` 처음 커밋 3개), 백엔드 **`dev` 에 합침**(팀 합의로 dev 하나에서 작업), AI `feat/gentle-motions` · 그 위의 `feat/joint-confidence` push. 프론트 main 합치기와 PR 은 아직 |
| 팔이 뭉개지는 문제 | **고침** — S-02 권장 카드, AI 순화 동작, 백엔드 동작 매핑. 백엔드 매핑은 dev 에 있고, AI 가 순화 동작을 모르면 원래 동작으로 다시 렌더한다 |
| S-03D 화면에 그리기 | **1단계 끝** — 부위별 안내, 손 그리기·도장, 연결 확인. 실서버로 인식 확인. 실제 터치 기기 확인은 남음 |
| 소셜 로그인 (카카오·구글. 네이버는 보류로 뺌) | **프론트 끝** — 목 모드로 확인. **백엔드는 dev 에 합침** (migration 양방향 확인). 개발자 콘솔 등록은 남음 (`api-contract.md` 4절) |
| 이야기 음성 | **끝** — ElevenLabs 나레이터 Anna Kim · `eleven_v4` (10/8 청취로 고름) → 10/29 `eleven_v4_turbo`(크레딧 절반). 실제 키로 S-09 까지 확인. v4 는 speed 를 무시해서 빠르기 · 감정은 태그로 |
| 관절 신뢰도 · 여러 명 · 원본 지우기 · S-10 기록 (2026-10-02) | **끝** — AI `feat/joint-confidence`(점수 · 걸러내기), 백엔드 dev(계약 2-3 · 2-10 · 2-11, migration 3개), 프론트. 실제 모델로 브라우저 확인 |
| 읽어주기 두 판 (2026-10-08) | **끝** — S-13 → `voice_mode`, 백엔드 GPT 대본 + ElevenLabs 대화 합성. 실제 키로 S-09 까지 브라우저 확인 |
| 인물 목소리 · 3인칭 · 친구 이름 짓기 (2026-10-08) | **끝** — 백엔드 `voices.py`(8종류), S-13 「주인공 목소리」, `/name`. 실제 키로 확인 |
| S-05 Meta 미리보기 영상 (2026-10-08) | **끝** — 분석 뒤 서버가 150프레임 렌더, S-05 · `/name` 이 튼다. 렌더는 동작 전체에서 프레임을 골라 그린다 |
| 영역별 진행 표 | **끝** — 공유 문서 「진행 상황」, 사본은 `docs/team-status.md` · 백엔드/AI `docs/진행상황.md` |
| 동물 · 괴물 그림 실험 (2026-10-12 · 10/19) | **실험만** — 모양에서 뼈대를 뽑는 방법이 13장 모두 움직임. 10/19 뱀 · 지렁이는 「몸 축 꿈틀」로 3장 움직임(똬리는 아직). 10/20 아무 그림 파일 · 폴더로 돌릴 수 있게 함(`shape_rig.py 파일 --out 폴더`), 네발 동물 전용 걷기 `quadruped.py`. 코드는 `hankan-story/experiments/animal-monster/`, 판단은 `open-decisions.md` 0-7 |
| 「어른과 함께」 1단계 (2026-10-12) | **끝 (프론트)** — pt_docs F-SET-06. 사진 올리기 · 말로 덧붙이기를 로그인한 보호자만 켠다, 기본 꺼짐. 목 엔진으로 S-03 → S-11 확인 |
| S-07 카드 옆 말하기 · 적기 (2026-10-23) | **끝 (프론트, 커밋 전)** — 카드 대신 아이 말로 칸을 정함(장소는 카드만) · 앞 칸 돌아가 고치기. 들은 글 · 적은 글 모두 「이대로 할래요」로 확정해야 들어감. 목 엔진 확인, 실제 마이크는 아직 |
| 11/2 작업 실제 서버 확인 · push (2026-11-02) | **끝** — 프론트 `feat/backend-contract` e12603e, 백엔드 dev 43151e1. 실제 모드로 분석 → S-05 반반 → 이름 → 카드 → 이야기 → S-09 빠르기 확인. **공유 DB 에 닿지 않음**(방화벽 IP 로 보임) — 백엔드 `.env` 가 공유 DB 를 가리키면 컨테이너가 마이그레이션에서 멈추므로, 로컬 시험은 `DATABASE_URL` 을 `db` 컨테이너로 덮어써 띄운다. 공유 DB 마이그레이션 `b1c2d3e4f5a6` 은 남음 |
| 11/3 S-09 쪽 넘김 · 화면 안내 음성 나레이터 목소리 | **끝** — 안내 95문장 `public/voice/guide/` + `src/features/voice/guide.json`, 다시 만들기 `tools/guide-voice/make.py`. 목 엔진으로 확인 |
| 이름 짓기 늘 묻기 · S-05 관절 미리 보기 · 제목 고치기 (2026-11-02) | **끝 (프론트 · 백엔드, 커밋 전)** — 목 엔진 확인, 백엔드 151 통과 |
| 보호자 목소리로 나레이션 (2026-11-02) | **끝 (프론트 · 백엔드, 커밋 전)** — 동의 · 녹음 화면(보호자 모드), 백엔드 `/api/v1/me/voice` · migration `b1c2d3e4f5a6`. 백엔드 테스트 150 · 목 엔진 확인, **실제 ElevenLabs 로는 아직** (Creator 로 올린 뒤, 유료라 허락 뒤) |
| S-09 읽어주기 빠르기 · 장면 칸 키우기 (2026-11-02) | **끝 (프론트, 커밋 전)** — 진행 바 옆 천천히 · 보통 · 빠르게, 펼침면 그림 2.3 : 글 1. 목 엔진 확인, 실제 MP3 청취는 아직 |
| 긴 이야기 1단계 (2026-10-12) | **끝** — 쪽 단위 그림책 (`length=long`, `book`). 대본 gpt-5.4-mini 로 4편 확인. 쪽마다 음성 · 동작은 다음 |
| 11/3 AI 마스크 · 동작 고침 — 팔 · 머리카락에 갇힌 종이 빼기, 걷기 · 뛰기 다리 꼬임, 점프 눌림 | **push** — AI `dev` `3173496` · `955f281`. 같은 동작 이름이 새 파일(`walk_steps` · `run_steps` · `jumping_soft` · `cmu1_front`)을 가리킨다. 자세한 것은 AI `docs/진행상황.md` · `docs/worklog.md` |
| 기능 드러내기 — 톱니 · 보호자 비밀번호 · 보이되 잠그기 · 소개 카드 · 말풍선 (2026-11-06) | **끝 (프론트 · 백엔드, push)** — 말풍선 5문장 나레이터 음성 파일 — pt_docs 20 3장 순서대로. 백엔드 계약 2-16 · migration `b7c8d9e0f1a2` · 테스트 230 통과. 로컬 실제 모드(새 시험 계정)로 소개 카드 → 비밀번호 만들기 → 톱니 → 보호자 칸(틀린 비밀번호 남은 횟수) → S-03 🔒 사진 올리기 → 켜짐, 목 엔진으로 S-01 → S-09(말풍선 · S-07 🔒) 확인. **공유 · 운영 DB 에 마이그레이션이 올라가야 화면이 동작**(운영은 push 하면 자동) |
| 내 소품 움직임 (2026-11-06) | **끝 (프론트)** — pt_docs 20 2-b, 전체 흔들기 수준. 시험 세트 18 통과 · 씨앗 8,704쪽 분포 확인 · 로컬 실제 모드 화면 확인 |
| 4족형 입 · 등 · 머리 자리 + 장면 물건 2차 14장 (2026-11-06) | **끝 (프론트)** — 검사 34 · 22 통과, 씨앗 비교, 로컬 강아지 이야기로 화면 확인 |

**팀원용 한 장 요약은 `docs/team-status.md`**, Antigravity 는 `GEMINI.md` 부터 읽는다.

**다음 할 일**: 소셜 로그인 시크릿을 백엔드 `.env` 에 넣고 실제 로그인 확인(프론트 client id 는 10/8 에 넣음),
머리가 몸과 떨어진 그림의 렌더(AI), 대사 품질(긴 동화책 프롬프트와 같이), 쪽 단위 동화책 구조(`open-decisions.md` 0-6).
팀원 할 일은 `docs/team-status.md` 「영역별 진행 상황」.
느린 PC 는 AI `.env` 에 `RENDER_MAX_FRAMES=150`, AI 컨테이너는 `docker compose -p drawtale-ai up -d --build ai`.

---

## 폴더 배치

```
Desktop/hankan-story/
├─ drawtale-frontend/     ← 이 저장소 (github.com/seominji58/drawtale-frontend)
├─ drawtale-ai/           ← 팀원 AI 저장소 dev 브랜치 zip (git 아님, 읽기 전용으로 쓴다)
├─ drawtale-backend/      ← 팀원 백엔드 main 브랜치 zip (뼈대뿐)
├─ drawtale-backend-dev/  ← 팀원 백엔드 dev 브랜치 옛 zip (더 쓰지 않는다)
├─ drawtale-backend-git/  ← 팀원 백엔드 저장소 clone (git). dev — 이것을 띄운다
├─ drawtale-ai-git/       ← 팀원 AI 저장소 clone (git). feat/joint-confidence (feat/gentle-motions 위)
└─ AnimatedDrawings/      ← Meta 원본 저장소 (수정하지 않는다)
```

두 팀원 저장소는 비공개라 이 PC의 git 자격 증명으로 clone 되지 않아서, 사용자가
GitHub에서 zip으로 받아 풀었다. **git 저장소가 아니므로 pull 로 갱신되지 않는다.**
새 코드가 필요하면 zip을 다시 받는다.

---

## 띄우는 순서

### 1. AI 서버 (`drawtale-ai`)

```bash
cd ../drawtale-ai-git
docker compose -p drawtale-ai up -d --build   # -p 로 예전 이미지를 다시 쓴다. 첫 빌드는 20~30분 (mmcv 컴파일)
docker compose ps             # torchserve 가 healthy 가 되면 ai 가 뜬다
curl http://127.0.0.1:8001/internal/v1/health   # model_loaded: true
```

### 2. 백엔드 (`drawtale-backend-git`, dev)

`.env`는 `.env.example`을 복사해 **세 줄을 바꾼 것**이다 (이미 만들어 둠, git 에 올리지 않는다).
경로: `C:\Users\Omnyumyum\Desktop\hankan-story\drawtale-backend-git\.env`.
이야기·음성까지 보려면 `OPENAI_API_KEY`(팀 드라이브), `TTS_PROVIDER`, ElevenLabs 키·목소리 id 도 채운다.
**키 값은 채팅·문서·커밋에 붙이지 않는다.** `.env` 를 바꾸면 컨테이너를 다시 띄워야 읽는다.

```bash
DATABASE_URL=postgresql+psycopg://drawtale:drawtale@db:5432/drawtale   # 컨테이너 안에서 db 를 본다
AI_SERVICE_URL=http://host.docker.internal:8001                        # 호스트의 AI 서버
AI_USE_MOCK=false
```

```bash
cd ../drawtale-backend-git
docker compose --profile app up -d --build    # db + backend. migration 은 시작할 때 자동
curl http://127.0.0.1:8000/health
```

백엔드 가이드는 Azure 공유 DB를 쓰라고 하지만 접속 주소와 IP 등록이 필요해서
로컬 Postgres(`db` 서비스)로 띄웠다. `.env.example`의 기본값 `127.0.0.1:5433`은
백엔드를 venv로 돌릴 때용이라 컨테이너 안에서는 닿지 않는다.

### 3. 프론트

```bash
npm run dev      # .env 의 VITE_ENGINE 이 mock 이 아니면 /api/v1 이 8000 으로 간다
```

---

## 경위 — 왜 팀원 것으로 갈아탔나

처음 계획은 Meta 원본 `torchserve/Dockerfile`을 직접 빌드하고, 스텁 서버의 분석
부분만 TorchServe를 부르는 어댑터로 바꾸는 것이었다. 둘 다 만들어 돌렸다.

- 원본 Dockerfile은 **그대로는 빌드되지 않는다.** 베이스 이미지가 Debian 11(bullseye)인데
  지원 종료 뒤 `deb.debian.org`의 bullseye-security 패키지가 404 난다.
  `archive.debian.org`로 돌려 빌드했다 (이미지 32.9GB, CUDA 포함).
- 어댑터로 실제 모델을 돌려 보니 CPU로 장당 2.5~3초, crop → 원본 좌표 변환이 정확했다.

그 뒤 사용자가 팀원의 `drawtale-ai`를 받아 왔다. 같은 문제를 이미 풀었고(snapshot 저장소),
**CPU 전용 PyTorch로 이미지가 5.85GB**, 작업자 1개로 메모리 1.4GB다. 같은 Meta 가중치라
관절 좌표는 내 어댑터와 이미지 크기의 1% 안에서 같았다. 그리고 `drawtale-backend` dev가
이미 AI 서버를 부르고 있어서, 프론트는 **백엔드 계약에 맞추는 것이 맞다**고 판단했다
(사용자 지시: 「기준은 백엔드 기준으로」). 직접 만든 이미지·어댑터·스텁은 지웠다.

## 알려진 것

- **분석 시간**: 오전 단독 실측은 검출 2.1~2.6초. 오후 브라우저 실측은 17초였는데
  게임 클라이언트가 CPU 40%를 쓰던 때였다. S-04 제한이 30초라 다른 무거운 프로그램이
  돌면 넘을 수 있다
- **이야기 + MP4**: 54초. 백엔드 가이드는 30~40초라고 했다
- 모델은 여전히 Meta 사전학습 그대로다. 손그림 전용 모델(팀원 A2)은 아직 없다
- 팀원 AI 서버 실험 기록: `../drawtale-ai/docs/관절인식-실험-기록.md`
  (4등신 그림에서 관절이 안쪽으로 몰림, 후처리로는 효과 작음)
