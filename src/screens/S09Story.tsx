import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Scene } from "@/components/illust";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { propHeight, propsForStage, useProps } from "@/features/props/props";
import { useSession } from "@/store/session";
import { ORDER_GAME, useSettings } from "@/store/settings";
import { SPEECH_RATES, sentences, speak, speechRate, stopSpeak } from "@/lib";
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
  if (!story) return <Navigate to="/" replace />;

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
      a.playbackRate = speechRate();
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
      onDone={() => nav(ORDER_GAME ? "/order" : "/done")} />;
  }

  return (
    <Screen back="/" speech={story.text} segment={4} autoSpeak={false}
      acts={<BigButton go onClick={() => { stop(); nav(ORDER_GAME ? "/order" : "/done"); }}>{ORDER_GAME ? "순서 맞추기" : "다 봤어요"}</BigButton>}>
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
      <div className="bar-row" style={{ justifyContent: "flex-end" }}>
        <SpeedSeg onChange={(r) => { if (audio.current) audio.current.playbackRate = r; }} />
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
  const rate = useSettings((s) => s.speechRate);
  /** 지금 쪽 진행 (0~1). 쪽에 들어올 때마다 0 에서 시작해 그 쪽 음성(없으면 글 길이로 어림한 나레이션) 길이에 맞춰 찬다.
   *  들려주는 동안은 실제 재생 시각을 따른다 (2026-10-27 사용자 「쪽마다 하나의 바, 음성 · 영상 길이에 맞춰 회색이 초록으로」) */
  const [frac, setFrac] = useState(0);
  const ttsTimer = useRef(0);
  const stopTts = () => cancelAnimationFrame(ttsTimer.current);
  /** 브라우저 TTS 는 진행 시각을 주지 않아 글자 수로 읽는 시간을 어림한다 (끝나면 onEnd 에서 1) */
  const trackTts = (text: string) => {
    stopTts();
    const est = Math.max(1.2, text.length / (TTS_CHARS_PER_SEC * speechRate())) * 1000;
    const t0 = performance.now();
    const tick = () => {
      setFrac(Math.min(0.95, (performance.now() - t0) / est));
      ttsTimer.current = requestAnimationFrame(tick);
    };
    tick();
  };

  // 쪽마다 끝나는 지점(글자 수 누적 비율). 예전 이야기의 전체 음성 파일을 쪽에 나눠 맞춘다
  const ends = useMemo(() => {
    const lens = pages.map((p) => p.text.length);
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return lens.map((l) => (acc += l) / total);
  }, [pages]);

  useEffect(() => () => { readingRef.current = false; stopSpeak(); audio.current?.pause(); stopTts(); }, []);

  const stop = () => {
    readingRef.current = false;
    stopSpeak(); audio.current?.pause(); stopTts(); setReading(false);
  };
  // ---- 쪽 넘김 (2026-11-03 사용자 결정 N2: M 「비스듬한 말림 띠」, 쉬는 동안 귀퉁이 표시는 없음 —
  //      「접혀 있는 게 애매, 없는 게 더 자연스러움」. 넘길 때 · 손가락으로 잡을 때만 귀퉁이가 생긴다) ----
  // 넘기는 동안에만 두 쪽을 겹쳐 그린다: 밑 = 넘어갈 쪽, 위 = 넘어가는 쪽. 움직임은 위 쪽 스타일만 바꾼다(다시 그리지 않음)
  const [turn, setTurn] = useState<{ from: number; to: number; dir: 1 | -1; drag: boolean } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const wedgeRef = useRef<HTMLDivElement>(null);
  const earRef = useRef<HTMLDivElement>(null);
  const turnDone = useRef<(() => void) | null>(null);
  const turnP = useRef(0);
  const pgRef = useRef(pg);
  pgRef.current = pg;
  /** p: 0 = 넘기기 전, 1 = 다 넘김. 다음 쪽은 위 쪽(지금 쪽)이 빠지고, 앞 쪽은 위 쪽(앞 쪽)이 거꾸로 들어온다 */
  const turnFrame = (p: number) => {
    turnP.current = p;
    const top = topRef.current, wedge = wedgeRef.current, ear = earRef.current;
    if (!top || !wedge || !ear) return;
    top.style.transform = `translateX(${-p * 104}%) rotate(${-2 * Math.sin(Math.PI * p)}deg)`;
    wedge.style.width = `${(5 + 26 * Math.sin(Math.PI * Math.min(1, p * 1.35))).toFixed(1)}%`;
    // 귀퉁이가 잡히며 생겨 커졌다가 말림 띠로 넘어가며 사라진다
    ear.style.width = `${p < 0.2 ? EAR_REST + (EAR_MAX - EAR_REST) * (p / 0.2) : EAR_MAX * Math.max(0, 1 - (p - 0.2) / 0.5)}%`;
  };
  const animateTurn = (from: number, to: number, ms: number) => new Promise<void>((done) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      turnFrame(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  /** n 쪽으로 넘긴다. 움직임 줄이기면 바로 바꾼다. 끝나면 resolve */
  const turnTo = (n: number) => new Promise<void>((done) => {
    const from = pgRef.current;
    if (n === from || n < 0 || n >= pages.length) { done(); return; }
    if (REDUCE_MOTION) { setPg(n); done(); return; }
    turnDone.current = done;
    setTurn({ from, to: n, dir: n > from ? 1 : -1, drag: false });
  });
  // 겹쳐 그린 뒤 움직인다 (다음: 0 → 1, 앞: 1 → 0). 손가락으로 미는 중이면 기다린다
  useLayoutEffect(() => {
    if (!turn || turn.drag) { if (turn) turnFrame(turnP.current); return; }
    const [a, b] = turn.dir > 0 ? [turnP.current, 1] : [1, 0];
    turnFrame(a);
    let alive = true;
    void animateTurn(a, b, TURN_MS * Math.max(0.35, Math.abs(b - a))).then(() => {
      if (!alive) return;
      setPg(turn.to); setTurn(null); turnP.current = 0;
      const d = turnDone.current; turnDone.current = null; d?.();
    });
    return () => { alive = false; };
  }, [turn]);
  const go = (n: number) => { stop(); void turnTo(Math.max(0, Math.min(pages.length - 1, n))); };

  // 손가락으로 밀기: 왼쪽으로 밀면 민 만큼 귀퉁이가 잡혀 말리고, 손을 떼면 이어서 넘긴다(덜 밀었으면 되돌린다).
  // 오른쪽으로 밀면 앞 쪽. 세로 스크롤은 막지 않는다 (touch-action: pan-y)
  const drag = useRef<{ x: number; w: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (turn) return;
    drag.current = { x: e.clientX, w: e.currentTarget.clientWidth, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.w;
    if (dx < -0.02 && pg < pages.length - 1) {
      if (!d.moved) { d.moved = true; stop(); e.currentTarget.setPointerCapture(e.pointerId); turnP.current = 0; setTurn({ from: pg, to: pg + 1, dir: 1, drag: true }); }
      turnFrame(Math.min(0.85, -dx * 1.1));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.w;
    if (d.moved) {
      if (dx < -0.12) setTurn((t) => (t ? { ...t, drag: false } : t));   // 이어서 넘긴다
      else void animateTurn(turnP.current, 0, 220).then(() => { setTurn(null); turnP.current = 0; });   // 되돌린다
    } else if (dx > 0.12 && pg > 0) go(pg - 1);
  };

  // 들려주지 않을 때도 쪽에 들어오면 바가 그 쪽 길이만큼 찬다. 쪽 음성 파일이 있으면 그 길이, 없으면 글 길이로 어림
  useEffect(() => {
    if (readingRef.current) return;
    setFrac(0);
    stopTts();
    let alive = true;
    const run = (sec: number) => {
      if (!alive) return;
      const t0 = performance.now();
      const tick = () => {
        const f = Math.min(1, (performance.now() - t0) / (sec * 1000));
        setFrac(f);
        if (f < 1) ttsTimer.current = requestAnimationFrame(tick);
      };
      tick();
    };
    // 빠르기를 바꾸면 그만큼 짧아지고 길어진다 (S-13 읽어주기 빠르기)
    const est = Math.max(1.2, pages[pg].text.length / (TTS_CHARS_PER_SEC * speechRate()));
    const url = pages[pg].audioUrl;
    if (url) {
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => run(a.duration && isFinite(a.duration) ? a.duration / speechRate() : est);
      a.onerror = () => run(est);
      a.src = url;
    } else {
      run(est);
    }
    return () => { alive = false; stopTts(); };
  }, [pg, rate]);   // 빠르기를 바꾸면 바도 그 길이로 다시 찬다

  /** n 쪽부터 끝까지 읽는다. 쪽 음성 파일이 있으면 그것을, 없으면 브라우저 TTS */
  const readPage = (n: number) => {
    if (!readingRef.current) return;
    if (n >= pages.length) { stop(); return; }
    setPg(n);
    setFrac(0);
    // 다 읽으면 넘김 움직임으로 다음 쪽에 간 뒤 이어 읽는다
    const next = () => {
      stopTts(); setFrac(1);
      if (n + 1 >= pages.length) { readPage(n + 1); return; }
      void turnTo(n + 1).then(() => readPage(n + 1));
    };
    const tts = () => { trackTts(pages[n].text); speak(pages[n].text, muteAll, next); };
    const url = pages[n].audioUrl;
    if (url) {
      audio.current?.pause();
      const a = new Audio(url);
      a.playbackRate = speechRate();
      audio.current = a;
      a.ontimeupdate = () => { if (a.duration) setFrac(a.currentTime / a.duration); };
      a.onended = next;
      a.onerror = tts;
      void a.play().catch(tts);
    } else {
      tts();
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
      const t = a.currentTime / a.duration;
      const i = ends.findIndex((e) => t < e);
      const k = i === -1 ? pages.length - 1 : i;
      setPg(k);
      const from = k === 0 ? 0 : ends[k - 1];
      setFrac(Math.min(1, (t - from) / Math.max(1e-6, ends[k] - from)));
    };
    const start = pg === 0 ? 0 : ends[pg - 1];
    a.playbackRate = speechRate();
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
  const still = story.animationUrl && !/\.mp4(\?|$)/i.test(story.animationUrl) ? story.animationUrl : imageUrl;
  /** i 쪽 펼침면. active 는 지금 보고 있는 쪽(소품 장면 · 읽는 중 표시). top 이면 넘어가는 쪽 — 말림 띠 · 귀퉁이를 단다 */
  const spread = (i: number, active: boolean, top = false) => {
    const pgI = pages[i];
    const clipI = pgI.animationUrl && /\.mp4(\?|$)/i.test(pgI.animationUrl) ? pgI.animationUrl : null;
    const props = active && propPhase && shown.length > 0;
    return (
      <div key={`${i}-${top ? "top" : "under"}`} className={`spread ${top ? "top" : ""}`} ref={top ? topRef : undefined}>
        <div className="stage" onClick={props ? () => setPropPhase(false) : undefined}>
          {props
            // 소품들을 나란히. 그린 곳만 잘라 두었으니 아이가 그린 크기 · 모양과 상관없이 고른 크기(작게 · 보통 · 크게) 상자에
            // 비율을 지켜 맞춰 들어간다. 여럿이면 한 개가 차지할 폭도 줄인다
            ? <div style={{ display: "flex", gap: "5%", alignItems: "center", justifyContent: "center", width: "92%", height: "100%" }}>
                {shown.map((p) => (
                  <img key={p.id} src={p.png} alt={`내가 그린 ${p.name}`}
                    style={{ height: `${propHeight(p.size) * 100}%`, maxWidth: `${Math.floor(85 / shown.length)}%`, objectFit: "contain" }} />
                ))}
              </div>
            : clipI
            ? <video key={clipI} src={clipI} autoPlay loop muted playsInline
                     style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            : !perPage && !story.animationUrl && imageUrl && keypoints
              // 목 엔진: 서버 영상이 없으니 캔버스가 그 쪽 동작으로 움직인다
              ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion={CANVAS_MOTION[pgI.action] ?? "idle"} />
              : still
                ? <img src={still} alt="" style={{ maxHeight: "100%", objectFit: "contain" }} />
                : <div className="illust-wrap"><Scene n={0} /></div>}
        </div>
        <div className="spread-text">
          <span className="hint">{book.title} · {i + 1} / {pages.length}쪽</span>
          <span className={`said ${active && reading ? "now" : ""}`}>{pgI.text}</span>
          {pgI.childWords && <span className="hint">★ 내가 말한 부분이에요</span>}
        </div>
        {top && <>
          <div className="turn-wedge" ref={wedgeRef} />
          <div className="turn-ear-fold" ref={earRef} />
        </>}
      </div>
    );
  };

  return (
    <Screen back="/" speech={page.text} segment={4} autoSpeak={false}
      acts={<BigButton go onClick={() => { stop(); onDone(); }}>{ORDER_GAME ? "순서 맞추기" : "다 봤어요"}</BigButton>}>
      {/* 동화책 펼침면 — 왼쪽 그림, 오른쪽 글 (서민지 님 10/19). 그림 자리는 쪽마다 동작 영상 (10/23).
          넘기는 동안에만 두 쪽을 겹친다 (밑 = 넘어갈 쪽, 위 = 넘어가는 쪽) */}
      <div className="turn" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {turn ? <>
          {spread(turn.dir > 0 ? turn.to : turn.from, false)}
          {spread(turn.dir > 0 ? turn.from : turn.to, false, true)}
        </> : spread(pg, true)}
      </div>

      {/* 진행 바 (2026-10-27 사용자) — 이 쪽 하나의 바. 쪽에 들어올 때마다 비어서 시작해
          그 쪽 음성 길이에 맞춰 회색이 초록으로 찬다. 글자를 몰라도 이 쪽이 얼마나 남았는지 보인다 */}
      <div className="bar-row">
        <div className="progress" role="progressbar" aria-label="이 쪽 진행"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)}>
          <i style={{ width: `${frac * 100}%` }} />
        </div>
        {/* 읽는 중에 바꾸면 지금 쪽 음성부터 바로 바뀐다. 브라우저 음성(파일이 없는 쪽)은 다음 쪽부터 */}
        <SpeedSeg onChange={(r) => { if (audio.current) audio.current.playbackRate = r; }} />
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

/** 읽어주기 빠르기 (2026-11-02 사용자 「각 장면 페이지에서 조절」). 고른 값은 설정에 남아 다음 이야기에도 쓴다.
 *  서버 음성은 다시 만들지 않고 재생 속도만 바꾼다 (크레딧 0, 음 높이는 그대로) */
function SpeedSeg({ onChange }: { onChange: (rate: number) => void }) {
  const rate = useSettings((s) => s.speechRate);
  const set = useSettings((s) => s.set);
  return (
    <span className="seg" role="group" aria-label="읽어주기 빠르기">
      {SPEECH_RATES.map(([label, v]) => (
        <button key={v} className={rate === v ? "on" : ""} aria-pressed={rate === v}
          onClick={() => { set("speechRate", v); onChange(v); }}>{label}</button>
      ))}
    </span>
  );
}

/** 브라우저 TTS 가 1초에 읽는 글자 수 어림 (rate 0.95, 한국어) — 진행 바용 */
const TTS_CHARS_PER_SEC = 6.5;

/** 쪽 넘김 (2026-11-03): 한 번 넘기는 시간, 귀퉁이가 처음 · 가장 클 때 크기 (펼침면 폭에 대한 %).
 *  쉬는 동안 귀퉁이를 보이지 않으므로 처음 크기는 0 (예시 N2 — 시안 페이지 https://claude.ai/artifact/Ud35qMbtTzVLhyXz37XSFN) */
const TURN_MS = 600;
const EAR_REST = 0;
const EAR_MAX = 16;
/** 기기에서 「움직임 줄이기」를 켰으면 넘김 없이 바로 바꾼다 */
const REDUCE_MOTION = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
