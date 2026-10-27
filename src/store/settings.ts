import { create } from "zustand";
import type { Settings, SupportLevel } from "@/types/story";
import { useAuth } from "@/store/auth";

const KEY = "storyblanks.settings";

/** 지원 수준을 없애고 한 가지로 고정한다 (2026-10-27 사용자 결정 — 카드는 단계마다 4장 고정, open-decisions 0-12).
 *  카드 모드의 이야기를 조합마다 미리 만들어 두려면 보이는 카드가 하나로 정해져야 한다 (4장 → 256가지).
 *  null 로 바꾸면 예전처럼 S-13 에서 1 · 2 · 3 을 고른다. 고정값은 수준 2 의 구성(카드 4장 · 글자 · 자동 읽기 · 확인 단계) */
export const FIXED_LEVEL: SupportLevel | null = 2;
const DEFAULTS: Settings = {
  level: 2, muteAll: false, keepOriginal: false, diagnostics: false, voiceInput: false, voiceMode: "narration", protagonistVoice: "girl",
  photoUpload: false, storyLength: "long",
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    return FIXED_LEVEL ? { ...s, level: FIXED_LEVEL } : s;
  } catch { return DEFAULTS; }
}

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),
  set: (key, value) => {
    if (key === "level" && FIXED_LEVEL) return;
    set({ [key]: value } as Partial<SettingsState>);
    const state = get();
    // 설정 키가 늘어도 빠뜨리지 않게 DEFAULTS 의 키를 그대로 저장한다
    const next: Record<string, unknown> = {};
    for (const k of Object.keys(DEFAULTS) as (keyof Settings)[]) next[k] = state[k];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 저장 실패는 무시 */ }
    if (key === "level") document.documentElement.dataset.level = String(value);
  },
}));

/** 「어른과 함께」 묶음 (pt_docs 03 F-SET-06, 01 NFR-15). 위험이 따르는 기능은 **로그인한 보호자가 켰을 때만** 쓴다.
 *  설정값이 켜져 있어도 로그인하지 않았으면 꺼진 것으로 본다 — 아이가 기기를 들고 있어도 로그인 없이는 켜지 못한다.
 *  꺼져 있으면 아이 화면에 그 버튼 자체가 없다. 「말로 이야기 만들기」(F-STY-09)는 아직 없어서 여기에도 없다 */
export function useWithAdult() {
  const member = useAuth((a) => a.mode === "member");
  const photoUpload = useSettings((s) => s.photoUpload);
  const voiceInput = useSettings((s) => s.voiceInput);
  return { member, photo: member && photoUpload, voice: member && voiceInput };
}

/** 보호자 모드 — 로그인한 보호자가 「어른과 함께」(사진 올리기 · 말로 덧붙이기) 중 하나라도 켰을 때.
 *  질문 칸 · 실시간 대본 화면이 생기기 전까지 이것을 보호자 모드로 본다 (2026-10-27).
 *  아이가 만든 소품(내 소품)은 보호자 모드에서만 쓴다 — 기본 모드는 미리 만든 저장본 · 기본 소품만 (open-decisions 0-13) */
export function useGuardianMode() {
  const { member, photo, voice } = useWithAdult();
  return member && (photo || voice);
}

/** 지원 수준별 화면 구성값. 설계서 2.1
 *
 *  2026-10-12: 기본값(2)에도 confirmStep 을 켰다. 아이가 카드를 보지 않고 누를 수 있다는
 *  의견이 나왔고, 확인 단계가 없으면 고른 것과 다른 이야기가 나와도 알아차리지 못한다.
 *  수준 3 은 글자를 읽고 스스로 확인할 수 있다고 보아 그대로 둔다. */
export const LEVEL_CONFIG: Record<SupportLevel, {
  choiceCount: number; autoSpeak: boolean; confirmStep: boolean; showLabel: boolean;
}> = {
  1: { choiceCount: 2, autoSpeak: true, confirmStep: true, showLabel: false },
  2: { choiceCount: 4, autoSpeak: true, confirmStep: true, showLabel: true },
  3: { choiceCount: 6, autoSpeak: false, confirmStep: false, showLabel: true },
};
