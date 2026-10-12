import { create } from "zustand";
import type { Settings, SupportLevel } from "@/types/story";
import { useAuth } from "@/store/auth";

const KEY = "storyblanks.settings";
const DEFAULTS: Settings = {
  level: 2, muteAll: false, keepOriginal: false, diagnostics: false, voiceInput: false, voiceMode: "narration", protagonistVoice: "girl",
  photoUpload: false, storyLength: "long",
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),
  set: (key, value) => {
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

/** 지원 수준별 화면 구성값. 설계서 2.1 */
export const LEVEL_CONFIG: Record<SupportLevel, {
  choiceCount: number; autoSpeak: boolean; confirmStep: boolean; showLabel: boolean;
}> = {
  1: { choiceCount: 2, autoSpeak: true, confirmStep: true, showLabel: false },
  2: { choiceCount: 4, autoSpeak: true, confirmStep: false, showLabel: true },
  3: { choiceCount: 6, autoSpeak: false, confirmStep: false, showLabel: true },
};
