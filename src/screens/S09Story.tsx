import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Coach from "@/components/Coach";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Scene } from "@/components/illust";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { propHeight, propsForStage, useProps } from "@/features/props/props";
import { useSession } from "@/store/session";
import { ENGINE } from "@/api";
import { firstClip, firstFrameSrc } from "@/features/story/clip";
import { artOf } from "@/features/character/art";
import PlaceScene, { Hero, placeOf, usePlaceLayout } from "@/features/story/PlaceScene";
import SceneStage from "@/features/scene/SceneStage";
import { planPages } from "@/features/scene/plan";
import { formOf } from "@/features/character/forms";
import { ORDER_GAME, useSettings } from "@/store/settings";
import { SPEECH_RATES, fileRate, sentences, speak, speechRate, stopSpeak, trackAudio } from "@/lib";
import type { Book, BookPage, MotionId, Story } from "@/types/story";
import type { Keypoints } from "@/types/character";

/** 서버가 렌더한 애니메이션과 이야기 문장 (백엔드 계약 2-6).
 *  음성 파일이 오면 그것을, 없으면 브라우저 TTS 로 한 문장씩 읽으며 그 문장을 짚는다.
 *  긴 이야기(`story.book`)면 쪽을 넘기며 본다 — `BookView` */
export default function S09Story() {
  const nav = useNavigate();
  const { story, imageUrl: upload, keypoints, character } = useSession();
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
      const a = audio.current ?? trackAudio(new Audio(story.audioUrl));
      audio.current = a;
      a.loop = loop;
      a.playbackRate = fileRate();
      a.onended = () => setAt(null);
      a.currentTime = 0;
      void a.play();
      setAt(-1); // 파일 하나로 읽으므로 짚는 문장이 없다
    } else {
      readFrom(0);
    }
  };

  // 목 AI 는 animation_url 에 원본 그림을 넣어 보낸다. MP4 가 아니면 그림으로 보여준다
  // 원본(사진 배경까지)은 보이지 않는다 — 배경을 잘라 낸 그림만, 그 이야기의 캐릭터일 때만 (2026-11-03)
  const imageUrl = artOf(character && story && character.id === story.characterId ? character : null, upload);
  const isVideo = !!story.animationUrl && /\.mp4(\?|$)/i.test(story.animationUrl);
  const [ar, setAr] = useState<number | null>(null);
  const stage = (
    <FitStage ar={isVideo ? ar : null}>
      {isVideo
        ? <video className="clip-art" src={story.animationUrl!} autoPlay loop muted playsInline onLoadedMetadata={(e) => setAr(videoRatio(e))}
                 style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        : ENGINE === "mock" && story.animationUrl
          ? <img src={story.animationUrl} alt="" style={{ maxHeight: "100%", objectFit: "contain" }} />
          : imageUrl && keypoints
            ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion="wave" />
            : <div className="illust-wrap"><Scene n={0} /></div>}
    </FitStage>
  );

  if (story.book && story.book.pages.length) {
    return <BookView story={story} imageUrl={imageUrl} keypoints={keypoints} muteAll={muteAll}
      onDone={() => nav(ORDER_GAME ? "/order" : "/done")} />;
  }
  // 짧은 이야기도 네 쪽(장소 · 문제 · 행동 · 결과)으로 나눠 같은 책 화면으로 — 장면 층 · 세부 배경 · 밤낮 · 물건 · 내 소품 ·
  // 쪽에 들어오면 읽기가 똑같이 (2026-11-03 사용자 「짧은 쪽 이야기에는 지금까지 개발한 것들이 적용 안 된 거 같은데」)
  const short = shortBook(story, lines);
  if (short) {
    return <BookView story={{ ...story, book: short }} imageUrl={imageUrl} keypoints={keypoints} muteAll={muteAll}
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
            <span key={n} className={`said ${at === n ? "now" : ""}`}><span className="mark">{line}</span></span>
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
        <SpeedSeg onChange={(r) => { if (audio.current) audio.current.playbackRate = fileRate(r); }} />
      </div>

      <AiNotice />
    </Screen>
  );
}

/** 짧은 이야기(문장 넷 안팎)를 네 쪽 그림책으로. 문장이 넷이 아니면 고르게 나눈다.
 *  행동 쪽만 그 이야기의 동작 영상 · 프레임 묶음으로 움직이고, 나머지는 멈춘 그림. 음성은 이야기 전체 음성을 쪽 길이대로 나눠 읽는다 */
function shortBook(story: Story, lines: string[]): Book | null {
  if (!lines.length) return null;
  const STAGES = ["place", "problem", "action", "result"] as const;
  const n = Math.min(4, lines.length);
  const groups: string[][] = Array.from({ length: n }, () => []);
  lines.forEach((l, i) => groups[Math.min(n - 1, Math.floor((i * n) / lines.length))].push(l));
  const pages: BookPage[] = groups.map((g, i) => {
    const stage = n === 4 ? STAGES[i] : STAGES[Math.min(3, Math.round((i * 3) / Math.max(1, n - 1)))];
    const acting = stage === "action";
    return {
      page: i + 1, stage, action: acting ? story.actionMotion ?? "wave" : "idle", text: g.join(" "), childWords: "",
      audioUrl: null, animationUrl: acting ? story.animationUrl : null,
      spriteUrl: acting ? story.spriteUrl ?? null : null, sprite: acting ? story.sprite ?? null : null, scene: null,
    };
  });
  return { title: story.title, pages, orderPages: pages.map((p) => p.page) };
}

/** 긴 이야기 — 쪽을 하나씩 넘긴다. 쪽 넘기기는 아이가 누를 때만 (자동 전환 금지, AGENTS 3.1).
 *  쪽에 들어오면 그 쪽을 한 번 읽어 준다 — 「들려주기」 버튼 없이 (2026-11-03 사용자 「버튼 자체를 없애고 바로 재생」).
 *  다 읽어도 다음 쪽으로 넘어가지는 않는다. 다시 듣기는 오른쪽 위 C-02, 소리 끄기(S-13)면 읽지 않고 바만 찬다.
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
  const audio = useRef<HTMLAudioElement | null>(null);
  const perPage = pages.some((p) => p.audioUrl);
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

  useEffect(() => () => { stopSpeak(); audio.current?.pause(); stopTts(); }, []);

  const stop = () => {
    stopSpeak(); audio.current?.pause(); stopTts();
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

  // 쪽에 들어오면 그 쪽을 읽고, 바는 실제 재생 시각대로 찬다. 쪽 음성 파일이 있으면 그것, 예전 이야기의 전체 음성이면
  // 그 쪽 구간만, 없으면 브라우저 TTS. 소리를 껐거나 브라우저가 소리를 막으면(누른 적 없는 탭) 글 길이로 바만 채운다
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    setFrac(0);
    stop();
    let alive = true;
    const text = pages[pg].text;
    const est = Math.max(1.2, text.length / (TTS_CHARS_PER_SEC * speechRate()));
    const fill = (sec: number) => {
      if (!alive) return;
      const t0 = performance.now();
      const tick = () => {
        const f = Math.min(1, (performance.now() - t0) / (sec * 1000));
        setFrac(f);
        if (f < 1) ttsTimer.current = requestAnimationFrame(tick);
      };
      tick();
    };
    // 음성 파일이 없는 쪽(서버가 그 쪽 음성을 끝내 못 만듦)은 브라우저 기계 음성으로 대신 읽지 않는다 — 나레이터 목소리
    // 사이에 다른 목소리가 끼었다 (11/3 사용자 「중간에 가끔 다른 tts 나올 때 있는데 막아줘」). 바만 찬다.
    // 서버가 없는 목 엔진만 브라우저 음성
    const tts = () => {
      if (!alive) return;
      if (muteAll || ENGINE !== "mock") { fill(est); return; }
      trackTts(text);
      speak(text, muteAll, () => { if (alive) { stopTts(); setFrac(1); } });
    };
    // 넘김 움직임이 끝나고 장면이 자리 잡은 뒤 읽기 시작한다
    const t = window.setTimeout(() => {
      if (!alive) return;
      const url = pages[pg].audioUrl;
      if (muteAll) { fill(est); return; }
      if (url) {
        const a = trackAudio(new Audio(url));
        a.playbackRate = fileRate();
        audio.current = a;
        a.ontimeupdate = () => { if (a.duration) setFrac(a.currentTime / a.duration); };
        a.onended = () => { if (alive) setFrac(1); };
        a.onerror = tts;
        void a.play().catch(() => fill(est));
      } else if (!perPage && story.audioUrl) {
        const a = audio.current && audio.current.src.includes(story.audioUrl.split("?")[0]) ? audio.current : trackAudio(new Audio(story.audioUrl));
        audio.current = a;
        const from = pg === 0 ? 0 : ends[pg - 1], to = ends[pg];
        a.playbackRate = fileRate();
        a.ontimeupdate = () => {
          if (!a.duration) return;
          const f = a.currentTime / a.duration;
          setFrac(Math.min(1, (f - from) / Math.max(1e-6, to - from)));
          if (f >= to) { a.pause(); setFrac(1); }
        };
        a.onended = () => { if (alive) setFrac(1); };
        const begin = () => { a.currentTime = from * (a.duration || 0); void a.play().catch(() => fill(est)); };
        if (a.readyState >= 1) begin(); else a.onloadedmetadata = begin;
      } else {
        tts();
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); stop(); };
  }, [pg, replay]);   // eslint-disable-line react-hooks/exhaustive-deps

  const page = pages[pg];
  const last = pg === pages.length - 1;
  // 소품 장면 → 주인공 장면 (한 쪽 안에서 순서대로, 10/27 사용자 「방법 2」, open-decisions 0-13).
  // 그 단계 첫 쪽에 들어오면 먼저 소품들을 나란히 보여 주고, PROP_MS 뒤 주인공 장면으로 바뀐다. 무대를 누르면 바로 넘어간다.
  // 「우산을 쓰고 손전등을 킨 채 걸어갔어요」처럼 소품이 여럿 · 행동과 한 문장이어도 쪽 수는 그대로다.
  // 주인공과 합성하지 않는다 (손에 쥐거나 겹치는 리스크를 지지 않음). 아이 소품은 보호자 모드 이야기에서만 (팀원 의견)
  const mine = useProps((st) => st.mine);
  const firstOfStage = pages.findIndex((p) => p.stage === page.stage) === pg;
  // 장면 층 이야기는 쪽 글에 맞춰 장면 안에 넣으므로(아래 planPages) 따로 보이는 소품 장면은 없다
  const layered = pages.some((p) => p.sprite);
  const shown = story.guardian && firstOfStage && !layered ? propsForStage(page.stage, story.picks, mine) : [];
  const shownKey = shown.map((p) => p.id).join(",");
  const [propPhase, setPropPhase] = useState(false);
  useEffect(() => {
    if (!shownKey) { setPropPhase(false); return; }
    setPropPhase(true);
    const t = setTimeout(() => setPropPhase(false), PROP_MS);
    return () => clearTimeout(t);
  }, [pg, shownKey]);
  // imageUrl 은 배경을 잘라 낸 그림이다 (원본이 아니다, 위 S09Story). 목 엔진만 animation_url 의 원본 그림을 쓴다
  // 이야기가 가진 정지 그림(서버 사본)이 먼저 — 새로고침 · 책장에서 다시 열어도 있다 (2026-11-03)
  const still = story.stillUrl
    ?? (ENGINE === "mock" && story.animationUrl && !/\.mp4(\?|$)/i.test(story.animationUrl) ? story.animationUrl : imageUrl);
  // 움직임이 없는 쪽(대기)은 원본 그림을 그대로 보이면 사진 배경까지 나온다 (2026-11-03 사용자 확인).
  // 이 이야기의 동작 영상 하나를 첫 장면에 멈춰 보인다 — 배경을 잘라 낸 캐릭터가 가만히 선 모습이다.
  // 영상이 하나도 없을 때만 원본 그림을 쓴다
  const restClip = firstClip(story);
  // 고른 장소를 장면 칸에 깐다 (2026-11-03). 장소 그림 비율(3:2)이 칸 비율이 된다. 장소를 못 읽으면 예전처럼 빈 무대
  const layout = usePlaceLayout(ENGINE === "mock" ? null : placeOf(story));
  // 투명 프레임 묶음이 있는 이야기는 장면 층으로 (2026-11-03 「나」 — features/scene): 세부 장소 · 밤낮 · 인물 · 움직임.
  // 묶음이 없는(예전 AI · 예전 이야기) 이야기는 위의 장소 배경 + 영상 바탕 지우기(PlaceScene)
  // 주인공 크기 기준 — 4족형처럼 옆으로 긴 몸은 몸길이로 (형태 정의 hero.fit, pt_docs 19)
  const heroForm = formOf(story.form ?? useSession.getState().character?.form);
  const heroFit = heroForm.hero?.fit ?? "height";
  // 옆모습 형태의 머리 방향 — 서버가 알려 준 쪽(hero_facing). 예전 서버면 세션 관절에서 목이 엉덩이보다 왼쪽이면 왼쪽.
  // 세션 관절만 보던 때는 새로고침 · 책장에서 연 이야기가 머리 반대쪽으로 갈 때 뒤집지 못해 뒷걸음질했다 (11/4 운영)
  const heroFacing: -1 | 0 | 1 = heroForm.hero?.facing !== "auto" ? 0
    : story.heroFacing ? (story.heroFacing === "left" ? -1 : 1)
    : keypoints?.neck && keypoints?.hip ? (keypoints.neck.x < keypoints.hip.x ? -1 : 1)
    : keypoints?.head && keypoints?.tail ? (keypoints.head.x < keypoints.tail.x ? -1 : 1)   // 사슬형 · 지느러미형
    : keypoints?.head && keypoints?.body ? (keypoints.head.x < keypoints.body.x ? -1 : 1) : 0;   // 날개형
  const scenes = useMemo(
    // 내 소품은 보호자 모드 이야기에서만 (팀원 의견). 쪽 글에 이름이 나오면 그 쪽 장면 안 주인공 옆에 (11/3 사용자 추천안 —
    // 전에는 그 단계 첫 쪽에 소품만 2.2초 따로 보였다). 크기는 장면 기준으로 작게 · 보통 · 크게
    () => (pages.some((p) => p.sprite)
      ? planPages(pages, { ...story.picks, place: placeOf(story) }, book.characterSheet,
          story.guardian ? mine.map((p) => ({ name: p.name, png: p.png, height: SCENE_PROP_H[p.size ?? "m"] })) : [])
      : null),
    [pages, story, mine],
  );
  // 들어온 쪽과 그 앞에 보던 쪽 — 앞으로 넘겨 들어왔을 때만 움직인다
  const [entered, setEntered] = useState<{ pg: number; from: number | null }>({ pg: 0, from: null });
  useEffect(() => { setEntered((e) => (e.pg === pg ? e : { pg, from: e.pg })); }, [pg]);
  // 장면 칸 비율은 이 이야기의 장면 영상 비율 — 첫 쪽이 정지 그림이어도 처음부터 같은 크기 칸이 되게 미리 읽어 둔다
  const [ar, setAr] = useState<number | null>(null);
  // 장면 층은 비율 상자가 아니라 왼쪽 칸을 꽉 채운다 (11/3 사용자 「장면 크기는 기존 크기 유지, 한 쪽 꽉 채우는 식」)
  const stageAr = scenes ? null : layout ? layout.size[0] / layout.size[1] : ar;
  // 글자 크기: 기본은 크게(38px), 긴 쪽만 글 칸에 들어갈 때까지 줄인다(최소 26px). 쪽마다 한 번 재서 기억한다 —
  // 넘기는 동안 그려지는 사본도 같은 크기로. 화면 크기가 바뀌면 다시 잰다
  const textRef = useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = useState<Record<number, number>>({});
  useEffect(() => {
    const reset = () => setFitSize({});
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);
  useLayoutEffect(() => {
    const el = textRef.current;
    if (turn || !el || fitSize[pg]) return;
    el.style.removeProperty("--said"); el.style.removeProperty("--lh");
    let size = parseFloat(getComputedStyle(el.querySelector(".said") ?? el).fontSize);
    const start = size;
    while (el.scrollHeight > el.clientHeight + 1 && size > 26) {
      size -= 2;
      el.style.setProperty("--said", `${size}px`);
      el.style.setProperty("--lh", `${Math.round(size * 1.47)}px`);
    }
    if (size !== start) setFitSize((m) => ({ ...m, [pg]: size }));
  }, [pg, turn, fitSize]);

  // 조작 칸 높이 → 글 칸이 그만큼 아래를 비운다 (가로 화면에서 조작 칸이 글 칸 아래에 겹치므로)
  const areaRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const area = areaRef.current, ctl = ctlRef.current;
    if (!area || !ctl) return;
    const ro = new ResizeObserver(() => {
      const h = `${ctl.offsetHeight}px`;
      if (area.style.getPropertyValue("--ctl-h") === h) return;
      area.style.setProperty("--ctl-h", h);
      setFitSize({});   // 글 칸 높이가 바뀌었으니 글자 크기를 다시 잰다
    });
    ro.observe(ctl);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!restClip) return;
    const v = document.createElement("video");
    v.preload = "metadata"; v.muted = true;
    v.onloadedmetadata = () => { if (v.videoWidth && v.videoHeight) setAr(v.videoWidth / v.videoHeight); v.removeAttribute("src"); v.load(); };
    v.src = restClip;
  }, [restClip]);

  /** 펼침면 오른쪽 글 칸 */
  const pageText = (i: number, active: boolean, top: boolean) => (
    <div className="spread-text" ref={active && !top ? textRef : undefined}
         style={fitSize[i] ? ({ "--said": `${fitSize[i]}px`, "--lh": `${Math.round(fitSize[i] * 1.47)}px` } as CSSProperties) : undefined}>
      <span className="hint">{book.title} · {i + 1} / {pages.length}쪽</span>
      {/* 형광펜 없이 큰 글자로 (2026-11-03 사용자 「하이라이팅 효과가 아예 없는 게 낫고 글자 크기를 키워」) */}
      <span className="said"><span className="mark">{pages[i].text}</span></span>
      {pages[i].childWords && <span className="hint">★ 내가 말한 부분이에요</span>}
    </div>
  );

  /** i 쪽 펼침면. active 는 지금 보고 있는 쪽(소품 장면 · 읽는 중 표시). top 이면 넘어가는 쪽 — 말림 띠 · 귀퉁이를 단다 */
  const spread = (i: number, active: boolean, top = false) => {
    const pgI = pages[i];
    const clipI = pgI.animationUrl && /\.mp4(\?|$)/i.test(pgI.animationUrl) ? pgI.animationUrl : null;
    const props = active && propPhase && shown.length > 0;
    const canvas = !perPage && !story.animationUrl && imageUrl && keypoints;
    // 영상 쪽이든 정지 그림 쪽이든 같은 칸 — 쪽마다 칸 크기가 바뀌지 않게. 캔버스(목 엔진) · 소품 장면만 칸을 다 쓴다
    const fit = !props && (!!clipI || !canvas);
    // 장면 층: 넘기는 동안 밑에 깔린 도착할 쪽은 시작 모습으로 기다리고, 넘긴 뒤 이어서 움직인다
    const forward = turn ? turn.dir > 0 : entered.from === null || entered.from < i;
    const sceneMode: "play" | "start" | "end" =
      // 넘김이 끝나고 entered 가 바뀌기 전 한 번도 시작 모습으로 (끝 모습이 끼면 주인공이 도착 자리 · 숨은 모습으로 튀었다 돌아온다)
      active && !top ? (forward ? (entered.pg === i ? "play" : "start") : "end")
      : !top && turn && turn.dir > 0 && i === turn.to ? "start" : "end";
    const prevEnv = scenes && i > 0 ? scenes[forward ? i - 1 : i].env : null;
    if (scenes && !props) {
      return (
        <div key={`${i}-${top ? "top" : "under"}`} className={`spread ${top ? "top" : ""}`} ref={top ? topRef : undefined}>
          <FitStage ar={null}>
            <SceneStage plan={scenes[i]} prevEnv={prevEnv} mode={sceneMode} fit={heroFit} facing={heroFacing} lift={heroForm.hero?.float ?? 0} size={heroForm.hero?.size ?? 1}
              sprite={pgI.sprite && pgI.spriteUrl ? { url: pgI.spriteUrl, ...pgI.sprite } : null} still={still}
              heroHands={story.stillHands ?? null} />
          </FitStage>
          {pageText(i, active, top)}
          {top && <>
            <div className="turn-wedge" ref={wedgeRef} />
            <div className="turn-ear-fold" ref={earRef} />
          </>}
        </div>
      );
    }
    return (
      <div key={`${i}-${top ? "top" : "under"}`} className={`spread ${top ? "top" : ""}`} ref={top ? topRef : undefined}>
        <FitStage ar={layout && !canvas ? stageAr : fit ? ar : null} onClick={props ? () => setPropPhase(false) : undefined}>
          {layout && !canvas
            ? <PlaceScene layout={layout}>
                {props
                  ? <div style={{ position: "absolute", inset: 0, display: "flex", gap: "5%", alignItems: "center", justifyContent: "center" }}>
                      {shown.map((p) => (
                        <img key={p.id} src={p.png} alt={`내가 그린 ${p.name}`}
                          style={{ height: `${propHeight(p.size) * 100}%`, maxWidth: `${Math.floor(85 / shown.length)}%`, objectFit: "contain" }} />
                      ))}
                    </div>
                  // 가만히 있는 쪽은 잘라 낸 정지 그림 — 영상 첫 장면은 동작 도중 자세일 수 있다
                  : clipI ? <Hero key={clipI} src={clipI} layout={layout} />
                  : still ? <Hero key={still} src={still} layout={layout} />
                  : restClip ? <Hero key={`rest-${restClip}`} src={restClip} paused layout={layout} />
                  : null}
              </PlaceScene>
            : props
            // 소품들을 나란히. 그린 곳만 잘라 두었으니 아이가 그린 크기 · 모양과 상관없이 고른 크기(작게 · 보통 · 크게) 상자에
            // 비율을 지켜 맞춰 들어간다. 여럿이면 한 개가 차지할 폭도 줄인다
            ? <div style={{ display: "flex", gap: "5%", alignItems: "center", justifyContent: "center", width: "92%", height: "100%" }}>
                {shown.map((p) => (
                  <img key={p.id} src={p.png} alt={`내가 그린 ${p.name}`}
                    style={{ height: `${propHeight(p.size) * 100}%`, maxWidth: `${Math.floor(85 / shown.length)}%`, objectFit: "contain" }} />
                ))}
              </div>
            : clipI
            ? <video className="clip-art" key={clipI} src={clipI} autoPlay loop muted playsInline onLoadedMetadata={(e) => setAr(videoRatio(e))}
                     style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : canvas
              // 목 엔진: 서버 영상이 없으니 캔버스가 그 쪽 동작으로 움직인다
              ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion={CANVAS_MOTION[pgI.action] ?? "idle"} />
              // 가만히 있는 쪽은 잘라 낸 정지 그림이 먼저다 — 영상 첫 장면은 동작 도중 자세일 수 있다
              : still
                ? <img src={still} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              : restClip
                // #t: 첫 장면을 그리게 한다 (자동 재생 없이 멈춘 채). 서명 주소의 ? 뒤에 붙어도 서버로 가지 않는다
                ? <video className="clip-art" key={`rest-${restClip}`} src={firstFrameSrc(restClip)} muted playsInline preload="auto"
                         onLoadedMetadata={(e) => setAr(videoRatio(e))}
                         style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <div className="illust-wrap"><Scene n={0} /></div>}
        </FitStage>
        {pageText(i, active, top)}
        {top && <>
          <div className="turn-wedge" ref={wedgeRef} />
          <div className="turn-ear-fold" ref={earRef} />
        </>}
      </div>
    );
  };

  return (
    <Screen back="/" speech={page.text} segment={4} autoSpeak={false}
      // C-02 다시 듣기: 이 쪽을 처음부터 다시 읽는다 (쪽 음성 파일이 있으면 그 목소리로 — 브라우저 음성과 겹치지 않게)
      onReplay={() => setReplay((r) => r + 1)}>
      {/* 아이 말풍선 — 처음 한 번 (pt_docs 20 3-2-1) */}
      <Coach id="story" lines={["「다음 쪽」을 누르면 이야기가 넘어가요"]} />
      {/* 가로 화면: 장면이 높이를 거의 다 쓰고, 오른쪽 좁은 칸에 글 + 조작 (2026-11-03 사용자 「대본을 작게, 장면이 커야」).
          조작 줄은 넘기는 쪽과 함께 넘어가지 않게 펼침면 밖에 두고, 가로 화면에서는 글 칸 아래에 겹쳐 놓는다 (ui.css .book-area) */}
      <div className={`book-area ${stageAr ? "fit" : ""}`} ref={areaRef}
           style={stageAr ? ({ "--ar": stageAr } as CSSProperties) : undefined}>
      {/* 동화책 펼침면 — 왼쪽 그림, 오른쪽 글 (서민지 님 10/19). 그림 자리는 쪽마다 동작 영상 (10/23).
          넘기는 동안에만 두 쪽을 겹친다 (밑 = 넘어갈 쪽, 위 = 넘어가는 쪽) */}
      <div className="turn" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {turn ? <>
          {spread(turn.dir > 0 ? turn.to : turn.from, false)}
          {spread(turn.dir > 0 ? turn.from : turn.to, false, true)}
        </> : spread(pg, true)}
      </div>

      <div className="book-ctl" ref={ctlRef}>
      {/* 진행 바 (2026-10-27 사용자) — 이 쪽 하나의 바. 쪽에 들어올 때마다 비어서 시작해
          그 쪽 음성 길이에 맞춰 회색이 초록으로 찬다. 글자를 몰라도 이 쪽이 얼마나 남았는지 보인다 */}
      <div className="bar-row">
        <div className="progress" role="progressbar" aria-label="이 쪽 진행"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)}>
          <i style={{ width: `${frac * 100}%` }} />
        </div>
        {/* 읽는 중에 바꾸면 지금 쪽 음성부터 바로 바뀐다. 브라우저 음성(파일이 없는 쪽)은 다음 쪽부터 */}
        <SpeedSeg onChange={(r) => { if (audio.current) audio.current.playbackRate = fileRate(r); }} />
      </div>

      <div className="ctl-btns">
        <BigButton className="prev" disabled={pg === 0} onClick={() => go(pg - 1)} nudgeOnDisabled={false}>앞 쪽</BigButton>
        {/* 마지막 쪽에서는 「다음 쪽」 자리에 「다 봤어요」 (pt_docs 05 S-09-03 · S-09-08 — 마지막 장면에서만) */}
        {last
          ? <BigButton className="next" go onClick={() => { stop(); onDone(); }}>{ORDER_GAME ? "순서 맞추기" : "다 봤어요"}</BigButton>
          : <BigButton className="next" onClick={() => go(pg + 1)} nudgeOnDisabled={false}>다음 쪽</BigButton>}
      </div>

      <AiNotice />
      </div>
      </div>
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
/** 장면 층에서 내 소품 키 (화면 높이 대비) — 주인공(약 0.52) 옆에 놓인다 */
const SCENE_PROP_H = { s: 0.12, m: 0.2, l: 0.3 } as const;

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

/** 장면 칸을 장면 영상(배경까지 그려진 한 장)의 비율에 맞춘다 — 정사각 영상(500×500)이 넓은 칸 가운데에 떠
 *  양옆이 비던 것 (2026-11-03 사용자 「배경 이미지 사이즈에 맞춰」). 비율을 모를 때(캔버스 · 소품 · 삽화)는 칸을 다 쓴다 */
function FitStage({ ar, onClick, children }: { ar: number | null; onClick?: () => void; children: React.ReactNode }) {
  return (
    <div className="stage-cell">
      <div className={`stage ${ar ? "fit" : ""}`} onClick={onClick}
           style={ar ? ({ "--ar": ar } as CSSProperties) : undefined}>
        {children}
      </div>
    </div>
  );
}

const videoRatio = (e: SyntheticEvent<HTMLVideoElement>) => {
  const v = e.currentTarget;
  return v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : null;
};
