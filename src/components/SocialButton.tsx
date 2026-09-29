import { useRef } from "react";
import { PROVIDERS, socialAvailable, startSocialLogin } from "@/api/auth";
import type { SocialIntent, SocialProvider } from "@/api/auth";

/** 버튼 그림은 세 곳의 공식 리소스를 고치지 않고 그대로 쓴다 (public/brand/{제공자}/README.txt).
 *  가이드상 문구가 정해져 있어서(「카카오 로그인」 등) 가입 화면에서도 같은 버튼이다.
 *  구글은 공식 파일에 한국어판이 없어 영어 그대로다. */
const IMAGE: Record<SocialProvider, { src: string; alt: string }> = {
  kakao: { src: "/brand/kakao/kakao_login_kr_medium.svg", alt: "카카오 로그인" },
  naver: { src: "/brand/naver/NAVER_login_Light_KR_green_narrow_H56.png", alt: "네이버 로그인" },
  google: { src: "/brand/google/signin_light_square.svg", alt: "Google 계정으로 로그인" },
};

/** 세 버튼을 같은 폭으로 맞춘다. 높이는 각 리소스 비율대로 53~63px */
const WIDTH = 260;

/** 어른 화면(S-15·S-16)의 소셜 로그인 버튼 묶음. client id 가 없는 제공자는 빠진다.
 *  --grape 를 쓰지 않는다. 한 화면의 주된 행동은 이메일 쪽 버튼이다.
 *  터치 영역은 최소 60px — 어른 화면 기준 (AGENTS.md 3.4) */
export default function SocialButtons({
  intent, disabled = false,
}: { intent: SocialIntent; disabled?: boolean }) {
  const lock = useRef(false);
  const shown = PROVIDERS.filter(socialAvailable);
  if (shown.length === 0) return null;

  const go = (p: SocialProvider) => {
    if (disabled || lock.current) return;   // 떠나는 동안 두 번 눌러도 한 번만
    lock.current = true;
    startSocialLogin(p, intent);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {shown.map((p) => (
        <button key={p} type="button" onClick={() => go(p)} disabled={disabled}
          aria-label={IMAGE[p].alt}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: 60, background: "none", padding: 0,
            opacity: disabled ? 0.45 : 1, cursor: disabled ? "default" : "pointer",
          }}>
          <img src={IMAGE[p].src} alt={IMAGE[p].alt}
            style={{ width: WIDTH, height: "auto", display: "block" }} />
        </button>
      ))}
    </div>
  );
}
