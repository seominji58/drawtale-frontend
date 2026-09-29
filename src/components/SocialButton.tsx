import { useRef } from "react";
import { socialAvailable, startSocialLogin } from "@/api/auth";
import type { SocialIntent, SocialProvider } from "@/api/auth";

/** 버튼 그림은 카카오 공식 리소스를 고치지 않고 그대로 쓴다 (public/brand/kakao/README.txt).
 *  가이드상 문구는 「카카오 로그인」·「로그인」 둘뿐이라 가입 화면에서도 같은 버튼이다. */
const IMAGE: Record<SocialProvider, { src: string; alt: string }> = {
  kakao: { src: "/brand/kakao/kakao_login_kr_large.svg", alt: "카카오 로그인" },
};

/** 어른 화면(S-15·S-16)의 소셜 로그인 버튼.
 *  --grape 를 쓰지 않는다. 한 화면의 주된 행동은 이메일 쪽 버튼이다.
 *  높이 60px — 어른 화면 터치 타깃 (AGENTS.md 3.4) */
export default function SocialButton({
  provider, intent, disabled = false,
}: { provider: SocialProvider; intent: SocialIntent; disabled?: boolean }) {
  const lock = useRef(false);
  if (!socialAvailable(provider)) return null;

  const go = () => {
    if (disabled || lock.current) return;   // 떠나는 동안 두 번 눌러도 한 번만
    lock.current = true;
    startSocialLogin(provider, intent);
  };

  const img = IMAGE[provider];
  return (
    <button type="button" onClick={go} disabled={disabled} aria-label={img.alt}
      style={{
        display: "flex", justifyContent: "center", background: "none", padding: 0,
        opacity: disabled ? 0.45 : 1, cursor: disabled ? "default" : "pointer",
      }}>
      <img src={img.src} alt={img.alt} style={{ height: 60, width: "auto", display: "block" }} />
    </button>
  );
}
