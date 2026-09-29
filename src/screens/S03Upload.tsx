import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Paper } from "@/components/illust";
import { useSession } from "@/store/session";
import { shrink } from "@/lib";
import { ENGINE } from "@/api";
import { makeSampleDrawing } from "@/api/mock/sample";

export default function S03Upload() {
  const nav = useNavigate();
  const { imageUrl, setFile } = useSession();
  const camera = useRef<HTMLInputElement>(null);
  const album = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || f.size > 10 * 1024 * 1024 || !f.type.startsWith("image/")) return;
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
          <p className="hint">종이에 그린 그림을 찍거나, 화면에 그려 주세요</p>
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
