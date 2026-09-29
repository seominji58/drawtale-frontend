import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Scene } from "@/components/illust";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { speak, stopSpeak } from "@/lib";

export default function S09Story() {
  const nav = useNavigate();
  const { story, imageUrl, keypoints } = useSession();
  const { level, muteAll } = useSettings();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);

  useEffect(() => stopSpeak, []);
  if (!story) { nav("/", { replace: true }); return null; }

  const scene = story.scenes[i];
  const last = i === story.scenes.length - 1;

  const play = () => {
    if (playing) { stopSpeak(); setPlaying(false); return; }
    setPlaying(true);
    speak(scene.sentence, muteAll);
    setTimeout(() => {
      setPlaying(false);
      if (loop) play();
    }, Math.max(1600, scene.sentence.length * 180));
  };
  const go = (d: number) => { stopSpeak(); setPlaying(false); setLoop(false); setI(i + d); };

  return (
    <Screen back="/" speech={scene.sentence} segment={4} autoSpeak={false}
      acts={last
        ? <BigButton go onClick={() => nav("/order")}>순서 맞추기</BigButton>
        : undefined}>
      {/* 배경이 없으면 흰 무대를 그대로 쓴다. 아이 그림이 늘 앞에 선다 */}
      <div className="stage" style={scene.backgroundUrl ? {
        backgroundImage: `url(${scene.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : undefined}>
        {imageUrl && keypoints
          ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion={scene.motion} />
          : <div className="illust-wrap"><Scene n={i} /></div>}
      </div>

      <p className={`said ${playing ? "now" : ""}`}>{scene.sentence}</p>

      <div className="row" style={{ flex: "0 0 auto" }}>
        {level !== 1 && <BigButton disabled={i === 0} onClick={() => go(-1)}>이전</BigButton>}
        <BigButton go disabled={muteAll} onClick={play} nudgeOnDisabled={false}>
          {playing ? "멈추기" : "들려주기"}
        </BigButton>
        <BigButton onClick={() => setLoop((v) => !v)}>{loop ? "반복 켜짐" : "반복"}</BigButton>
        <div style={{ flex: level === 1 ? 2 : 1, display: "flex", minWidth: 88 }}>
          <BigButton disabled={last} onClick={() => go(1)}>다음</BigButton>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
        {story.scenes.map((s, n) => (
          <button key={s.index} aria-label={`${n + 1}번째 장면`} onClick={() => go(n - i)}
            style={{
              width: 14, height: 14, borderRadius: "50%",
              background: n === i ? "var(--grape)" : "var(--edge)",
              transform: n === i ? "scale(1.25)" : "none",
              transition: "transform var(--dur) var(--ease)",
            }} />
        ))}
      </div>
    </Screen>
  );
}
