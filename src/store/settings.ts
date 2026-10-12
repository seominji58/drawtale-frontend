import { create } from "zustand";
import type { Settings, SupportLevel } from "@/types/story";

const KEY = "storyblanks.settings";
const DEFAULTS: Settings = { level: 2, muteAll: false, keepOriginal: false, diagnostics: false, voiceInput: false };

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
    const { level, muteAll, keepOriginal, diagnostics, voiceInput } = get();
    const next = { level, muteAll, keepOriginal, diagnostics, voiceInput, [key]: value };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 저장 실패는 무시 */ }
    if (key === "level") document.documentElement.dataset.level = String(value);
  },
}));

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
