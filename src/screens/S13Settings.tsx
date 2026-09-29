import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { useLibrary } from "@/store/library";
import type { SupportLevel } from "@/types/story";

function Row({ name, desc, children }: { name: string; desc: string; children: ReactNode }) {
  return (
    <div className="item">
      <span className="grow">
        <span className="name">{name}</span>
        <span className="desc">{desc}</span>
      </span>
      {children}
    </div>
  );
}

export default function S13Settings() {
  const nav = useNavigate();
  const s = useSettings();
  const { mode, account, logout } = useAuth();
  const { stories, remove } = useLibrary();

  return (
    <Screen back="/" speech={null} title="어른 설정" audience="adult" autoSpeak={false}
      acts={<BigButton onClick={() => nav("/")}>닫기</BigButton>}>
      <div className="list scroll">
        <Row name="계정" desc={mode === "member" ? (account ?? "로그인됨") : "로그인 없이 사용 중입니다"}>
          <button className="btn link" onClick={mode === "member" ? logout : () => nav("/login")}>
            {mode === "member" ? "로그아웃" : "로그인"}
          </button>
        </Row>

        <Row name="지원 수준" desc="아동의 사용을 돕는 수준을 선택하세요">
          <span className="seg">
            {[1, 2, 3].map((n) => (
              <button key={n} className={s.level === n ? "on" : ""}
                onClick={() => s.set("level", n as SupportLevel)}>{n}</button>
            ))}
          </span>
        </Row>

        <Row name="소리 전체 끄기" desc="모든 음성과 효과음을 끕니다. 교실에서 쓸 때 켜세요">
          <input type="checkbox" checked={s.muteAll}
            onChange={(e) => s.set("muteAll", e.target.checked)}
            className="tog" />
        </Row>
        <Row name="원본 그림 보관" desc="분석 후에도 원본 이미지를 보관합니다">
          <input type="checkbox" checked={s.keepOriginal}
            onChange={(e) => s.set("keepOriginal", e.target.checked)}
            className="tog" />
        </Row>
        <Row name="진단 모드" desc="화면에 단계명과 소요 시간, 사용된 엔진 이름을 표시합니다">
          <input type="checkbox" checked={s.diagnostics}
            onChange={(e) => s.set("diagnostics", e.target.checked)}
            className="tog" />
        </Row>

        {stories.map((st) => (
          <Row key={st.storyId} name={st.title} desc={`${st.createdAt}에 만들었어요`}>
            <button className="btn link" style={{ color: "var(--berry)" }}
              onClick={() => { if (confirm("이 이야기를 지울까요?")) remove(st.storyId); }}>
              삭제
            </button>
          </Row>
        ))}
      </div>
    </Screen>
  );
}
