import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useAuth } from "@/store/auth";
import { setPendingJoin } from "@/features/family/join";

/** 선생님이 보낸 보호자 연결 링크 (`/join/:code`, 설계 「보호자-교사-계정」 4-4, 2026-11-18).
 *  코드를 이 탭에 맡겨 두고, 로그인했으면 처음 화면으로(JoinDialog 가 이어서 연결), 아니면 로그인 · 가입으로.
 *  로그인 전에는 아이 이름을 보이지 않는다 (링크가 다른 사람에게 가도 이름이 새지 않게) */
export default function SJoin() {
  const nav = useNavigate();
  const { code = "" } = useParams();
  const mode = useAuth((s) => s.mode);

  useEffect(() => {
    if (code) setPendingJoin(code);
    if (mode === "member") nav("/", { replace: true });
  }, [code, mode, nav]);

  return (
    <Screen back={null} speech={null} title="학교 기록 받기" audience="adult" autoSpeak={false}
      acts={<BigButton go onClick={() => nav("/login")}>로그인 · 가입하고 보기</BigButton>}>
      <div className="spacer" />
      <div className="paper-card" style={{ maxWidth: 560, margin: "0 auto", padding: "28px 32px" }}>
        <p className="rename-label">선생님이 아이의 학교 기록을 보내 드렸어요</p>
        <ul className="intro-lines">
          <li>로그인하면 학교에서 만든 그림 · 이야기를 집에서도 볼 수 있어요</li>
          <li>처음이면 가입(보호자 본인인증)을 거쳐요. 이미 집에서 쓰던 아이가 있으면 같은 아이로 합칠 수 있어요</li>
          <li>선생님은 학교에서 만든 것만 봐요. 집에서 만든 것은 보호자님이 켜야 보여요</li>
        </ul>
      </div>
      <div className="spacer" />
    </Screen>
  );
}
