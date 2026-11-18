import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Scene } from "@/components/illust";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { propHeight, propShowHeight, propsForStage, useProps } from "@/features/props/props";
import { useSession } from "@/store/session";
import { ENGINE, fetchPageAudio } from "@/api";
import { firstClip, firstFrameSrc } from "@/features/story/clip";
import { artOf } from "@/features/character/art";
import PlaceScene, { Hero, placeOf, usePlaceLayout } from "@/features/story/PlaceScene";
import SceneStage, { preloadScene, preloadStripsFor } from "@/features/scene/SceneStage";
import Waiting from "@/components/Waiting";
import { Pencil } from "@/components/illust";
import { envCueAt, planPages, sceneFx } from "@/features/scene/plan";
import { formOf } from "@/features/character/forms";
import { ORDER_GAME, useSettings } from "@/store/settings";
import { SPEECH_RATES, fileRate, sentences, speak, speechRate, stopAllAudio, stopSpeak, trackAudio } from "@/lib";
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
      onDone={() => nav(ORDER_GAME ? "/order" : "/done", { replace: true })} />;
  }
  // 짧은 이야기도 네 쪽(장소 · 문제 · 행동 · 결과)으로 나눠 같은 책 화면으로 — 장면 층 · 세부 배경 · 밤낮 · 물건 · 내 소품 ·
  // 쪽에 들어오면 읽기가 똑같이 (2026-11-03 사용자 「짧은 쪽 이야기에는 지금까지 개발한 것들이 적용 안 된 거 같은데」)
  const short = shortBook(story, lines);
  if (short) {
    return <BookView story={{ ...story, book: short }} imageUrl={imageUrl} keypoints={keypoints} muteAll={muteAll}
      onDone={() => nav(ORDER_GAME ? "/order" : "/done", { replace: true })} />;
  }

  return (
    <Screen back="/" speech={story.text} segment={4} autoSpeak={false}
      acts={<BigButton go onClick={() => { stop(); nav(ORDER_GAME ? "/order" : "/done", { replace: true }); }}>{ORDER_GAME ? "순서 맞추기" : "다 봤어요"}</BigButton>}>
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
  // 첫 쪽만으로 연 책 (11/10 「첫 쪽만 만들고 책 열기」): 나머지 쪽 음성은 서버가 읽는 동안 만든다. 다시 물어 받은 주소는 여기에만
  // 두고 pages 는 그대로 둔다(장면 계획을 다시 짜지 않게). 처음부터 주소가 있던 쪽은 새 주소(서명이 바뀜)로 바꾸지 않는다
  const [late, setLate] = useState<{ urls: (string | null)[]; pending: boolean[] } | null>(null);
  // 쪽 음성 파일을 미리 받아 둔 것 (쪽 번호 → 이 기기 주소, 못 받았으면 서버 주소). 쪽이 「완성」됐는지의 하나 — 넘기면 바로 읽는다
  // (11/11 사용자 「그림이랑 등장인물 말고도 음성 다 포함해서, 1쪽 완성 후 보여 주고 넘길 쪽이 완성되면 다음 쪽 단추」)
  const [audioGot, setAudioGot] = useState<Record<number, string>>({});
  const remoteAudio = (i: number) => pages[i].audioUrl ?? late?.urls[i] ?? null;
  const audioOf = (i: number) => audioGot[i] ?? remoteAudio(i);
  const pendingOf = (i: number) => !audioOf(i) && (late ? !!late.pending[i] : !!pages[i].audioPending);
  const perPage = pages.some((p) => p.audioUrl || p.audioPending);
  // 쪽은 차례로만 (11/10 사용자): 다음 쪽 음성이 아직이면 「다음 쪽」 단추가 「만드는 중」이 되고 눌러도 넘어가지 않는다.
  // 다 되면 「다음 쪽」으로 바뀐다 (꺼진 단추로 보이던 것을 바꿈). 소리를 껐으면 기다릴 음성이 없으니 막지 않는다
  /** 그 쪽 음성이 준비됐나: 파일을 받아 뒀거나, 서버가 끝내 못 만든 쪽(주소 없음 · 만드는 중 아님), 소리를 껐거나 쪽 음성이 없는 예전 이야기 */
  const audioReady = (i: number) => muteAll || !perPage || audioGot[i] !== undefined || (!remoteAudio(i) && !pendingOf(i));
  const fetching = useRef(new Set<number>());
  const blobUrls = useRef<string[]>([]);
  useEffect(() => () => { blobUrls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  useEffect(() => {
    if (muteAll || !perPage) return;
    pages.forEach((_, i) => {
      const url = remoteAudio(i);
      if (!url || audioGot[i] !== undefined || fetching.current.has(i)) return;
      fetching.current.add(i);
      // 못 받으면(주소 기한 · 막힘 · 15초) 서버 주소를 그대로 쓴다: 막히지 않게
      const ctl = new AbortController();
      const t = window.setTimeout(() => ctl.abort(), AUDIO_WAIT_MS);
      fetch(url, { signal: ctl.signal })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((b) => { const u = URL.createObjectURL(b); blobUrls.current.push(u); return u; })
        .catch(() => url)
        .then((u) => { clearTimeout(t); setAudioGot((m) => (m[i] !== undefined ? m : { ...m, [i]: u })); });
    });
  }, [late, muteAll]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!pages.some((p) => p.audioPending)) return;
    let alive = true, tries = 0, timer = 0;
    const tick = async () => {
      const got = await fetchPageAudio(story.storyId);
      if (!alive) return;
      if (got && got.urls.length === pages.length) {
        setLate(got);
        if (!got.pending.some(Boolean)) return;
      }
      // 서버도 10분이 지나면 「만드는 중」을 뗀다 (AUDIO_PENDING_MAX_SECONDS). 그보다 조금 더 묻고 그만둔다
      if (++tries < LATE_AUDIO_TRIES) timer = window.setTimeout(tick, LATE_AUDIO_MS);
      else setLate((l) => ({ urls: l?.urls ?? pages.map((p) => p.audioUrl ?? null), pending: pages.map(() => false) }));
    };
    timer = window.setTimeout(tick, LATE_AUDIO_MS);
    return () => { alive = false; clearTimeout(timer); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
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

  // 쪽을 넘기거나 떠날 때: 지금 쪽 소리만이 아니라 나고 있는 소리 모두 (stopAllAudio, 11/10 소리 겹침)
  const stop = () => {
    stopAllAudio(); audio.current?.pause(); stopTts();
  };
  // ---- 쪽 넘김 (2026-11-03 사용자 결정 N2: M 「비스듬한 말림 띠」, 쉬는 동안 귀퉁이 표시는 없음 —
  //      「접혀 있는 게 애매, 없는 게 더 자연스러움」. 넘길 때만 귀퉁이가 생긴다. 손가락으로 밀어 넘기기는 11/10 에 없앰) ----
  // 넘기는 동안에만 두 쪽을 겹쳐 그린다: 밑 = 넘어갈 쪽, 위 = 넘어가는 쪽. 움직임은 위 쪽 스타일만 바꾼다(다시 그리지 않음)
  const [turn, setTurn] = useState<{ from: number; to: number; dir: 1 | -1 } | null>(null);
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
    setTurn({ from, to: n, dir: n > from ? 1 : -1 });
  });
  // 겹쳐 그린 뒤 움직인다 (다음: 0 → 1, 앞: 1 → 0). 손가락으로 미는 중이면 기다린다
  useLayoutEffect(() => {
    if (!turn) return;
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

  // 손가락으로 밀어 넘기기는 없앴다 (11/10 사용자 「페이지 버튼 말고 땡겨서 넘기는 기능은 없애줘」). 쪽은 아래 단추로만 넘긴다

  // 쪽에 들어오면 그 쪽을 읽고, 바는 실제 재생 시각대로 찬다. 쪽 음성 파일이 있으면 그것, 예전 이야기의 전체 음성이면
  // 그 쪽 구간만, 없으면 브라우저 TTS. 소리를 껐거나 브라우저가 소리를 막으면(누른 적 없는 탭) 글 길이로 바만 채운다
  const [replay, setReplay] = useState(0);
  // 책을 폈나 (1쪽이 완성됨, 아래 opened). 펴기 전에는 읽지 않는다
  const [isOpen, setIsOpen] = useState(false);
  const pageUrl = audioOf(pg), pagePending = pendingOf(pg);
  useEffect(() => {
    setFrac(0);
    stop();
    let alive = true;
    // 이 쪽 음성을 서버가 아직 만드는 중이면 바를 채우지 않고 기다린다. 주소가 오면 이 효과가 다시 돌아 읽는다
    setWaiting(pagePending && !muteAll);
    if (pagePending && !muteAll) return () => { alive = false; };
    // 1쪽이 완성돼 책을 펴기 전에는 읽지 않는다
    if (!isOpen) return () => { alive = false; };
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
    // 음성 실패 정책 (pt_docs 20 4-5, 11/6):
    // - 일부 쪽만 음성 파일이 없으면(서버가 그 쪽 음성을 끝내 못 만듦) 그 쪽은 브라우저 기계 음성으로 대신 읽지 않는다, 
    //   나레이터 목소리 사이에 다른 목소리가 끼었다 (11/3 사용자 「중간에 가끔 다른 tts 나올 때 있는데 막아줘」). 바만 찬다.
    // - 이야기에 음성 파일이 하나도 없으면(음성 키 없음 · 모두 실패) 처음부터 끝까지 브라우저 음성으로 읽는다, 한 목소리라
    //   섞이지 않고, 글을 못 읽는 아이에게 소리 없이 지나가지 않게 (01 NFR-06, 05 6.9 「음성만 실패하면 브라우저 음성」)
    // 서버가 없는 목 엔진은 늘 브라우저 음성
    const noAudioAtAll = !perPage && !story.audioUrl;
    const tts = () => {
      if (!alive) return;
      if (muteAll || (ENGINE !== "mock" && !noAudioAtAll)) { fill(est); return; }
      trackTts(text);
      speak(text, muteAll, () => { if (alive) { stopTts(); setFrac(1); } });
    };
    // 넘김 움직임이 끝나고 장면이 자리 잡은 뒤 읽기 시작한다
    const t = window.setTimeout(() => {
      if (!alive) return;
      const url = pageUrl;
      if (muteAll) { fill(est); return; }
      if (url) {
        const a = trackAudio(new Audio(url));
        a.playbackRate = fileRate();
        audio.current = a;
        a.ontimeupdate = () => { if (a.duration) setFrac(a.currentTime / a.duration); };
        a.onended = () => { if (alive) setFrac(1); };
        a.onerror = tts;
        // 느린 네트워크에서는 play() 뒤 한참 있다 소리가 난다. 그사이 쪽을 넘겼으면 나는 순간 멈춘다 (11/10 소리 겹침)
        a.onplaying = () => { if (!alive || audio.current !== a) a.pause(); };
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
  }, [pg, replay, pageUrl, pagePending, isOpen]);   // eslint-disable-line react-hooks/exhaustive-deps

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
  // 머리 · 몸 뒤쪽의 가로 차이가 관절 전체 폭의 12% 도 안 되면 앞모습(0), 백엔드 facing_of 의 FRONT_DX 와 같다 (11/10:
  // 앞에서 그린 새가 아무 쪽으로나 정해져 몸짓 연출에서 옆으로 숙였다). 서버가 null 을 주는 앞모습도 여기서 다시 0
  const sideOf = (a?: { x: number }, b?: { x: number }): -1 | 0 | 1 | undefined => {
    if (!a || !b || !keypoints) return undefined;
    const xs = Object.values(keypoints).map((p) => p.x);
    const spread = Math.max(...xs) - Math.min(...xs), dx = a.x - b.x;
    return spread > 0 && Math.abs(dx) >= 0.12 * spread ? (dx < 0 ? -1 : 1) : 0;
  };
  const heroFacing: -1 | 0 | 1 = heroForm.hero?.facing !== "auto" ? 0
    : story.heroFacing ? (story.heroFacing === "left" ? -1 : 1)
    : sideOf(keypoints?.neck, keypoints?.hip)
      ?? sideOf(keypoints?.head, keypoints?.tail)   // 사슬형 · 지느러미형
      ?? sideOf(keypoints?.head, keypoints?.body)   // 날개형
      ?? 0;
  const scenes = useMemo(
    // 내 소품은 보호자 모드 이야기에서만 (팀원 의견). 쪽 글에 이름이 나오면 그 쪽 장면 안 주인공 옆에 (11/3 사용자 추천안 —
    // 전에는 그 단계 첫 쪽에 소품만 2.2초 따로 보였다). 크기는 장면 기준으로 작게 · 보통 · 크게
    () => (pages.some((p) => p.sprite)
      ? planPages(pages, { ...story.picks, place: placeOf(story) }, book.characterSheet,
          story.guardian ? mine.map((p) => ({ name: p.name, png: p.png, height: propHeight(p.size) })) : [],
          story.heroName ?? useSession.getState().name, story.form ?? useSession.getState().character?.form)
      : null),
    [pages, story, mine],
  );
  // 등장인물 그림띠는 책을 열 때 미리 읽어 둔다, 처음 붙을 때 안 읽혀 있으면 첫 장들이 휙휙 지나갔다 (11/9)
  useEffect(() => { if (scenes) preloadStripsFor(scenes); }, [scenes]);
  // 쪽 장면 그림도 미리 읽는다: 지금 쪽 다음부터 차례로. 다음 쪽 그림이 다 읽히기 전에는 「다음 쪽」 대신 「만드는 중」
  // (11/11 사용자 「장면 렌더링 · 음성 생성이 끝나고 넘어가져야 하는데 넘어간 뒤 아무것도 안 나오다가 나와」).
  // 느린 망에서 끝없이 막지 않게 한 쪽에 8초가 지나면 그냥 연다 (장면은 그림이 오는 대로 그려진다)
  const [sceneReady, setSceneReady] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    if (!scenes) return;
    let alive = true;
    const mark = (i: number) => alive && setSceneReady((s) => (s.has(i) ? s : new Set(s).add(i)));
    (async () => {
      // 지금 쪽 · 다음 쪽을 먼저 혼자 받고(망을 나눠 쓰지 않게), 그 뒤 쪽들은 세 쪽씩 함께 받는다.
      // 전에는 처음부터 세 줄이 같이 받아 느린 망에서 다음 쪽이 늦게 끝났다 (11/12 사용자 「두 쪽씩 미리 받는 게 더 빠를려나」, 재기 tools/scene-check/prefetch.mjs)
      const order = scenes.map((_, i) => i).filter((i) => i >= pg && !sceneReady.has(i));
      const load = async (i: number) => {
        const pi = pages[i];
        const sprite = pi.sprite && pi.spriteUrl ? { url: pi.spriteUrl, ...pi.sprite } : null;
        await Promise.race([preloadScene(scenes[i], sprite, pi.spriteLeft ?? null), new Promise((ok) => setTimeout(ok, SCENE_WAIT_MS))]);
        mark(i);
      };
      for (const i of order.filter((i) => i <= pg + 1)) { if (!alive) return; await load(i); }
      const rest = order.filter((i) => i > pg + 1);
      let next = 0;
      const worker = async () => { while (alive && next < rest.length) await load(rest[next++]); };
      await Promise.all([worker(), worker(), worker()]);
    })();
    return () => { alive = false; };
  }, [scenes, pg]);   // eslint-disable-line react-hooks/exhaustive-deps
  /** 그 쪽이 완성됐나: 음성 파일 + 장면 그림(배경 · 소품 · 주인공 묶음 · 등장인물 그림띠) */
  const pageReady = (i: number) => audioReady(i) && (!scenes || sceneReady.has(i));
  const nextBusy = pg < pages.length - 1 && !pageReady(pg + 1);
  // 1쪽도 완성된 뒤에 책을 편다 (그 전에는 기다리는 화면). 느린 망에서 끝없이 기다리지 않게 OPEN_WAIT_MS 가 지나면 연다
  const [openGaveUp, setOpenGaveUp] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setOpenGaveUp(true), OPEN_WAIT_MS); return () => clearTimeout(t); }, []);
  const opened = isOpen || openGaveUp || pageReady(0);
  useEffect(() => { if (opened) setIsOpen(true); }, [opened]);
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
    // 줄이는 바닥: 보통 26px, 낮은 가로 화면(폰을 가로로, 글 18px 부터)은 그 7할까지
    const floor = Math.min(26, Math.round(start * 0.7));
    while (el.scrollHeight > el.clientHeight + 1 && size > floor) {
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
    // 장면 층: 넘기는 동안 도착할 쪽은 시작 모습으로 기다리고, 넘긴 뒤 이어서 움직인다.
    // 뒤로 넘겨 돌아온 쪽도 처음부터 다시 움직인다 — 전에는 끝 모습으로만 그려 주인공이 첫 장 자세로 멈춰 있었다 (11/9 사용자
    // 「책 페이지에서 뒤로 가기 하면 애니메이션 재생 이상해지는 문제」). 앞으로는 도착할 쪽이 밑(under), 뒤로는 위(top)로 넘어온다
    const arriving = !!turn && i === turn.to && (turn.dir > 0 ? !top : top);
    const sceneMode: "play" | "start" | "end" =
      // 넘김이 끝나고 entered 가 바뀌기 전 한 번도 시작 모습으로 (끝 모습이 끼면 주인공이 도착 자리 · 숨은 모습으로 튀었다 돌아온다)
      active && !top ? (entered.pg === i ? "play" : "start")
      : arriving ? "start" : "end";
    // 앞 쪽 밤낮에서 이 쪽 밤낮으로 (뒤로 돌아와도 같은 순서로 다시)
    // 앞 쪽이 「끝난」 모습 — 그 쪽에서 「환해졌어요 · 불을 켰어요」로 밝아졌으면 밝아진 채로 이어 받는다.
    // 전에는 앞 쪽의 시작 모습(어둑 · 밤)을 받아 다음 쪽이 다시 어두워졌다가 밝아졌다 (11/10 사용자)
    const prevEnv = scenes && i > 0 ? (() => {
      const e = scenes[i - 1].env, lit = sceneFx(pages[i - 1].text).bright >= 0;
      return { ...e, dim: !!e.dim && !lit, night: e.night && !(e.lightsOn && lit), glow: !!e.glow || (lit && !!scenes[i].env.glow) };
    })() : null;
    if (scenes && !props) {
      return (
        <div key={`${i}-${top ? "top" : "under"}`} className={`spread ${top ? "top" : ""}`} ref={top ? topRef : undefined}>
          <FitStage ar={null}>
            <SceneStage heroName={story.heroName ?? useSession.getState().name} plan={scenes[i]} prevEnv={prevEnv} mode={sceneMode} fit={heroFit} facing={heroFacing} lift={heroForm.hero?.float ?? 0} size={heroForm.hero?.size ?? 1} form={heroForm.id}
              sprite={pgI.sprite && pgI.spriteUrl ? { url: pgI.spriteUrl, ...pgI.sprite } : null} spriteLeft={pgI.spriteLeft ?? null} still={still}
              heroHands={story.stillHands ?? null} heroBody={story.stillBody ?? null}
              narration={i === pg && sceneMode === "play" ? frac : undefined} envAt={envCueAt(pages[i].text)} text={pages[i].text} prevFly={i > 0 ? scenes[i - 1].hero.fly : null} pageAction={pages[i].action} />
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
                          style={{ height: `${propShowHeight(p.size) * 100}%`, maxWidth: `${Math.floor(85 / shown.length)}%`, objectFit: "contain" }} />
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
                    style={{ height: `${propShowHeight(p.size) * 100}%`, maxWidth: `${Math.floor(85 / shown.length)}%`, objectFit: "contain" }} />
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

  if (!opened) {
    return (
      <Screen back="/" speech="책을 펴고 있어요" segment={4} autoSpeak={false} adultKey={false}>
        <Waiting message="책을 펴고 있어요" steps={1} current={1} art={<Pencil />} />
      </Screen>
    );
  }
  return (
    <Screen back="/" speech={page.text} segment={4} autoSpeak={false}
      // C-02 다시 듣기: 이 쪽을 처음부터 다시 읽는다 (쪽 음성 파일이 있으면 그 목소리로 — 브라우저 음성과 겹치지 않게)
      onReplay={() => setReplay((r) => r + 1)}>
      {/* 「다음 쪽」 안내 말풍선은 뺐다 — 첫 쪽 이야기 읽어 주기와 안내 목소리가 겹쳤다 (11/9 사용자) */}
      {/* 가로 화면: 장면이 높이를 거의 다 쓰고, 오른쪽 좁은 칸에 글 + 조작 (2026-11-03 사용자 「대본을 작게, 장면이 커야」).
          조작 줄은 넘기는 쪽과 함께 넘어가지 않게 펼침면 밖에 두고, 가로 화면에서는 글 칸 아래에 겹쳐 놓는다 (ui.css .book-area) */}
      <div className={`book-area ${stageAr ? "fit" : ""}`} ref={areaRef}
           style={stageAr ? ({ "--ar": stageAr } as CSSProperties) : undefined}>
      {/* 동화책 펼침면 — 왼쪽 그림, 오른쪽 글 (서민지 님 10/19). 그림 자리는 쪽마다 동작 영상 (10/23).
          넘기는 동안에만 두 쪽을 겹친다 (밑 = 넘어갈 쪽, 위 = 넘어가는 쪽) */}
      <div className="turn">
        {turn ? <>
          {spread(turn.dir > 0 ? turn.to : turn.from, false)}
          {spread(turn.dir > 0 ? turn.from : turn.to, false, true)}
        </> : spread(pg, true)}
      </div>

      <div className="book-ctl" ref={ctlRef}>
      {/* 진행 바 (2026-10-27 사용자) — 이 쪽 하나의 바. 쪽에 들어올 때마다 비어서 시작해
          그 쪽 음성 길이에 맞춰 회색이 초록으로 찬다. 글자를 몰라도 이 쪽이 얼마나 남았는지 보인다 */}
      <div className="bar-row">
        <div className={`progress${waiting ? " is-waiting" : ""}`} role="progressbar" aria-label="이 쪽 진행" aria-busy={waiting}
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
          // 다음 쪽 음성을 만드는 동안은 「만드는 중」(흐려지지 않음), 다 되면 「다음 쪽」
          : <BigButton className="next" onClick={() => { if (!nextBusy) go(pg + 1); }}>
              <span aria-live="polite">{nextBusy ? "만드는 중" : "다음 쪽"}</span>
            </BigButton>}
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

/** 다음 쪽 장면 그림을 이만큼 기다리면 다 안 읽혀도 「다음 쪽」을 연다 */
const SCENE_WAIT_MS = 8000;
/** 쪽 음성 파일을 이만큼 받아도 안 오면 서버 주소로 바로 읽는다 */
const AUDIO_WAIT_MS = 15000;
/** 1쪽이 완성되기를 이만큼 기다리면 그냥 책을 편다 */
const OPEN_WAIT_MS = 20000;
/** 첫 쪽만으로 연 책의 나머지 쪽 음성을 이 간격으로 다시 묻는다, 최대 횟수 (약 11분: 서버는 10분 지나면 「만드는 중」을 뗀다) */
const LATE_AUDIO_MS = 2000;
const LATE_AUDIO_TRIES = 330;

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
