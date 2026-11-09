import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useAuth } from "@/store/auth";
import { useSettings } from "@/store/settings";
import { ApiError, registerMyVoice } from "@/api";
import type { VoiceKind } from "@/api";
import { MAX_SECONDS, MIN_SECONDS, recordSupported, startRecording, toWav } from "@/features/voice/record";
import type { Recording } from "@/features/voice/record";

/** S-13 「내 목소리로 읽어주기」 — 보호자 목소리 등록 (2026-11-02, 설계서에 없는 어른 화면).
 *
 *  1. 동의: 무엇을 · 왜 · 어디로(국외 이전) · 얼마나 · 지우는 법 · 거부권을 먼저 보이고, 필수 세 칸을 모두 골라야 다음으로.
 *  2. 녹음: 보호자가 아래 글을 1~3분 읽는다. 들어 보고 다시 녹음할 수 있다.
 *  3. 등록: 44.1kHz WAV 로 서버에 보낸다. 서버는 녹음을 저장하지 않고 ElevenLabs 로 넘겨 목소리 id 만 둔다 (계약 2-12).
 *
 *  안내문은 법률 검토 전 초안이다 — 바꾸면 CONSENT_VERSION 을 올린다 (서버가 동의한 판을 기록한다). open-decisions 0-16
 *
 *  kind="child" (/child-voice): 아이 목소리 등록 (2026-11-09 교수님 지시 · 시연용). 보호자가 동의하고 아이가 짧은 글을 읽는다.
 *  엔진은 나중에 바꾼다 — 지금은 보호자 목소리와 같은 ElevenLabs 라, ElevenLabs 정책(만 18세 미만 음성 데이터 금지) 때문에
 *  어른이 기능을 시험할 때만 쓴다 (팀 결정). open-decisions 0-20 */
export const CONSENT_VERSION = "2026-11-02";
export const CHILD_CONSENT_VERSION = "2026-11-09-child";
/** 아이는 오래 읽기 어렵다 — 30초부터 */
const CHILD_MIN_SECONDS = 30;

/** 녹음할 때 읽는 글. 문장 길이 · 말투가 고르게 섞이게 쓴 짧은 동화 (약 1분 30초) */
const READING = [
  "옛날 옛날, 작은 언덕 위에 빨간 지붕 집이 있었어요.",
  "그 집에는 호기심 많은 아이와 졸린 눈을 한 고양이가 살았지요.",
  "어느 맑은 아침, 아이는 창밖을 보며 말했어요. “오늘은 어디로 가 볼까?”",
  "고양이는 하품을 크게 한 번 하더니, 꼬리를 흔들며 문 쪽으로 걸어갔어요.",
  "둘은 나란히 언덕을 내려갔어요. 풀잎에 맺힌 이슬이 반짝반짝 빛났어요.",
  "개울가에 다다르자 커다란 돌다리가 보였어요. 아이는 조심조심 한 칸씩 건넜어요.",
  "“천천히, 천천히. 서두르지 않아도 괜찮아.” 아이는 스스로에게 말했어요.",
  "다리 건너편에는 노란 꽃이 가득 핀 들판이 있었어요. 바람이 불 때마다 꽃들이 고개를 끄덕였지요.",
  "그때, 어디선가 작은 새 한 마리가 날아와 아이의 어깨에 살짝 앉았어요.",
  "아이는 깜짝 놀랐지만, 숨을 고르고 다정하게 인사했어요. “안녕, 너도 산책 나왔니?”",
  "해가 높이 떠오르자 아이와 고양이는 다시 집으로 돌아왔어요.",
  "오늘 본 것들을 하나씩 떠올리며, 아이는 포근한 이불 속에서 스르르 잠이 들었답니다.",
];

/** 아이가 읽는 글 — 짧고 쉬운 문장 (약 40초) */
const READING_CHILD = [
  "안녕! 나는 이야기를 좋아해요.",
  "오늘은 내가 이야기를 읽어 줄게요.",
  "작은 강아지가 공원에서 뛰어놀았어요.",
  "나비가 팔랑팔랑 날아왔어요.",
  "강아지는 나비를 따라 콩콩 뛰었어요.",
  "“같이 놀자!” 강아지가 말했어요.",
  "해님이 방긋 웃었어요.",
  "구름도 둥실둥실 떠다녔어요.",
  "저녁이 되자 강아지는 집으로 돌아갔어요.",
  "“오늘 정말 재미있었어!” 잘 자, 강아지야.",
];

type Step = "consent" | "record" | "review" | "sending" | "done";

const FAIL: Record<string, string> = {
  CONSENT_REQUIRED: "필수 항목에 모두 동의해야 등록할 수 있습니다.",
  VOICE_UNAVAILABLE: "지금은 목소리를 등록할 수 없습니다. 잠시 뒤 다시 해 주세요.",
  VOICE_FAILED: "목소리를 만들지 못했습니다. 조용한 곳에서 다시 녹음해 주세요.",
  INVALID_AUDIO: "녹음 파일을 읽지 못했습니다. 다시 녹음해 주세요.",
  UNAUTHORIZED: "로그인이 끝났습니다. 다시 로그인한 뒤 등록해 주세요.",
};

function Clause({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="item">
      <span className="grow">
        <span className="name" style={{ fontSize: "var(--t-body)" }}>{title}</span>
        <span className="desc">{children}</span>
      </span>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="item" style={{ cursor: "pointer" }}>
      <input type="checkbox" className="tog" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="grow"><span className="desc" style={{ marginTop: 0, color: "var(--ink)" }}>{children}</span></span>
    </label>
  );
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export default function S13Voice({ kind = "guardian" }: { kind?: VoiceKind }) {
  const child = kind === "child";
  const minSec = child ? CHILD_MIN_SECONDS : MIN_SECONDS;
  const reading = child ? READING_CHILD : READING;
  const nav = useNavigate();
  const mode = useAuth((a) => a.mode);
  const setSetting = useSettings((s) => s.set);
  const [step, setStep] = useState<Step>("consent");
  const [collect, setCollect] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [ownVoice, setOwnVoice] = useState(false);
  const [sec, setSec] = useState(0);
  const [take, setTake] = useState<Blob | null>(null);
  const [takeSec, setTakeSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recording | null>(null);
  const timer = useRef(0);
  const startedAt = useRef(0);
  const player = useRef<HTMLAudioElement | null>(null);

  const stopPlayer = () => {
    const a = player.current;
    if (a) { a.pause(); URL.revokeObjectURL(a.src); player.current = null; }
  };
  useEffect(() => () => { rec.current?.cancel(); clearInterval(timer.current); stopPlayer(); }, []);

  // 로그인한 보호자만 (「어른과 함께」). 아이는 계정이 없다
  if (mode !== "member") return <Navigate to="/settings" replace />;
  const agreed = collect && transfer && ownVoice;

  const begin = async () => {
    setError(null);
    stopPlayer();
    try {
      rec.current = await startRecording();
    } catch {
      setError("마이크를 쓸 수 없습니다. 브라우저 주소창의 마이크 권한을 허용해 주세요.");
      return;
    }
    setTake(null);
    setSec(0);
    startedAt.current = Date.now();
    clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000;
      setSec(s);
      if (s >= MAX_SECONDS) void end();
    }, 250);
  };

  const end = async () => {
    clearInterval(timer.current);
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    const took = (Date.now() - startedAt.current) / 1000;   // 타이머 안에서도 불리므로 상태(sec) 말고 시각으로
    const blob = await r.stop();
    setTake(blob);
    setTakeSec(took);
    setStep("review");
  };

  const listen = () => {
    if (!take) return;
    stopPlayer();
    const a = new Audio(URL.createObjectURL(take));
    player.current = a;
    void a.play().catch(() => undefined);
  };

  const send = async () => {
    if (!take) return;
    stopPlayer();
    setStep("sending");
    setError(null);
    try {
      const wav = await toWav(take);
      await registerMyVoice(wav, { collect, transfer, ownVoice, version: child ? CHILD_CONSENT_VERSION : CONSENT_VERSION }, kind);
      setTake(null);   // 보낸 녹음은 이 화면에서도 버린다
      // 나레이터는 하나만 — 방금 등록한 목소리로 켜고 다른 쪽은 끈다
      setSetting(child ? "childNarrator" : "guardianNarrator", true);
      setSetting(child ? "guardianNarrator" : "childNarrator", false);
      setStep("done");
    } catch (e) {
      const code = e instanceof ApiError ? e.serverCode ?? "" : "";
      setError(FAIL[code] ?? "등록하지 못했습니다. 인터넷 연결을 확인하고 다시 해 주세요.");
      setStep("review");
    }
  };

  const recording = step === "record" && rec.current !== null;

  return (
    <Screen back={step === "consent" || step === "done" ? "/settings" : () => { rec.current?.cancel(); clearInterval(timer.current); setStep("consent"); }}
      speech={null} title={child ? "아이 목소리 등록" : "내 목소리 등록"} audience="adult" autoSpeak={false}
      acts={
        step === "consent" ? <BigButton go disabled={!agreed || !recordSupported()} onClick={() => setStep("record")}>동의하고 녹음하러 가기</BigButton>
        : step === "record" ? (recording
            ? <BigButton go onClick={() => void end()}>다 읽었어요 ({mmss(sec)})</BigButton>
            : <BigButton go onClick={() => void begin()}>녹음 시작</BigButton>)
        : step === "review" ? <>
            <BigButton onClick={() => { setStep("record"); setTake(null); }}>다시 녹음</BigButton>
            <BigButton go disabled={takeSec < minSec} onClick={() => void send()}>이 목소리로 등록</BigButton>
          </>
        : step === "sending" ? <BigButton go disabled>등록하는 중…</BigButton>
        : <BigButton go onClick={() => nav("/settings")}>설정으로</BigButton>
      }>
      <div className="list scroll" data-audience="adult">
        {step === "consent" && child && <>
          <div className="item head"><span className="grow"><span className="name">아이 목소리 등록 동의 (보호자)</span></span></div>
          <Clause title="무엇을 하나요">
            아이가 30초~3분 동안 짧은 글을 읽은 녹음으로 목소리를 만들고, 이 계정에서 만드는 이야기의 나레이션을 아이 목소리로 읽어 줍니다.
            아이가 자기 목소리로 이야기를 들을 수 있습니다. 등장인물 대사는 지금처럼 정해진 목소리로 읽습니다. 시연용 기능이라 목소리를 만드는 방식은 바뀔 수 있습니다.
          </Clause>
          <Clause title="받는 정보">
            아이의 녹음 음성과 그 음성으로 만든 목소리 특징. 목소리는 특정 개인을 알아볼 수 있는 정보입니다. 이름 · 나이 · 연락처는 받지 않습니다.
          </Clause>
          <Clause title="어디로 보내나요 (국외 이전)">
            받는 곳: ElevenLabs, Inc. (미국), 음성 합성 업체. 「이 목소리로 등록」을 누를 때 보냅니다. 녹음 파일은 저희 서버에 저장하지 않고, 목소리 번호만 남습니다.
          </Clause>
          <Clause title="얼마나 보관하나요 · 지우는 법">
            보호자님이 지우거나 계정을 없앨 때까지. 어른 설정 → 보호자 칸 → 「아이 목소리 다시 녹음 · 지우기」에서 언제든 지울 수 있고,
            지우면 그 목소리로 만든 이야기 음성도 함께 지웁니다.
          </Clause>
          <Clause title="동의하지 않으셔도 됩니다">동의하지 않아도 다른 기능은 모두 쓸 수 있고, 이야기는 기본 나레이터가 읽습니다.</Clause>
          <Check checked={collect} onChange={setCollect}>[필수] 위 내용대로 아이의 목소리(음성)를 수집 · 이용하는 데 동의합니다.</Check>
          <Check checked={transfer} onChange={setTransfer}>[필수] 아이의 목소리를 ElevenLabs, Inc.(미국)로 보내는 국외 이전에 동의합니다.</Check>
          <Check checked={ownVoice} onChange={setOwnVoice}>[필수] 저는 이 아이의 보호자(법정대리인)이며, 곁에서 함께 녹음하는 데 동의합니다.</Check>
          {!recordSupported() && <Clause title="이 브라우저에서는 녹음할 수 없습니다">크롬이나 사파리에서 다시 열어 주세요.</Clause>}
        </>}
        {step === "consent" && !child && <>
          <div className="item head"><span className="grow"><span className="name">보호자 목소리 등록 동의</span></span></div>
          <Clause title="무엇을 하나요">
            보호자님이 1~3분 동안 글을 읽은 녹음으로 목소리를 만들고, 이 계정에서 만드는 이야기의 나레이션을 그 목소리로 읽어 드립니다.
            등장인물 대사(캐릭터 목소리)는 지금처럼 정해진 목소리로 읽습니다.
          </Clause>
          <Clause title="받는 정보">
            녹음한 음성과 그 음성으로 만든 목소리 특징. 목소리는 특정 개인을 알아볼 수 있는 정보로, 생체인식정보에 해당할 수 있습니다.
            이름 · 연락처는 받지 않습니다.
          </Clause>
          <Clause title="어디로 보내나요 (국외 이전)">
            받는 곳: ElevenLabs, Inc. (미국), 음성 합성 업체. 보내는 때: 「이 목소리로 등록」을 누를 때 인터넷으로.
            목적: 목소리를 만들고 이야기를 읽는 데에만 씁니다. 녹음 파일은 저희 서버에 저장하지 않고 바로 넘기며, 저희 서버에는 목소리 번호만 남습니다.
          </Clause>
          <Clause title="얼마나 보관하나요">
            보호자님이 목소리를 지우거나 계정을 없앨 때까지. 지우면 ElevenLabs 의 목소리와, 그 목소리로 만든 이야기 음성을 함께 지웁니다.
            동의하고 거둬들인 날짜만 기록으로 남깁니다.
          </Clause>
          <Clause title="지우는 법">어른 설정 → 어른과 함께 → 「내 목소리 다시 녹음 · 지우기」의 「지우기」. 언제든 지울 수 있습니다.</Clause>
          <Clause title="동의하지 않으셔도 됩니다">
            동의하지 않아도 다른 기능은 모두 쓸 수 있고, 이야기는 기본 나레이터가 읽습니다.
          </Clause>
          <Clause title="누구의 목소리인가요">
            반드시 동의하시는 보호자 본인의 목소리여야 합니다. 아이의 목소리나 다른 사람의 목소리는 등록할 수 없습니다.
          </Clause>
          <Check checked={collect} onChange={setCollect}>[필수] 위 내용대로 제 목소리(음성)를 수집 · 이용하는 데 동의합니다.</Check>
          <Check checked={transfer} onChange={setTransfer}>[필수] 제 목소리를 ElevenLabs, Inc.(미국)로 보내는 국외 이전에 동의합니다.</Check>
          <Check checked={ownVoice} onChange={setOwnVoice}>[필수] 녹음하는 목소리는 제 본인의 목소리이며, 아이나 다른 사람의 목소리가 아닙니다.</Check>
          {!recordSupported() && <Clause title="이 브라우저에서는 녹음할 수 없습니다">크롬이나 사파리에서 다시 열어 주세요.</Clause>}
        </>}

        {(step === "record" || step === "review" || step === "sending") && <>
          <div className="item head"><span className="grow">
            <span className="name">
              {step === "record"
                ? recording ? `녹음 중 ${mmss(sec)}. 아래 글을 천천히 읽어 주세요`
                  : child ? "조용한 곳에서, 아이가 아래 글을 소리 내어 읽게 해 주세요" : "조용한 곳에서, 아래 글을 아이에게 읽어 주듯 읽어 주세요"
                : `녹음 ${mmss(takeSec)}`}
            </span>
          </span></div>
          {step === "record" && (
            <Clause title="녹음 안내">
              {child
                ? "30초 이상 읽어 주세요 (3분이 되면 저절로 멈춥니다). 글을 다 읽고도 30초가 안 되면 처음부터 한 번 더 읽어요. 보호자님이 한 줄씩 짚어 주셔도 좋아요."
                : "1분 이상 읽어 주세요 (3분이 되면 저절로 멈춥니다). 글을 다 읽고도 1분이 안 되면 처음부터 한 번 더 읽어 주세요."}
              {" "}주위 소리 · 음악이 없을수록 목소리가 잘 만들어집니다.
            </Clause>
          )}
          {step !== "record" && (
            <div className="item">
              <span className="grow"><span className="desc" style={{ marginTop: 0 }}>
                {takeSec < minSec ? `${child ? "30초" : "1분"}보다 짧습니다. 다시 녹음해 주세요.` : "들어 보고 괜찮으면 등록해 주세요."}
              </span></span>
              <button className="btn link" onClick={listen} disabled={step === "sending"}>들어 보기</button>
            </div>
          )}
          <div className="item">
            <span className="grow" style={{ fontSize: "calc(var(--t-body) + 4px)", lineHeight: 1.9 }}>
              {reading.map((line) => <span key={line} style={{ display: "block" }}>{line}</span>)}
            </span>
          </div>
        </>}

        {step === "done" && (
          <Clause title="등록했습니다">
            {child ? "이제 새로 만드는 이야기의 나레이션을 아이 목소리로 읽어 줍니다." : "이제 새로 만드는 이야기의 나레이션을 보호자님 목소리로 읽어 드립니다."}
            {" "}설정 → 보호자 → 「읽어 주는 목소리」에서 다른 목소리(기본 · 보호자 · 아이)로 바꿀 수 있고, 「들어 보기」로 이 목소리를 확인할 수 있습니다.
            처음 읽을 때는 음성을 만드는 데 조금 더 걸릴 수 있습니다.
          </Clause>
        )}
        {error && <div className="item"><span className="grow"><span className="desc" style={{ color: "var(--berry)", marginTop: 0 }}>{error}</span></span></div>}
      </div>
    </Screen>
  );
}
