import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Scene } from "@/components/illust";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { sentences, speak, stopSpeak } from "@/lib";

/** 서버가 렌더한 애니메이션과 이야기 문장 (백엔드 계약 2-6).
 *  음성 파일이 오면 그것을, 없으면 브라우저 TTS 로 한 문장씩 읽으며 그 문장을 짚는다. */
export default function S09Story() {
  const nav = useNavigate();
  const { story, imageUrl, keypoints } = useSession();
  const muteAll = useSettings((s) => s.muteAll);
  const [at, setAt] = useState<number | null>(null);
  const [loop, setLoop] = useState(false);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const audio = useRef<HTMLAudioElement | null>(null);

  const lines = useMemo(() => sentences(story?.text ?? ""), [story]);

  useEffect(() => () => { stopSpeak(); audio.current?.pause(); }, []);
  if (!story) { nav("/", { replace: true }); return null; }

  const stop = () => { stopSpeak(); audio.current?.pause(); setAt(null); };

  const readFrom = (n: number) => {
    if (n >= lines.length) {
      if (loopRef.current) readFrom(0); else setAt(null);
      return;
    }
    setAt(n);
    speak(lines[n], muteAll, () => readFrom(n + 1));
  };

  const play = () => {
    if (at !== null) { stop(); return; }
    if (story.audioUrl) {
      const a = audio.current ?? new Audio(story.audioUrl);
      audio.current = a;
      a.loop = loop;
      a.onended = () => setAt(null);
      a.currentTime = 0;
      void a.play();
      setAt(-1); // 파일 하나로 읽으므로 짚는 문장이 없다
    } else {
      readFrom(0);
    }
  };

  // 목 AI 는 animation_url 에 원본 그림을 넣어 보낸다. MP4 가 아니면 그림으로 보여준다
  const isVideo = !!story.animationUrl && /\.mp4(\?|$)/i.test(story.animationUrl);

  return (
    <Screen back="/" speech={story.text} segment={4} autoSpeak={false}
      acts={<BigButton go onClick={() => { stop(); nav("/order"); }}>순서 맞추기</BigButton>}>
      <div className="stage">
        {isVideo
          ? <video src={story.animationUrl!} autoPlay loop muted playsInline
                   style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          : story.animationUrl
            ? <img src={story.animationUrl} alt="" style={{ maxHeight: "100%", objectFit: "contain" }} />
            : imageUrl && keypoints
              ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion="wave" />
              : <div className="illust-wrap"><Scene n={0} /></div>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        {lines.map((line, n) => (
          <span key={n} className={`said ${at === n ? "now" : ""}`}>{line}</span>
        ))}
      </div>

      <div className="row" style={{ flex: "0 0 auto" }}>
        <BigButton disabled={muteAll} onClick={play} nudgeOnDisabled={false}>
          {at !== null ? "멈추기" : "들려주기"}
        </BigButton>
        <BigButton onClick={() => setLoop((v) => !v)}>{loop ? "반복 켜짐" : "반복"}</BigButton>
      </div>
    </Screen>
  );
}
