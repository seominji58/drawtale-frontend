import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Scene } from "@/components/illust";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { sentences, speak, stopSpeak } from "@/lib";
import type { Story } from "@/types/story";

/** 서버가 렌더한 애니메이션과 이야기 문장 (백엔드 계약 2-6).
 *  음성 파일이 오면 그것을, 없으면 브라우저 TTS 로 한 문장씩 읽으며 그 문장을 짚는다.
 *  긴 이야기(`story.book`)면 쪽을 넘기며 본다 — `BookView` */
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
  const stage = (
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
  );

  if (story.book && story.book.pages.length) {
    return <BookView story={story} stage={stage} muteAll={muteAll} onDone={() => nav("/order")} />;
  }

  return (
    <Screen back="/" speech={story.text} segment={4} autoSpeak={false}
      acts={<BigButton go onClick={() => { stop(); nav("/order"); }}>순서 맞추기</BigButton>}>
      {stage}

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

      <AiNotice />
    </Screen>
  );
}

/** 긴 이야기 — 쪽을 하나씩 넘긴다. 쪽 넘기기는 아이가 누를 때만 (자동 전환 금지, AGENTS 3.1).
 *  예외는 「들려주기」를 누른 동안: 읽는 쪽을 따라 넘어간다.
 *  음성 파일은 아직 이야기 전체에 하나라(쪽마다는 다음 단계) 재생 위치를 글자 수 비율로 쪽에 맞춘다.
 *  파일이 없으면 브라우저 TTS 로 쪽마다 읽는다. 아이가 말로 덧붙인 쪽은 「내가 말한 부분」으로 보인다 */
function BookView({ story, stage, muteAll, onDone }: {
  story: Story; stage: React.ReactNode; muteAll: boolean; onDone: () => void;
}) {
  const book = story.book!;
  const pages = book.pages;
  const [pg, setPg] = useState(0);
  const [reading, setReading] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  // 쪽마다 끝나는 지점(글자 수 누적 비율). 파일 하나를 쪽에 나눠 맞춘다
  const ends = useMemo(() => {
    const lens = pages.map((p) => p.text.length);
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return lens.map((l) => (acc += l) / total);
  }, [pages]);

  useEffect(() => () => { stopSpeak(); audio.current?.pause(); }, []);

  const stop = () => { stopSpeak(); audio.current?.pause(); setReading(false); };
  const go = (n: number) => { stop(); setPg(Math.max(0, Math.min(pages.length - 1, n))); };

  const readPage = (n: number) => {
    if (n >= pages.length) { setReading(false); return; }
    setPg(n);
    speak(pages[n].text, muteAll, () => readPage(n + 1));
  };

  const play = () => {
    if (reading) { stop(); return; }
    setReading(true);
    if (story.audioUrl) {
      const a = audio.current ?? new Audio(story.audioUrl);
      audio.current = a;
      a.onended = () => setReading(false);
      a.ontimeupdate = () => {
        if (!a.duration) return;
        const f = a.currentTime / a.duration;
        const i = ends.findIndex((e) => f < e);
        setPg(i === -1 ? pages.length - 1 : i);
      };
      // 지금 쪽부터 읽는다
      const start = pg === 0 ? 0 : ends[pg - 1];
      const begin = () => { a.currentTime = start * (a.duration || 0); void a.play(); };
      if (a.readyState >= 1) begin(); else a.onloadedmetadata = begin;
    } else {
      readPage(pg);
    }
  };

  const page = pages[pg];
  const last = pg === pages.length - 1;

  return (
    <Screen back="/" speech={page.text} segment={4} autoSpeak={false}
      acts={<BigButton go onClick={() => { stop(); onDone(); }}>순서 맞추기</BigButton>}>
      {stage}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span className="hint">{book.title} · {pg + 1} / {pages.length}쪽</span>
        <span className={`said ${reading ? "now" : ""}`} style={{ textAlign: "center" }}>{page.text}</span>
        {page.childWords && <span className="hint">★ 내가 말한 부분이에요</span>}
      </div>

      <div className="row" style={{ flex: "0 0 auto" }}>
        <BigButton disabled={pg === 0} onClick={() => go(pg - 1)} nudgeOnDisabled={false}>앞 쪽</BigButton>
        <BigButton disabled={muteAll} onClick={play} nudgeOnDisabled={false}>
          {reading ? "멈추기" : "들려주기"}
        </BigButton>
        <BigButton disabled={last} onClick={() => go(pg + 1)} nudgeOnDisabled={false}>다음 쪽</BigButton>
      </div>

      <AiNotice />
    </Screen>
  );
}

/** AI 생성 표시 (인공지능기본법 제31조, 2026-01-22 시행). 이야기 문장 · 음성 · 영상이 AI 산물이다.
 *  아이 화면이라 「AI」 같은 기술 용어를 쓰지 않는다 (설계서 2장) — 문구는 교사 자문에서 확정한다
 *  (pt_docs 07 4-9). 영상 파일 자체에 넣는 표시는 내려받기 · 공유를 만들 때 함께 넣는다
 *  (지금은 앱 밖으로 나가는 길이 없다). */
export function AiNotice() {
  return <span className="hint" style={{ opacity: 0.75 }}>이 이야기는 컴퓨터가 함께 만들었어요</span>;
}
