// Ekspor cepat dengan WebCodecs: setiap frame dirender lalu di-encode langsung
// (tidak perlu menunggu real-time), audio dicampur dengan OfflineAudioContext.
import { Muxer, ArrayBufferTarget } from './vendor/mp4-muxer.mjs';

export const SAMPLE_RATE = 48000;

export function webCodecsAvailable() {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

function bitrateFor(W, H, fps) {
  return Math.round(Math.min(20e6, Math.max(2e6, W * H * fps * 0.1)));
}

async function pickVideoCodec(W, H, fps) {
  const cands = [
    ['avc', 'avc1.640033'], ['avc', 'avc1.640028'], ['avc', 'avc1.4d0033'],
    ['vp9', 'vp09.00.41.08'], ['av1', 'av01.0.08M.08'],
  ];
  for (const [mux, codec] of cands) {
    const cfg = { codec, width: W, height: H, bitrate: bitrateFor(W, H, fps), framerate: fps };
    if (mux === 'avc') cfg.avc = { format: 'avc' };
    try {
      if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { mux, cfg };
    } catch { /* coba kandidat berikutnya */ }
  }
  return null;
}

async function pickAudioCodec() {
  if (typeof AudioEncoder === 'undefined') return null;
  for (const [mux, codec] of [['aac', 'mp4a.40.2'], ['opus', 'opus']]) {
    const cfg = { codec, sampleRate: SAMPLE_RATE, numberOfChannels: 2, bitrate: 160000 };
    try {
      if ((await AudioEncoder.isConfigSupported(cfg)).supported) return { mux, cfg };
    } catch { /* coba kandidat berikutnya */ }
  }
  return null;
}

// Campur semua klip audio/video jadi satu AudioBuffer stereo.
export async function mixAudio(clips, duration, decode) {
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(duration * SAMPLE_RATE)), SAMPLE_RATE);
  let any = false;
  for (const c of clips) {
    if (c.muted || c.volume <= 0) continue;
    const buf = await decode(c);
    if (!buf) continue;
    any = true;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = c.speed;
    const g = ctx.createGain();
    src.connect(g).connect(ctx.destination);
    const end = c.start + c.dur;
    g.gain.setValueAtTime(c.fadeIn > 0 ? 0 : c.volume, c.start);
    if (c.fadeIn > 0) g.gain.linearRampToValueAtTime(c.volume, c.start + c.fadeIn);
    if (c.fadeOut > 0) {
      g.gain.setValueAtTime(c.volume, Math.max(c.start, end - c.fadeOut));
      g.gain.linearRampToValueAtTime(0, end);
    }
    src.start(c.start, c.in, c.dur * c.speed);
  }
  return any ? ctx.startRendering() : null;
}

export async function exportMP4({ canvas, width, height, fps, duration, renderAt, audioBuffer, onProgress, isCancelled }) {
  const v = await pickVideoCodec(width, height, fps);
  if (!v) throw new Error('Browser ini tidak bisa meng-encode video dengan WebCodecs.');
  const a = audioBuffer ? await pickAudioCodec() : null;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: v.mux, width, height, frameRate: fps },
    audio: a ? { codec: a.mux, sampleRate: SAMPLE_RATE, numberOfChannels: 2 } : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let failure = null;
  const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failure = e; } });
  venc.configure(v.cfg);
  const frames = Math.round(duration * fps);
  for (let i = 0; i < frames; i++) {
    if (failure) throw failure;
    if (isCancelled()) {
      venc.close();
      return null;
    }
    await renderAt(i / fps);
    const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
    venc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2));
    onProgress((i + 1) / frames * 0.95);
  }
  await venc.flush();
  venc.close();

  if (a) {
    const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => { failure = e; } });
    aenc.configure(a.cfg);
    const L = audioBuffer.getChannelData(0);
    const R = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : L;
    const total = Math.min(audioBuffer.length, Math.round(duration * SAMPLE_RATE));
    const block = 4800;
    for (let s = 0; s < total; s += block) {
      const n = Math.min(block, total - s);
      const data = new Float32Array(n * 2);
      data.set(L.subarray(s, s + n), 0);
      data.set(R.subarray(s, s + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: SAMPLE_RATE, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(s / SAMPLE_RATE * 1e6), data });
      aenc.encode(ad);
      ad.close();
    }
    await aenc.flush();
    aenc.close();
    if (failure) throw failure;
  }
  onProgress(1);
  muxer.finalize();
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), videoCodec: v.cfg.codec, audioCodec: a?.cfg.codec ?? null };
}
