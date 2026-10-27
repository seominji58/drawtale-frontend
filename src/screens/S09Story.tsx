import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Scene } from "@/components/illust";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { propsForStage, useProps } from "@/features/props/props";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { sentences, speak, stopSpeak } from "@/lib";
import type { MotionId, Story } from "@/types/story";
import type { Keypoints } from "@/types/character";

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
    return <BookView story={story} imageUrl={imageUrl} keypoints={keypoints} muteAll={muteAll}
      onDone={() => nav("/order")} />;
  }

  return (
    <Screen back="/" speech={story.text} segment={4} autoSpeak={false}
      acts={<BigButton go onClick={() => { stop(); nav("/order"); }}>순서 맞추기</BigButton>}>
      {/* 동화책 펼침면 — 왼쪽 그림, 오른쪽 글 (피드백 2026-10-19).
          좁은 화면에서는 위아래로 쌓인다 (ui.css `.spread`) */}
      <div className="spread">
        {stage}
        <div className="spread-text">
          {lines.map((line, n) => (
            <span key={n} className={`said ${at === n ? "now" : ""}`}>{line}</span>
          ))}
        </div>
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
 *  예외는 「들려주기」를 누른 동안: 그 쪽 음성이 끝나면 다음 쪽으로 넘어가 이어 읽는다.
 *  쪽마다 서버가 만든 음성(`page.audioUrl`)과 동작 영상(`page.animationUrl`)을 쓴다. 음성이 없는 쪽은
 *  브라우저 TTS, 영상이 없는 쪽(가만히 · 렌더 실패)은 멈춘 그림, 목 엔진은 캔버스가 그 쪽 동작으로 움직인다.
 *  쪽 음성이 없고 이야기 전체 음성만 있는 예전 이야기는 재생 위치를 글자 수 비율로 쪽에 맞춘다.
 *  아이가 말로 덧붙인 쪽은 「내가 말한 부분」으로 보인다 */
function BookView({ story, imageUrl, keypoints, muteAll, onDone }: {
  story: Story; imageUrl: string | null; keypoints: Keypoints | null; muteAll: boolean; onDone: () => void;
}) {
  const book = story.book!;
  const pages = book.pages;
  const [pg, setPg] = useState(0);
  const [reading, setReading] = useState(false);
  const readingRef = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const perPage = pages.some((p) => p.audioUrl);

  // 쪽마다 끝나는 지점(글자 수 누적 비율). 예전 이야기의 전체 음성 파일을 쪽에 나눠 맞춘다
  const ends = useMemo(() => {
    const lens = pages.map((p) => p.text.length);
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return lens.map((l) => (acc += l) / total);
  }, [pages]);

  useEffect(() => () => { readingRef.current = false; stopSpeak(); audio.current?.pause(); }, []);

  const stop = () => {
    readingRef.current = false;
    stopSpeak(); audio.current?.pause(); setReading(false);
  };
  const go = (n: number) => { stop(); setPg(Math.max(0, Math.min(pages.length - 1, n))); };

  /** n 쪽부터 끝까지 읽는다. 쪽 음성 파일이 있으면 그것을, 없으면 브라우저 TTS */
  const readPage = (n: number) => {
    if (!readingRef.current) return;
    if (n >= pages.length) { stop(); return; }
    setPg(n);
    const next = () => readPage(n + 1);
    const url = pages[n].audioUrl;
    if (url) {
      audio.current?.pause();
      const a = new Audio(url);
      audio.current = a;
      a.onended = next;
      a.onerror = () => speak(pages[n].text, muteAll, next);
      void a.play().catch(() => speak(pages[n].text, muteAll, next));
    } else {
      speak(pages[n].text, muteAll, next);
    }
  };

  const play = () => {
    if (reading) { stop(); return; }
    readingRef.current = true;
    setReading(true);
    if (perPage || !story.audioUrl) { readPage(pg); return; }
    const a = audio.current ?? new Audio(story.audioUrl);
    audio.current = a;
    a.onended = () => stop();
    a.ontimeupdate = () => {
      if (!a.duration) return;
      const i = ends.findIndex((e) => a.currentTime / a.duration < e);
      setPg(i === -1 ? pages.length - 1 : i);
    };
    const start = pg === 0 ? 0 : ends[pg - 1];
    const begin = () => { a.currentTime = start * (a.duration || 0); void a.play(); };
    if (a.readyState >= 1) begin(); else a.onloadedmetadata = begin;
  };

  const page = pages[pg];
  const last = pg === pages.length - 1;
  // 소품 장면 → 주인공 장면 (한 쪽 안에서 순서대로, 10/27 사용자 「방법 2」, open-decisions 0-13).
  // 그 단계 첫 쪽에 들어오면 먼저 소품들을 나란히 보여 주고, PROP_MS 뒤 주인공 장면으로 바뀐다. 무대를 누르면 바로 넘어간다.
  // 「우산을 쓰고 손전등을 킨 채 걸어갔어요」처럼 소품이 여럿 · 행동과 한 문장이어도 쪽 수는 그대로다.
  // 주인공과 합성하지 않는다 (손에 쥐거나 겹치는 리스크를 지지 않음). 아이 소품은 보호자 모드 이야기에서만 (팀원 의견)
  const mine = useProps((st) => st.mine);
  const firstOfStage = pages.findIndex((p) => p.stage === page.stage) === pg;
  const shown = story.guardian && firstOfStage ? propsForStage(page.stage, story.picks, mine) : [];
  const shownKey = shown.map((p) => p.id).join(",");
  const [propPhase, setPropPhase] = useState(false);
  useEffect(() => {
    if (!shownKey) { setPropPhase(false); return; }
    setPropPhase(true);
    const t = setTimeout(() => setPropPhase(false), PROP_MS);
    return () => clearTimeout(t);
  }, [pg, shownKey]);
  const clip = page.animationUrl && /\.mp4(\?|$)/i.test(page.animationUrl) ? page.animationUrl : null;
  const still = story.animationUrl && !/\.mp4(\?|$)/i.test(story.animationUrl) ? story.animationUrl : imageUrl;

  return (
    <Screen back="/" speech={page.text} segment={4} autoSpeak={false}
      acts={<BigButton go onClick={() => { stop(); onDone(); }}>순서 맞추기</BigButton>}>
      {/* 동화책 펼침면 — 왼쪽 그림, 오른쪽 글 (서민지 님 10/19). 그림 자리는 쪽마다 동작 영상 (10/23) */}
      <div className="spread">
        <div className="stage" onClick={propPhase ? () => setPropPhase(false) : undefined}>
          {propPhase && shown.length
            // 소품들을 같은 크기 칸에 나란히. 아이가 그린 크기 · 모양과 상관없이 칸에 맞춰 들어간다
            ? <div style={{ display: "flex", gap: "6%", alignItems: "center", justifyContent: "center", width: "90%", height: "80%" }}>
                {shown.map((p) => (
                  <img key={p.id} src={p.png} alt={`내가 그린 ${p.name}`}
                    style={{ flex: "1 1 0", minWidth: 0, maxHeight: "100%", objectFit: "contain" }} />
                ))}
              </div>
            : clip
            ? <video key={clip} src={clip} autoPlay loop muted playsInline
                     style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            : !perPage && !story.animationUrl && imageUrl && keypoints
              // 목 엔진: 서버 영상이 없으니 캔버스가 그 쪽 동작으로 움직인다
              ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion={CANVAS_MOTION[page.action] ?? "idle"} />
              : still
                ? <img src={still} alt="" style={{ maxHeight: "100%", objectFit: "contain" }} />
                : <div className="illust-wrap"><Scene n={0} /></div>}
        </div>
        <div className="spread-text">
          <span className="hint">{book.title} · {pg + 1} / {pages.length}쪽</span>
          <span className={`said ${reading ? "now" : ""}`}>{page.text}</span>
          {page.childWords && <span className="hint">★ 내가 말한 부분이에요</span>}
        </div>
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

/** 소품 장면을 보여 주는 시간. 그 뒤 같은 쪽에서 주인공 장면으로 바뀐다 */
const PROP_MS = 2200;

/** 쪽 동작 → 브라우저 캔버스 동작 (목 엔진). 캔버스에는 뛰기 · 춤이 없어 걷기 · 점프로 */
const CANVAS_MOTION: Record<string, MotionId> = {
  idle: "idle", walk: "walk", run: "walk", jump: "jump", wave: "wave", dance: "jump",
};

/** AI 생성 표시 (인공지능기본법 제31조, 2026-01-22 시행). 이야기 문장 · 음성 · 영상이 AI 산물이다.
 *  아이 화면이라 「AI」 같은 기술 용어를 쓰지 않는다 (설계서 2장) — 문구는 교사 자문에서 확정한다
 *  (pt_docs 07 4-9). 영상 파일 자체에 넣는 표시는 내려받기 · 공유를 만들 때 함께 넣는다
 *  (지금은 앱 밖으로 나가는 길이 없다). */
export function AiNotice() {
  return <span className="hint" style={{ opacity: 0.75 }}>이 이야기는 컴퓨터가 함께 만들었어요</span>;
}
