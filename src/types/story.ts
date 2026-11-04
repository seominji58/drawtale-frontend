/** 브라우저 캔버스가 계산하는 모션. S-05·S-06 미리보기에만 쓴다.
 *  S-09 애니메이션은 서버가 렌더한 MP4 다 (백엔드 계약 2-6) */
export type MotionId = "idle" | "walk" | "jump" | "wave" | "look";

/** S-07 선택 단계. 인물은 S-05에서 확정되므로 선택 단계에 없다. */
export type StepKind = "place" | "problem" | "action" | "result";
export const STEP_ORDER: StepKind[] = ["place", "problem", "action", "result"];
export const STEP_QUESTION: Record<StepKind, string> = {
  place: "어디로 갔을까요?",
  problem: "무슨 일이 생겼을까요?",
  action: "어떻게 했을까요?",
  result: "그래서 어떻게 됐을까요?",
};
export const STEP_LABEL: Record<StepKind, string> = {
  place: "장소", problem: "문제", action: "행동", result: "결과",
};

/** 네 칸 사이에 더 묻는 칸 — 함께 나오는 인물 · 문제 때 기분 · 마지막 기분.
 *  2026-10-27 로컬 시험, 회의에서 빼면 지운다 (docs/open-decisions.md 0-11).
 *  단계(stage)가 아니라서 아래 네 점 · S-10 순서 맞추기 · 쪽 배치는 그대로다 */
export type ExtraKind = "who" | "feelProblem" | "feelResult";
/** S-07 에서 묻는 칸 하나 */
export type AskKind = StepKind | ExtraKind;
export const isStep = (k: AskKind): k is StepKind => (STEP_ORDER as string[]).includes(k);
/** 더 묻는 칸이 어느 단계에 붙나. 그 칸에서는 아래 네 점 중 이 단계 점이 켜진다 */
export const EXTRA_STAGE: Record<ExtraKind, StepKind> = {
  who: "place", feelProblem: "problem", feelResult: "result",
};
export const ASK_QUESTION: Record<AskKind, string> = {
  ...STEP_QUESTION,
  who: "누가 함께 나올까요?",
  feelProblem: "그때 기분이 어땠을까요?",
  feelResult: "마지막에 기분이 어땠을까요?",
};

export interface StepChoice { id: string; iconUrl: string; label: string }

/** 백엔드 계약 2-6 의 이야기. 문장은 `text` 한 덩어리로 오고,
 *  S-09·S-10 이 `sentences()` (src/lib.ts) 로 문장 단위로 나눠 쓴다 */
export interface Story {
  storyId: string;
  characterId: string;
  /** 서버에는 없다. 목록(S-12·S-13)에 띄우려고 장소로 만든다 */
  title: string;
  createdAt: string;
  /** 고른 장소 낱말 (서버 place — 카드 라벨이거나 아이가 말한 곳). 장면 칸에 깔 장소를 고른다 */
  place?: string;
  text: string;
  audioUrl: string | null;
  /** 서버가 렌더한 MP4. 목 AI 에서는 원본 그림 URL 이 오고, 목 엔진에서는 null 이다 */
  animationUrl: string | null;
  /** 배경을 잘라 낸 캐릭터 정지 그림 — 이 이야기의 사본 (서버 still_url, 2026-11-03).
   *  영상이 없는 쪽 · 완료 화면 · 표지에 쓴다. 새로고침 · 책장에서 다시 열어도 있다 */
  stillUrl?: string | null;
  /** 정지 그림 안 주인공 손 위치 {l, r: [x, y]} 0~1 (l 은 그림 왼쪽) — 대본에서 주인공이 든 소품을 손에 (서버 still_hands, 11/4) */
  stillHands?: { l: number[]; r: number[] } | null;
  /** 짧은 이야기: 동작 영상(animationUrl)의 바탕이 투명한 프레임 묶음과 행동 카드의 동작 (2026-11-03).
   *  화면이 짧은 이야기도 네 쪽으로 나눠 긴 이야기와 같은 책 화면(장면 층)으로 보인다 */
  spriteUrl?: string | null;
  sprite?: { frames: number; box: [number, number, number, number] } | null;
  actionMotion?: string;
  /** 긴 이야기(S-13 「이야기 길이: 길게」)일 때만. 네 칸을 뼈대로 한 쪽 단위 그림책 (서버 `book`) */
  book?: Book | null;
  /** 이 이야기를 만들 때 고른 카드 id (프론트만, 서버에는 없다). 내 소품을 어느 쪽에 얹을지 정한다 (open-decisions 0-13) */
  picks?: Partial<Record<StepKind, string>>;
  /** 보호자 모드에서 만든 이야기인지 (프론트만). 아이가 만든 소품은 이런 이야기에만 나온다 (open-decisions 0-13) */
  guardian?: boolean;
  /** 주인공 그림의 형태 (pt_docs 19). 장면에 세울 크기 기준(hero.fit)을 고른다. 서버에는 캐릭터에 있다 — 화면이 이야기에 붙여 둔다 */
  form?: string;
  /** 옆모습 주인공의 머리 쪽 (서버 hero_facing, 11/4). 렌더는 머리 쪽으로 걷는다 — 반대쪽으로 옮겨 갈 때 장면이 뒤집는다 */
  heroFacing?: "left" | "right" | null;
  /** 책장(S-12) 표지에 쓸 아이 그림 작은 사본 (data URL, 프론트만 · 서버에 보내지 않음). 없으면 고른 장소 그림 */
  cover?: string;
}

/** 긴 이야기의 한 쪽. stage 는 아이가 고른 네 칸 중 어디에서 나온 쪽인지 */
export interface BookPage {
  page: number;
  stage: StepKind;
  /** 그 쪽에서 캐릭터가 하는 동작 (idle · walk · run · jump · wave · dance). 서버가 쪽 영상으로 렌더한다 */
  action: string;
  text: string;
  /** 이 쪽에 그대로 들어간 아이 말. 있으면 「내가 말한 부분」으로 보인다 */
  childWords: string;
  /** 이 쪽 MP3. 없으면 브라우저 TTS 로 읽는다 */
  audioUrl?: string | null;
  /** 이 쪽 동작 MP4 (같은 동작이면 같은 파일). 없으면 멈춘 그림 · 목 엔진은 캔버스 */
  animationUrl?: string | null;
  /** 같은 동작의 바탕이 투명한 프레임 묶음 WebP (정사각 칸 · 가로 8칸, 2026-11-03).
   *  있으면 S-09 가 장면 배경 · 물건과 층으로 쌓는다(`features/scene`). 없으면 MP4 */
  spriteUrl?: string | null;
  /** 프레임 묶음의 장 수와 첫 장의 그림 자리 [left, top, right, bottom] (칸 대비 0~1). 서버가 잰다 */
  sprite?: { frames: number; box: [number, number, number, number] } | null;
  /** 대본의 장면 계획 — 세부 장소 id(`school-cafeteria` 등)와 영어 배경 문장. 틀 문장 그림책 · 예전 이야기는 없음 */
  scene?: { location?: string; background?: string; characters?: { name: string; slot: string }[] } | null;
}

export interface Book {
  title: string;
  pages: BookPage[];
  /** S-10 순서 맞추기에 쓸 쪽 번호. 장소 · 문제 · 행동 · 결과 순 */
  orderPages: number[];
  /** 대본에 나오는 인물 이름 → 영어 생김새. 장면 층이 어른 · 아이 그림을 고르는 데 쓴다 */
  characterSheet?: Record<string, string>;
}

/** S-13 「이야기 길이」. short: 네 칸 → 네 문장 · long: 네 칸을 뼈대로 쪽 단위 그림책 (서버 `length`) */
export type StoryLength = "short" | "long";

/** C-03 전체 진행 표시 구간. 그림 → 친구 → 이야기 → 놀이 */
export type Segment = 1 | 2 | 3 | 4 | null;

export type SupportLevel = 1 | 2 | 3;
/** S-13 「읽어주기」. 나레이터 하나로 읽을지, 대사를 등장인물 목소리로 읽을지 (서버 `voice_mode`) */
export type VoiceMode = "narration" | "characters";
/** S-13 「주인공 목소리」. 캐릭터 목소리 판에서 주인공 「나」의 대사 목소리 (서버 `protagonist_voice`).
 *  주인공은 아이가 그린 그림이라 어른이 고른다 */
export type ProtagonistVoice = "girl" | "boy";
export interface Settings {
  level: SupportLevel;
  muteAll: boolean;
  keepOriginal: boolean;
  diagnostics: boolean;
  /** S-07 말로 덧붙이기(STT). 아이 목소리가 브라우저 인식 서버로 가므로 어른이 켠다. 기본 꺼짐.
   *  「어른과 함께」 묶음(F-SET-06) — 로그인한 보호자만 켤 수 있다. 화면에서는 `useWithAdult()` 로 읽는다 */
  voiceInput: boolean;
  /** S-03 사진으로 그림 올리기(F-DRW-02). 사람 사진 · 남의 그림이 올라올 수 있어 어른이 켠다. 기본 꺼짐.
   *  「어른과 함께」 묶음(F-SET-06). 꺼져 있으면 S-03 에 찍기 · 앨범 버튼이 없다 */
  photoUpload: boolean;
  /** 새로 만드는 이야기부터 적용된다. 기본 나레이션 */
  voiceMode: VoiceMode;
  protagonistVoice: ProtagonistVoice;
  /** S-13 「내 목소리로 읽어주기」 (2026-11-02). 보호자가 등록한 목소리로 나레이션을 읽는다.
   *  「어른과 함께」 묶음 — 로그인한 보호자가 동의하고 녹음해야 켜진다. 화면에서는 `useWithAdult().myVoice` */
  guardianNarrator: boolean;
  /** S-13 「보호자 모드」 켜기 · 끄기 (2026-11-03 사용자). 로그인한 보호자만. 끄면 「어른과 함께」 기능이 모두 꺼진 것으로 본다.
   *  켜면 S-05 에서 관절이 정상이어도 고칠 수 있다. 예전 설정(없음)은 「어른과 함께」를 하나라도 켰으면 켜진 것으로 */
  guardianMode: boolean;
  /** S-09 「읽어주기 빠르기」 (2026-11-02, 장면 쪽 진행 바 옆에서 고르고 다음 이야기에도 남는다). 이야기 음성 파일 · 브라우저 음성 · 안내 음성 모두에 곱한다.
   *  서버 음성은 다시 만들지 않고 재생 속도만 바꾼다 (ElevenLabs v4 는 speed 를 무시하고, 저장본을 다시 쓰려고) */
  speechRate: number;
  /** 소리 크기 0~1 (위 줄 소리 버튼에서 작게 · 보통 · 크게, 2026-11-03). 안내 · 이야기 음성 모두 */
  volume: number;
  /** S-13 「이야기 길이」. 기본은 긴 이야기 (사용자, 2026-10-12 「일단은 긴 이야기로」) */
  storyLength: StoryLength;
}
