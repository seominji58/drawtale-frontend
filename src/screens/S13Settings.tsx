import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { useLibrary } from "@/store/library";
import type { SupportLevel } from "@/types/story";
import { voiceSupported } from "@/features/story/voice";

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
        {/* 아이 목소리는 개인정보다. 어디로 가는지 켜는 사람이 알고 켠다 */}
        <Row name="목소리로 덧붙이기"
          desc={voiceSupported()
            ? "이야기를 만들 때 아이가 마이크로 한마디 덧붙일 수 있습니다. 목소리는 이 브라우저의 음성 인식 서버(브라우저 회사)로 보내져 글자로 바뀌며, 녹음 파일은 저장하지 않습니다"
            : "이 브라우저는 음성 인식을 지원하지 않습니다. 크롬이나 사파리에서 켤 수 있습니다"}>
          <input type="checkbox" checked={s.voiceInput} disabled={!voiceSupported()}
            onChange={(e) => s.set("voiceInput", e.target.checked)}
            className="tog" />
        </Row>
        <Row name="원본 그림 보관" desc="끄면 그 그림을 다 쓰고 나갈 때(처음으로 · 새 그림 · 탭 닫기) 서버에서 지웁니다. 늦어도 하루 뒤에는 지웁니다. 관절과 만든 이야기는 남습니다">
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
