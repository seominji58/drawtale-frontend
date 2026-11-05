import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Paper } from "@/components/illust";
import { useSession } from "@/store/session";
import { rotateFile, shrink, speak } from "@/lib";
import { useSettings, useWithAdult } from "@/store/settings";
import { ENGINE } from "@/api";
import { makeSampleDrawing } from "@/api/mock/sample";

/** E-01 UNSUPPORTED_IMAGE 와 같은 말. 오류 화면으로 보내지 않고 이 화면에서 알린다 */
const REJECTED = "이 그림은 열 수 없어요. 다른 그림을 골라 볼까요?";

export default function S03Upload() {
  const nav = useNavigate();
  const { imageUrl, file, setFile, drawnAs } = useSession();
  /** 「돌리기」: 고른 원본과 돌린 횟수(시계 방향 90도씩). 누를 때마다 원본에서 새로 돌려 보인다 — 돌린 그림을 또 돌리면 화질이 준다 */
  const [orig, setOrig] = useState<File | null>(null);
  const [turn, setTurn] = useState(0);
  const rotate = async () => {
    const base = orig ?? file;
    if (!base) return;
    const t = (turn + 1) % 4;
    setBusy(true);
    try { setFile(await rotateFile(base, t)); setOrig(base); setTurn(t); } finally { setBusy(false); }
  };
  const album = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  /** 10MB 초과이거나 이미지가 아니어서 받지 않은 파일 (S-03-09). 업로드 전에 막고 아이 말로 알린다 */
  const [rejected, setRejected] = useState(false);
  const muteAll = useSettings((s) => s.muteAll);
  // S-03-03 · S-03-05 는 「어른과 함께」에서 사진 올리기를 켰을 때만 있다 (pt_docs 05 S-03, F-SET-06).
  // 기본 경로는 S-03-04 화면에 그리기
  const { photo } = useWithAdult();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024 || !f.type.startsWith("image/")) {
      setRejected(true);
      speak(REJECTED, muteAll);
      return;
    }
    setRejected(false);
    setOrig(null); setTurn(0);
    setBusy(true);
    try {
      setFile(await shrink(f));         // 긴 변 1600px, JPEG 0.85 로 줄여서 보낸다
    } catch {
      // 브라우저가 열지 못한 그림 (HEIC 등). 받지 않은 파일과 같이 알린다 (S-03-09)
      setRejected(true);
      speak(REJECTED, muteAll);
    }
    setBusy(false);
  };

  return (
    <Screen back="/guide" segment={1}
      speech={imageUrl ? "머리가 위로 오게 돌려 주세요. 이 그림으로 할까요?" : photo ? "그림을 찍어 볼까요?" : "화면에 그려 볼까요?"}
      acts={imageUrl ? (
        <>
          <BigButton onClick={() => { setOrig(null); setTurn(0); setFile(null); }}>다시 고르기</BigButton>
          {/* 누운 그림을 바르게 (pt_docs 19 7-1) — 사람 · 동물 모두 머리가 위, 다리가 아래로 */}
          <BigButton disabled={busy} onClick={rotate}>돌리기 ↻</BigButton>
          {/* 다음은 「누구를 그렸어요?」 — 그림의 몸 구조를 고른다 (S03Form, pt_docs 19) */}
          {/* 화면에 그린 그림은 그리기 전에 형태를 골랐다 — 다시 묻지 않는다 */}
          <BigButton go disabled={busy} onClick={() => nav(drawnAs ? "/analyzing" : "/form")}>이 그림으로</BigButton>
        </>
      ) : (
        <>
          {/* S-03-04 화면에 그리기가 주된 행동이다 (pt_docs 05 S-03) */}
          {/* 무엇을 그릴지(형태) 먼저 고르고 그 모양 안내선으로 그린다 (11/5 사용자 「그리기도 형태를 가이드해서」) */}
          <BigButton go onClick={() => nav("/form", { state: { draw: true } })}>화면에 그리기</BigButton>
          {/* 찍기 · 앨범을 하나로 (11/5 사용자). capture 가 없는 파일 고르기는 휴대폰 · 태블릿에서 「카메라 / 사진 보관함 / 파일」을
              고르는 창을 먼저 띄운다(iOS 사파리 · 안드로이드 크롬). 컴퓨터는 파일 고르기 창 */}
          {photo && <BigButton onClick={() => album.current?.click()}>그림 올리기</BigButton>}
        </>
      )}>
      {imageUrl ? (
        <div className="stage">
          <img src={imageUrl} alt="고른 그림" style={{ maxHeight: "100%", objectFit: "contain" }} />
        </div>
      ) : (
        // 빈 상자 대신 테이프 붙인 도화지 + 큰 안내 (2026-10-28 디자인)
        <div className="hero">
          <div className="stage hero-sheet"><div className="illust-wrap"><Paper /></div></div>
          <div className="hero-side">
            <h2 className="hero-title">{photo ? "그림을 보여 줄래요?" : "화면에 그려 볼까요?"}</h2>
            <p className="hero-sub">{photo ? "종이에 그린 그림을 올리거나, 화면에 그려 주세요" : "손가락으로 쓱쓱 그리면 친구가 돼요"}</p>
            <ul className="hero-tips">
              {/* 사람 · 동물 · 새 · 물고기 … 모든 형태에 맞게 (11/5) */}
              <li>친구를 한 명(한 마리)만</li>
              <li>팔다리 · 날개 · 꼬리는 몸에서 조금 떨어지게</li>
              {photo && <li>하얀 종이 위에, 밝은 곳에서</li>}
            </ul>
          </div>
        </div>
      )}
      {!imageUrl && (
        <>
          {rejected && <div className="box warn">{REJECTED}</div>}
          {ENGINE === "mock" && (
            <div className="aside-links">
              <span>확인용</span>
              <button className="btn link"
                onClick={async () => { setBusy(true); setFile(await makeSampleDrawing()); setBusy(false); }}>
                샘플 그림으로 해보기
              </button>
            </div>
          )}
        </>
      )}
      {photo && <input ref={album} type="file" accept="image/*" hidden onChange={onPick} />}
    </Screen>
  );
}
