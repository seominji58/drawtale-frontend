import { LockIcon } from "./Screen";
import { useGuardian } from "@/store/guardian";
import { useSettings } from "@/store/settings";
import type { Settings } from "@/types/story";

/** 보이되 잠그기 (pt_docs 20 3-2 ⑤, 2026-11-06) — 보호자 기능이 꺼져 있어도 아이 화면에 자물쇠와 한 줄 설명으로 보인다.
 *  누르면 보호자 비밀번호 창. 맞으면 보호자 모드와 그 기능(turnOn)을 켜고 onOpen.
 *  전에는 보호자 모드가 꺼져 있으면 버튼 자체가 없어서 이런 기능이 있는 줄 몰랐다 (11/5 사용자) */
export default function LockedFeature({ label, turnOn = [], onOpen }: {
  label: string;
  /** 비밀번호가 맞으면 함께 켤 설정 (보호자 모드는 늘 켠다) */
  turnOn?: (keyof Settings)[];
  onOpen?: () => void;
}) {
  const ask = useGuardian((s) => s.ask);
  const open = () => ask(label, () => {
    const set = useSettings.getState().set;
    set("guardianMode", true);
    for (const k of turnOn) set(k, true as never);
    onOpen?.();
  });
  return (
    <button type="button" className="locked-feature" onClick={open}>
      <LockIcon />
      <span>{label}<small>보호자 비밀번호를 넣으면 쓸 수 있어요</small></span>
    </button>
  );
}
