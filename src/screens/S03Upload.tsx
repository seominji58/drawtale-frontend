import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Paper } from "@/components/illust";
import { useSession } from "@/store/session";
import { shrink, speak } from "@/lib";
import { useSettings } from "@/store/settings";
import { ENGINE } from "@/api";
import { makeSampleDrawing } from "@/api/mock/sample";

/** E-01 UNSUPPORTED_IMAGE 와 같은 말. 오류 화면으로 보내지 않고 이 화면에서 알린다 */
const REJECTED = "이 그림은 열 수 없어요. 다른 그림을 골라 볼까요?";

export default function S03Upload() {
  const nav = useNavigate();
  const { imageUrl, setFile } = useSession();
  const camera = useRef<HTMLInputElement>(null);
  const album = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  /** 10MB 초과이거나 이미지가 아니어서 받지 않은 파일 (S-03-09). 업로드 전에 막고 아이 말로 알린다 */
  const [rejected, setRejected] = useState(false);
  const muteAll = useSettings((s) => s.muteAll);

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
    setBusy(true);
    setFile(await shrink(f));           // 긴 변 1600px, JPEG 0.85 로 줄여서 보낸다
    setBusy(false);
  };

  return (
    <Screen back="/guide" segment={1}
      speech={imageUrl ? "이 그림으로 할까요?" : "그림을 찍어 볼까요?"}
      acts={imageUrl ? (
        <>
          <BigButton onClick={() => setFile(null)}>다시 고르기</BigButton>
          <BigButton go disabled={busy} onClick={() => nav("/analyzing")}>이 그림으로</BigButton>
        </>
      ) : (
        <>
          <BigButton go onClick={() => camera.current?.click()}>그림 찍기</BigButton>
          {/* S-03D. 종이 그림과 나란히 둔다 (open-decisions 0-4) */}
          <BigButton onClick={() => nav("/draw")}>화면에 그리기</BigButton>
          <BigButton onClick={() => album.current?.click()}>앨범에서 고르기</BigButton>
        </>
      )}>
      <div className={`stage ${imageUrl ? "" : "empty"}`}>
        {imageUrl
          ? <img src={imageUrl} alt="고른 그림" style={{ maxHeight: "100%", objectFit: "contain" }} />
          : <div className="illust-wrap"><Paper /></div>}
      </div>
      {!imageUrl && (
        <>
          {rejected
            ? <div className="box warn">{REJECTED}</div>
            : <p className="hint">종이에 그린 그림을 찍거나, 화면에 그려 주세요</p>}
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
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={album} type="file" accept="image/*" hidden onChange={onPick} />
    </Screen>
  );
}
