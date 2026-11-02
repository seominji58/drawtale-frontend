/** 보호자 목소리 녹음 (S13Voice). 브라우저가 만든 녹음(webm · mp4)을 24kHz 모노 WAV 로 바꿔 보낸다.
 *  ElevenLabs 가 어떤 형식이든 확실히 읽게 하려고 WAV 로 — 3분이면 약 9MB (서버 한도 20MB).
 *  녹음은 이 화면 메모리에만 있고, 보낸 뒤에는 버린다 (서버도 저장하지 않는다) */

/** 이보다 짧으면 목소리가 잘 만들어지지 않는다 (ElevenLabs 권장 1분 이상) */
export const MIN_SECONDS = 60;
/** 이만큼 녹음하면 저절로 멈춘다 */
export const MAX_SECONDS = 180;
const WAV_RATE = 24000;

export const recordSupported = () =>
  typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;

export interface Recording {
  /** 멈추면 녹음을 돌려준다 */
  stop: () => Promise<Blob>;
  /** 버리고 마이크를 끈다 */
  cancel: () => void;
}

/** 녹음을 시작한다. 마이크 권한이 없으면 NotAllowedError 를 던진다 */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
  const off = () => stream.getTracks().forEach((t) => t.stop());
  rec.start(1000);
  return {
    stop: () => new Promise<Blob>((resolve) => {
      rec.onstop = () => { off(); resolve(new Blob(parts, { type: rec.mimeType || type || "audio/webm" })); };
      if (rec.state !== "inactive") rec.stop(); else { off(); resolve(new Blob(parts)); }
    }),
    cancel: () => { rec.onstop = null; if (rec.state !== "inactive") rec.stop(); off(); },
  };
}

/** 녹음 → 24kHz 모노 16비트 WAV */
export async function toWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  void ctx.close();
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * WAV_RATE), WAV_RATE);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);

  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const text = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); text(8, "WAVE");
  text(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, WAV_RATE, true); v.setUint32(28, WAV_RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  text(36, "data"); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const x = Math.max(-1, Math.min(1, pcm[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}
