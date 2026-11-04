import { create } from "zustand";
import { PARENT } from "./skeleton";
import { JOINT_ORDER } from "@/types/character";
import type { JointName } from "@/types/character";

/** 형태 — 그림의 몸 구조 (2족형 · 4족형 …, pt_docs 19). 서버 `GET /api/v1/forms` 가 준다 (계약 2-13).
 *  관절 이름 · 부모 · 화면 이름 · 안내는 형태마다 다르다 — 화면 코드에 적지 않고 여기서 받아 그린다 */
export interface FormJoint { name: string; parent: string; label: string }
export interface FormDef {
  id: string;
  label: string;
  /** humanoid = 1단계 「두 발로 서는 친구」, nonhumanoid = 「다른 모습 친구」 → 2단계에서 고른다 */
  group: "humanoid" | "nonhumanoid";
  kid_label: string;
  examples: string[];
  view?: string;
  joints: FormJoint[];
  guide?: string[];
  /** 장면에 세울 때 키(height) / 몸길이(width) 기준 */
  hero?: { fit: "height" | "width"; facing?: string };
  ready?: boolean;
}

/** S-06-03 관절 이름. hand·foot 은 모델 이름이고 실제로는 손목·발목이다 (open-decisions 3번).
 *  neck 은 Meta 모델에서 얼굴 가운데라서 「얼굴」로 적는다 */
const BIPED_NAMES: Record<JointName, string> = {
  neck: "얼굴", torso: "몸통", hip: "엉덩이",
  right_shoulder: "오른쪽 어깨", right_elbow: "오른쪽 팔꿈치", right_hand: "오른쪽 손목",
  left_shoulder: "왼쪽 어깨", left_elbow: "왼쪽 팔꿈치", left_hand: "왼쪽 손목",
  right_hip: "오른쪽 골반", right_knee: "오른쪽 무릎", right_foot: "오른쪽 발목",
  left_hip: "왼쪽 골반", left_knee: "왼쪽 무릎", left_foot: "왼쪽 발목",
};

/** 서버에서 못 받았을 때 · 목 엔진의 2족형 (서버 것과 관절 이름 · 부모 · 화면 이름이 같다) */
export const BIPED: FormDef = {
  id: "biped", label: "2족형", group: "humanoid", kid_label: "두 발로 서는 친구",
  examples: ["사람", "곰인형", "펭귄"], view: "front",
  joints: JOINT_ORDER.map((n) => ({ name: n, parent: PARENT[n] ?? "root", label: BIPED_NAMES[n] })),
  guide: ["점을 끌어서 그림의 관절 자리에 맞춰 주세요. 목록을 누르면 그 점이 커져요"],
  hero: { fit: "height", facing: "front" }, ready: true,
};

interface FormsState {
  forms: FormDef[];
  loaded: boolean;
  load: () => Promise<void>;
}

export const useForms = create<FormsState>((set, get) => ({
  forms: [BIPED],
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    const { fetchForms } = await import("@/api");   // api 가 이 파일의 타입을 쓰므로 순환을 피한다
    try {
      const got = await fetchForms();
      set({ forms: got.length ? got : [BIPED], loaded: true });
    } catch {
      set({ forms: [BIPED], loaded: true });          // 사람 그림은 지금처럼
    }
  },
}));

/** 그 형태의 정의. 모르면 2족형 */
export const formOf = (id?: string | null): FormDef =>
  useForms.getState().forms.find((f) => f.id === (id ?? "biped")) ?? BIPED;
export const useForm = (id?: string | null): FormDef =>
  useForms((s) => s.forms.find((f) => f.id === (id ?? "biped")) ?? BIPED);

/** 관절 이름 (찍는 순서) */
export const orderOf = (f: FormDef): string[] => f.joints.map((j) => j.name);
/** 점을 잇는 뼈 (부모 → 자식). 뿌리(root)는 보이지 않는 자리라 잇지 않는다 */
export const bonesOf = (f: FormDef): [string, string][] =>
  f.joints.filter((j) => j.parent && j.parent !== "root").map((j) => [j.parent, j.name]);
export const labelOf = (f: FormDef, name: string): string => f.joints.find((j) => j.name === name)?.label ?? name;
