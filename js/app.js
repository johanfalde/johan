import {
  askJSON, SCRIPT_SCHEMA, scriptPrompt, SUBTITLE_SCHEMA, subtitlePrompt, OPS_SCHEMA, AGENT_SYSTEM,
} from './ai.js';

// =====================================================================
// State
// =====================================================================
const $ = (s) => document.querySelector(s);
const canvas = $('#preview');
const ctx = canvas.getContext('2d');

const MIN_TRACKS = 4;
const MAIN_TRACK = 1;

const state = {
  project: { width: 1080, height: 1920, fps: 30, bg: '#000000', clips: [] },
  media: new Map(),   // mediaId -> { id, type, name, url, duration, w, h, thumb, el }
  els: new Map(),     // clipId  -> HTMLMediaElement milik klip video/audio
  time: 0,
  playing: false,
  selectedId: null,
  pps: 60,            // piksel per detik di timeline
  exporting: null,
};

const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clips = () => state.project.clips;
const getClip = (id) => clips().find((c) => c.id === id);
const selected = () => getClip(state.selectedId);
const isVisual = (c) => c.type !== 'audio';
const isMedia = (c) => c.type === 'video' || c.type === 'audio';

function projectDuration() {
  return clips().reduce((m, c) => Math.max(m, c.start + c.dur), 0);
}

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

// =====================================================================
// Undo / redo
// =====================================================================
const history = { stack: [], index: -1 };

function snapshot() {
  return JSON.stringify({ clips: clips(), bg: state.project.bg, w: state.project.width, h: state.project.height });
}

function commit() {
  const snap = snapshot();
  if (history.stack[history.index] === snap) return;
  history.stack.length = history.index + 1;
  history.stack.push(snap);
  if (history.stack.length > 100) history.stack.shift();
  history.index = history.stack.length - 1;
}

function restore(snap) {
  const d = JSON.parse(snap);
  Object.assign(state.project, { clips: d.clips, bg: d.bg, width: d.w, height: d.h });
  applyCanvasSize();
  if (!getClip(state.selectedId)) state.selectedId = null;
  cleanupEls();
  refreshAll();
}

function undo() {
  if (history.index <= 0) return;
  history.index--;
  restore(history.stack[history.index]);
}

function redo() {
  if (history.index >= history.stack.length - 1) return;
  history.index++;
  restore(history.stack[history.index]);
}

// =====================================================================
// Media import
// =====================================================================
const once = (el, ev) => new Promise((res, rej) => {
  el.addEventListener(ev, res, { once: true });
  el.addEventListener('error', () => rej(new Error('Gagal memuat media')), { once: true });
});

async function videoThumb(url) {
  const v = document.createElement('video');
  v.muted = true;
  v.src = url;
  await once(v, 'loadeddata');
  v.currentTime = Math.min(1, v.duration / 2);
  await once(v, 'seeked');
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = Math.round(160 * v.videoHeight / v.videoWidth) || 90;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}

async function importFile(file) {
  const type = file.type.split('/')[0];
  if (!['video', 'image', 'audio'].includes(type)) return;
  const url = URL.createObjectURL(file);
  const m = { id: uid(), type, name: file.name, url, duration: 5, w: 0, h: 0, thumb: null, el: null };
  try {
    if (type === 'image') {
      const img = new Image();
      img.src = url;
      await img.decode();
      Object.assign(m, { el: img, w: img.naturalWidth, h: img.naturalHeight, thumb: url });
    } else {
      const el = document.createElement(type);
      el.preload = 'metadata';
      el.src = url;
      await once(el, 'loadedmetadata');
      m.duration = el.duration;
      if (type === 'video') {
        m.w = el.videoWidth;
        m.h = el.videoHeight;
        m.thumb = await videoThumb(url).catch(() => null);
      }
    }
  } catch (e) {
    alert(`${file.name}: ${e.message}`);
    return;
  }
  state.media.set(m.id, m);
  renderMediaList();
}

function renderMediaList() {
  const list = $('#mediaList');
  list.innerHTML = '';
  for (const m of state.media.values()) {
    const item = document.createElement('div');
    item.className = 'media-item';
    item.title = 'Klik untuk menambah ke timeline';
    const icon = m.type === 'audio' ? '🎵' : '';
    item.innerHTML = `
      <div class="thumb" style="${m.thumb ? `background-image:url('${m.thumb}')` : ''}">${icon}</div>
      <div class="name"></div>
      ${m.type !== 'image' ? `<span class="dur">${fmt(m.duration)}</span>` : ''}
      <span class="add">+</span>`;
    item.querySelector('.name').textContent = m.name;
    item.addEventListener('click', () => addMediaClip(m));
    list.appendChild(item);
  }
}

// =====================================================================
// Clip creation
// =====================================================================
const DEFAULT_FILTER = { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, hue: 0 };

function baseClip(extra) {
  const { width: W, height: H } = state.project;
  return {
    id: uid(), track: 0, start: 0, dur: 3, in: 0, speed: 1,
    x: W / 2, y: H / 2, scale: 1, rotation: 0, opacity: 1, fadeIn: 0, fadeOut: 0,
    volume: 1, muted: false, filter: { ...DEFAULT_FILTER },
    ...extra,
  };
}

function overlaps(track, start, dur, ignoreId) {
  return clips().some((c) => c.id !== ignoreId && c.track === track && c.start < start + dur - 1e-3 && start < c.start + c.dur - 1e-3);
}

function freeTrack(preferred, start, dur) {
  for (let t = preferred; t < preferred + 20; t++) if (!overlaps(t, start, dur)) return t;
  return preferred;
}

// Track utama = track video/gambar paling bawah.
function mainTrack() {
  const v = clips().filter((c) => c.type === 'video' || c.type === 'image');
  return v.length ? Math.max(...v.map((c) => c.track)) : MAIN_TRACK;
}

// Teks selalu di atas track utama; kalau penuh, sisipkan track baru paling atas.
function textTrack(start, dur) {
  const main = mainTrack();
  for (let t = 0; t < main; t++) {
    const onlyText = clips().every((c) => c.track !== t || c.type === 'text');
    if (onlyText && !overlaps(t, start, dur)) return t;
  }
  for (const c of clips()) c.track++;
  return 0;
}

function fitScale(w, h, mode = 'contain') {
  const { width: W, height: H } = state.project;
  const f = mode === 'cover' ? Math.max : Math.min;
  return f(W / w, H / h);
}

function addMediaClip(m) {
  let clip;
  if (m.type === 'audio') {
    const start = state.time;
    clip = baseClip({ type: 'audio', mediaId: m.id, name: m.name, start, dur: m.duration, track: freeTrack(mainTrack() + 1, start, m.duration) });
  } else {
    // Video/gambar disusun berurutan di track utama seperti CapCut.
    const track = mainTrack();
    const start = clips().filter((c) => c.track === track).reduce((e, c) => Math.max(e, c.start + c.dur), 0);
    const dur = m.type === 'video' ? m.duration : 3;
    clip = baseClip({
      type: m.type, mediaId: m.id, name: m.name, start, dur, track,
      w: m.w, h: m.h, scale: fitScale(m.w, m.h),
    });
  }
  clips().push(clip);
  select(clip.id);
  commit();
  refreshAll();
}

const TEXT_PRESETS = {
  title: { size: 120, weight: 800, color: '#ffffff', stroke: '#000000', strokeW: 10, bg: '', anim: 'pop', yRel: 0.3 },
  subtitle: { size: 64, weight: 700, color: '#ffffff', stroke: '#000000', strokeW: 8, bg: '', anim: 'fade', yRel: 0.78 },
  caption: { size: 64, weight: 700, color: '#111111', stroke: '', strokeW: 0, bg: '#ffffff', anim: 'pop', yRel: 0.7 },
  neon: { size: 96, weight: 800, color: '#22d3ee', stroke: '', strokeW: 0, bg: '', anim: 'fade', glow: 30, yRel: 0.5 },
  lower: { size: 52, weight: 600, color: '#ffffff', stroke: '', strokeW: 0, bg: '#e11d48', anim: 'slide', yRel: 0.85 },
};

function makeTextClip(text, opts = {}) {
  const { width: W, height: H } = state.project;
  const p = TEXT_PRESETS[opts.preset || 'subtitle'];
  const start = opts.start ?? state.time;
  const dur = opts.dur ?? 3;
  return baseClip({
    type: 'text', name: 'Teks', text, start, dur,
    track: opts.track ?? textTrack(start, dur),
    font: 'system-ui, sans-serif', size: p.size, weight: p.weight, color: p.color,
    stroke: p.stroke, strokeW: p.strokeW, bg: p.bg, glow: p.glow || 0, align: 'center',
    anim: p.anim, x: W / 2, y: H * p.yRel, maxWidth: W * 0.86,
    ...opts.props,
  });
}

function addText(preset) {
  const c = makeTextClip(preset === 'lower' ? 'Nama • Keterangan' : 'Ketik teksmu', { preset });
  clips().push(c);
  select(c.id);
  commit();
  refreshAll();
}

// =====================================================================
// Media elements & audio graph
// =====================================================================
let audioCtx = null;
let masterGain = null;
let recordDest = null;

function connectEl(el) {
  if (!audioCtx || el._src) return;
  el._src = audioCtx.createMediaElementSource(el);
  el._src.connect(masterGain);
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    recordDest = audioCtx.createMediaStreamDestination();
    masterGain.connect(recordDest);
    for (const el of state.els.values()) connectEl(el);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function elFor(c) {
  if (c.type === 'image') return state.media.get(c.mediaId)?.el;
  let el = state.els.get(c.id);
  if (!el) {
    const m = state.media.get(c.mediaId);
    if (!m) return null;
    el = document.createElement(m.type);
    el.preload = 'auto';
    el.playsInline = true;
    el.src = m.url;
    state.els.set(c.id, el);
    connectEl(el);
  }
  return el;
}

function cleanupEls() {
  for (const [id, el] of state.els) {
    if (!getClip(id)) {
      el.pause();
      state.els.delete(id);
    }
  }
}

function fadeFactor(c, t) {
  const local = t - c.start;
  let f = 1;
  if (c.fadeIn > 0) f = Math.min(f, local / c.fadeIn);
  if (c.fadeOut > 0) f = Math.min(f, (c.dur - local) / c.fadeOut);
  return clamp(f, 0, 1);
}

function syncMedia() {
  const t = state.time;
  for (const c of clips()) {
    if (!isMedia(c)) continue;
    const el = elFor(c);
    if (!el) continue;
    const active = t >= c.start && t < c.start + c.dur;
    if (!active) {
      if (!el.paused) el.pause();
      continue;
    }
    const target = c.in + (t - c.start) * c.speed;
    el.playbackRate = c.speed;
    el.muted = c.muted;
    el.volume = clamp(c.volume * fadeFactor(c, t), 0, 1);
    if (state.playing) {
      if (Math.abs(el.currentTime - target) > 0.3) el.currentTime = target;
      if (el.paused) el.play().catch(() => {});
    } else {
      if (!el.paused) el.pause();
      if (!el.seeking && Math.abs(el.currentTime - target) > 0.02) el.currentTime = target;
    }
  }
}

// =====================================================================
// Rendering kanvas
// =====================================================================
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

function filterCss(f) {
  if (!f) return 'none';
  const parts = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.grayscale) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.blur) parts.push(`blur(${f.blur}px)`);
  return parts.join(' ') || 'none';
}

function textLayout(c, text = c.text) {
  ctx.font = `${c.weight} ${c.size}px ${c.font}`;
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > c.maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  const lh = c.size * 1.2;
  const w = Math.max(1, ...lines.map((l) => ctx.measureText(l).width));
  return { lines, lh, w, h: lines.length * lh };
}

// Ukuran lokal (sebelum scale) untuk hit-test & outline seleksi.
function localSize(c) {
  if (c.type === 'text') {
    const L = textLayout(c);
    const pad = c.bg ? c.size * 0.35 : 0;
    return { w: L.w + pad * 2, h: L.h + pad * 2 };
  }
  return { w: c.w || 100, h: c.h || 100 };
}

function drawText(c, local) {
  let text = c.text;
  if (c.anim === 'typewriter') {
    const p = clamp(local / Math.min(1.5, c.dur * 0.6), 0, 1);
    text = text.slice(0, Math.round(text.length * p));
  }
  const full = textLayout(c);
  const L = textLayout(c, text);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (c.bg) {
    const pad = c.size * 0.35;
    const w = full.w + pad * 2;
    const h = full.h + pad * 2;
    ctx.fillStyle = c.bg;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, c.size * 0.25);
    ctx.fill();
  }
  const top = -full.h / 2 + full.lh / 2;
  L.lines.forEach((line, i) => {
    const y = top + i * full.lh;
    if (c.stroke && c.strokeW > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = c.strokeW;
      ctx.strokeStyle = c.stroke;
      ctx.strokeText(line, 0, y);
    }
    if (c.glow) {
      ctx.shadowColor = c.color;
      ctx.shadowBlur = c.glow;
    }
    ctx.fillStyle = c.color;
    ctx.fillText(line, 0, y);
    ctx.shadowBlur = 0;
  });
}

function drawClip(c, t) {
  const local = t - c.start;
  let alpha = c.opacity * fadeFactor(c, t);
  let scale = c.scale;
  let dy = 0;
  if (c.type === 'text') {
    const p = clamp(local / 0.4, 0, 1);
    if (c.anim === 'pop') scale *= 0.5 + 0.5 * easeOutBack(p);
    if (c.anim === 'fade') alpha *= p;
    if (c.anim === 'slide') { dy = (1 - p) ** 2 * 120; alpha *= p; }
  }
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(c.x, c.y + dy);
  ctx.rotate(c.rotation * Math.PI / 180);
  ctx.scale(scale, scale);
  if (c.type === 'text') {
    drawText(c, local);
  } else {
    const src = elFor(c);
    const ready = c.type === 'image' ? src?.complete : src?.readyState >= 2;
    if (ready) {
      ctx.filter = filterCss(c.filter);
      ctx.drawImage(src, -c.w / 2, -c.h / 2, c.w, c.h);
    }
  }
  ctx.restore();
}

function activeVisual(t) {
  return clips()
    .filter((c) => isVisual(c) && t >= c.start && t < c.start + c.dur)
    .sort((a, b) => b.track - a.track); // track 0 digambar terakhir (paling atas)
}

function draw() {
  const { width: W, height: H, bg } = state.project;
  const t = state.time;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const c of activeVisual(t)) drawClip(c, t);

  const s = selected();
  if (s && isVisual(s) && !state.exporting && !state.playing && t >= s.start && t < s.start + s.dur) {
    const { w, h } = localSize(s);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation * Math.PI / 180);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]);
    ctx.strokeRect(-w * s.scale / 2, -h * s.scale / 2, w * s.scale, h * s.scale);
    ctx.restore();
  }
}

// =====================================================================
// Playback loop
// =====================================================================
let lastFrame = performance.now();

function loop(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (state.playing) {
    state.time += dt;
    const end = projectDuration();
    if (state.time >= end) {
      state.time = end;
      pause();
      if (state.exporting) finishExport();
    }
  }
  syncMedia();
  draw();
  updatePlayhead();
  if (state.exporting) $('#exportProgress').value = state.time / state.exporting.dur;
  requestAnimationFrame(loop);
}

function play() {
  if (!clips().length) return;
  ensureAudio();
  if (state.time >= projectDuration() - 0.01) state.time = 0;
  state.playing = true;
  $('#playBtn').textContent = '❚❚';
}

function pause() {
  state.playing = false;
  $('#playBtn').textContent = '▶';
  for (const el of state.els.values()) el.pause();
  renderInspector();
}

function seek(t) {
  state.time = clamp(t, 0, Math.max(projectDuration(), 0));
}

// =====================================================================
// Interaksi kanvas: pilih & geser objek
// =====================================================================
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * canvas.width / r.width,
    y: (e.clientY - r.top) * canvas.height / r.height,
  };
}

function hitTest(p) {
  const list = activeVisual(state.time).reverse(); // dari yang paling atas
  for (const c of list) {
    const { w, h } = localSize(c);
    const a = -c.rotation * Math.PI / 180;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const lx = (dx * Math.cos(a) - dy * Math.sin(a)) / c.scale;
    const ly = (dx * Math.sin(a) + dy * Math.cos(a)) / c.scale;
    if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) return c;
  }
  return null;
}

let canvasDrag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const c = hitTest(p);
  select(c?.id ?? null);
  if (c) {
    canvasDrag = { id: c.id, ox: p.x - c.x, oy: p.y - c.y };
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!canvasDrag) return;
  const c = getClip(canvasDrag.id);
  const p = canvasPoint(e);
  const { width: W, height: H } = state.project;
  let x = p.x - canvasDrag.ox;
  let y = p.y - canvasDrag.oy;
  // Snap ke tengah kanvas
  if (Math.abs(x - W / 2) < 20) x = W / 2;
  if (Math.abs(y - H / 2) < 20) y = H / 2;
  c.x = Math.round(x);
  c.y = Math.round(y);
  renderInspectorValues();
});
canvas.addEventListener('pointerup', () => {
  if (canvasDrag) commit();
  canvasDrag = null;
});
canvas.addEventListener('wheel', (e) => {
  const c = selected();
  if (!c || !isVisual(c)) return;
  e.preventDefault();
  c.scale = clamp(c.scale * (e.deltaY < 0 ? 1.05 : 1 / 1.05), 0.02, 20);
  renderInspectorValues();
  clearTimeout(canvas._wheelT);
  canvas._wheelT = setTimeout(commit, 300);
}, { passive: false });

// =====================================================================
// Timeline
// =====================================================================
const tlScroll = $('#tlScroll');
const tlInner = $('#tlInner');
const tracksEl = $('#tracks');
const ruler = $('#ruler');
const ROW = 46;

function trackCount() {
  return Math.max(MIN_TRACKS, ...clips().map((c) => c.track + 2));
}

function trackLabel(i) {
  const types = new Set(clips().filter((c) => c.track === i).map((c) => c.type));
  if (!types.size) return '';
  if ([...types].every((t) => t === 'video' || t === 'image')) return types.size > 1 ? 'Utama' : { video: 'Video', image: 'Gambar' }[[...types][0]];
  if (types.size > 1) return 'Campur';
  return { text: 'Teks', video: 'Video', image: 'Gambar', audio: 'Audio' }[[...types][0]];
}

function renderTimeline() {
  const n = trackCount();
  const total = Math.max(projectDuration() + 10, tlScroll.clientWidth / state.pps);
  const width = Math.ceil(total * state.pps);
  tlInner.style.width = `${width}px`;

  $('#trackHeads').innerHTML = Array.from({ length: n }, (_, i) => `<div>${trackLabel(i)}</div>`).join('');

  tracksEl.innerHTML = '';
  tracksEl.style.height = `${n * ROW}px`;
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'track-row';
    tracksEl.appendChild(row);
  }
  for (const c of clips()) {
    const el = document.createElement('div');
    el.className = `clip ${c.type}${c.id === state.selectedId ? ' selected' : ''}`;
    el.dataset.id = c.id;
    positionClipEl(el, c);
    const thumb = state.media.get(c.mediaId)?.thumb;
    if (thumb && c.type !== 'audio') el.style.backgroundImage = `url('${thumb}')`;
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = c.type === 'text' ? `T  ${c.text}` : `${c.name}${c.speed !== 1 ? `  ${c.speed}x` : ''}`;
    el.append(lbl);
    el.insertAdjacentHTML('beforeend', '<div class="h l"></div><div class="h r"></div>');
    el.addEventListener('pointerdown', onClipPointerDown);
    tracksEl.appendChild(el);
  }
  drawRuler(width);
  updatePlayhead();
}

function positionClipEl(el, c) {
  el.style.left = `${c.start * state.pps}px`;
  el.style.width = `${Math.max(4, c.dur * state.pps)}px`;
  el.style.top = `${c.track * ROW}px`;
}

function drawRuler(width) {
  const dpr = window.devicePixelRatio || 1;
  ruler.width = width * dpr;
  ruler.height = 24 * dpr;
  ruler.style.width = `${width}px`;
  ruler.style.height = '24px';
  const r = ruler.getContext('2d');
  r.scale(dpr, dpr);
  r.fillStyle = '#171a21';
  r.fillRect(0, 0, width, 24);
  const step = [0.5, 1, 2, 5, 10, 30, 60].find((s) => s * state.pps >= 60) || 60;
  r.fillStyle = '#8b92a3';
  r.strokeStyle = '#2a2f3a';
  r.font = '10px system-ui';
  for (let t = 0; t * state.pps < width; t += step / 2) {
    const x = Math.round(t * state.pps) + 0.5;
    const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
    r.beginPath();
    r.moveTo(x, major ? 10 : 16);
    r.lineTo(x, 24);
    r.stroke();
    if (major) r.fillText(fmt(t).replace(/\.00$/, ''), x + 3, 10);
  }
}

function updatePlayhead() {
  $('#playhead').style.left = `${state.time * state.pps}px`;
  $('#timeDisplay').textContent = `${fmt(state.time)} / ${fmt(projectDuration())}`;
  if (state.playing) {
    const x = state.time * state.pps;
    if (x > tlScroll.scrollLeft + tlScroll.clientWidth - 40) tlScroll.scrollLeft = x - 80;
  }
}

function snapPoints(ignoreId) {
  const pts = [0, state.time];
  for (const c of clips()) if (c.id !== ignoreId) pts.push(c.start, c.start + c.dur);
  return pts;
}

function snap(t, pts) {
  const th = 8 / state.pps;
  let best = t;
  let bestD = th;
  for (const p of pts) {
    const d = Math.abs(p - t);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}

let clipDrag = null;
function onClipPointerDown(e) {
  e.stopPropagation();
  const el = e.currentTarget;
  const c = getClip(el.dataset.id);
  select(c.id);
  const mode = e.target.classList.contains('l') ? 'trimL' : e.target.classList.contains('r') ? 'trimR' : 'move';
  clipDrag = { el, id: c.id, mode, x0: e.clientX, y0: e.clientY, orig: { ...c }, pts: snapPoints(c.id), moved: false };
  el.setPointerCapture(e.pointerId);
  el.addEventListener('pointermove', onClipPointerMove);
  el.addEventListener('pointerup', onClipPointerUp, { once: true });
}

function onClipPointerMove(e) {
  const d = clipDrag;
  if (!d) return;
  const c = getClip(d.id);
  const o = d.orig;
  const dt = (e.clientX - d.x0) / state.pps;
  d.moved = true;
  const media = state.media.get(c.mediaId);
  if (d.mode === 'move') {
    let start = Math.max(0, o.start + dt);
    const sStart = snap(start, d.pts);
    const sEnd = snap(start + o.dur, d.pts);
    if (sStart !== start) start = sStart;
    else if (sEnd !== start + o.dur) start = sEnd - o.dur;
    c.start = Math.max(0, start);
    c.track = clamp(o.track + Math.round((e.clientY - d.y0) / ROW), 0, trackCount());
  } else if (d.mode === 'trimL') {
    const minStart = isMedia(c) ? o.start - o.in / o.speed : 0;
    let start = clamp(snap(o.start + dt, d.pts), Math.max(0, minStart), o.start + o.dur - 0.1);
    c.start = start;
    c.dur = o.start + o.dur - start;
    if (isMedia(c)) c.in = o.in + (start - o.start) * o.speed;
  } else {
    const maxDur = isMedia(c) && media ? (media.duration - o.in) / o.speed : Infinity;
    const end = snap(o.start + o.dur + dt, d.pts);
    c.dur = clamp(end - o.start, 0.1, maxDur);
  }
  positionClipEl(d.el, c);
}

function onClipPointerUp() {
  const d = clipDrag;
  clipDrag = null;
  d.el.removeEventListener('pointermove', onClipPointerMove);
  if (d.moved) {
    commit();
    renderTimeline();
    renderInspector();
  }
}

// Seek dengan klik/geser di ruler atau area kosong timeline.
function timelineSeek(e) {
  const r = tlInner.getBoundingClientRect();
  seek((e.clientX - r.left) / state.pps);
}
let rulerDrag = false;
tlInner.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.clip')) return;
  rulerDrag = true;
  tlInner.setPointerCapture(e.pointerId);
  if (e.target !== ruler) select(null);
  timelineSeek(e);
});
tlInner.addEventListener('pointermove', (e) => rulerDrag && timelineSeek(e));
tlInner.addEventListener('pointerup', () => { rulerDrag = false; });

// =====================================================================
// Operasi edit
// =====================================================================
function select(id) {
  if (state.selectedId === id) return;
  state.selectedId = id;
  for (const el of tracksEl.querySelectorAll('.clip')) el.classList.toggle('selected', el.dataset.id === id);
  renderInspector();
}

function splitClip(c, t) {
  if (!c || t <= c.start + 0.05 || t >= c.start + c.dur - 0.05) return null;
  const b = structuredClone(c);
  b.id = uid();
  b.start = t;
  b.dur = c.start + c.dur - t;
  b.in = c.in + (t - c.start) * c.speed;
  b.fadeIn = 0;
  c.dur = t - c.start;
  c.fadeOut = 0;
  clips().push(b);
  return b;
}

function splitAtPlayhead() {
  const t = state.time;
  let c = selected();
  if (!c || t <= c.start || t >= c.start + c.dur) {
    c = clips().filter((x) => t > x.start && t < x.start + x.dur).sort((a, b) => a.track - b.track)[0];
  }
  const b = splitClip(c, t);
  if (b) {
    select(b.id);
    commit();
    refreshAll();
  }
}

function deleteSelected() {
  const c = selected();
  if (!c) return;
  state.project.clips = clips().filter((x) => x.id !== c.id);
  state.selectedId = null;
  cleanupEls();
  commit();
  refreshAll();
}

function duplicateSelected() {
  const c = selected();
  if (!c) return;
  const d = structuredClone(c);
  d.id = uid();
  d.start = c.start + c.dur;
  d.track = freeTrack(c.track, d.start, d.dur);
  clips().push(d);
  select(d.id);
  commit();
  refreshAll();
}

// =====================================================================
// Inspector
// =====================================================================
const inspector = $('#inspector');

function getPath(o, path) {
  return path.split('.').reduce((a, k) => a?.[k], o);
}

function setPath(o, path, v) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((a, k) => a[k], o)[last] = v;
}

function field(target, path, label, type, opt = {}) {
  const wrap = document.createElement('label');
  wrap.className = `field${type === 'range' ? '' : ' wide'}`;
  wrap.append(label);
  let input;
  if (type === 'select') {
    input = document.createElement('select');
    for (const [v, l] of opt.options) input.add(new Option(l, v));
  } else if (type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 3;
  } else {
    input = document.createElement('input');
    input.type = type;
    Object.assign(input, opt.attrs || {});
  }
  const val = getPath(target, path);
  if (type === 'checkbox') input.checked = !!val;
  else input.value = val ?? '';
  input.dataset.path = path;
  const out = document.createElement('span');
  out.className = 'val';
  const show = () => { out.textContent = type === 'range' ? (opt.fmt ? opt.fmt(+input.value) : input.value) : ''; };
  show();
  input.addEventListener('sync', show);
  input.addEventListener('input', () => {
    let v = type === 'checkbox' ? input.checked : input.value;
    if (type === 'range' || type === 'number' || opt.numeric) v = +v;
    if (opt.set) opt.set(v);
    else setPath(target, path, v);
    show();
  });
  input.addEventListener('change', () => {
    commit();
    renderTimeline();
  });
  wrap.append(input);
  if (type === 'range') wrap.append(out);
  return wrap;
}

function group(title, ...children) {
  const g = document.createElement('div');
  g.className = 'insp-group';
  const t = document.createElement('div');
  t.className = 'ttl';
  t.textContent = title;
  g.append(t, ...children);
  return g;
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function renderInspector() {
  inspector.innerHTML = '';
  const c = selected();
  const P = state.project;
  if (!c) {
    $('#inspectorTitle').textContent = 'Proyek';
    inspector.append(
      field(P, 'bg', 'Latar', 'color'),
      field(P, 'fps', 'FPS ekspor', 'select', { numeric: true, options: [[24, '24'], [30, '30'], [60, '60']] }),
    );
    const info = document.createElement('p');
    info.className = 'hint';
    info.innerHTML = `Ukuran: ${P.width}×${P.height}<br>Klip: ${clips().length}<br><br>
      <b>Pintasan:</b> Spasi play · S potong · Del hapus · Ctrl+D duplikat · Ctrl+Z undo · ←/→ geser 1 frame.<br>
      Geser objek langsung di preview, scroll mouse untuk zoom objek.`;
    inspector.append(info);
    return;
  }
  const W = P.width;
  const H = P.height;
  $('#inspectorTitle').textContent = { video: 'Video', image: 'Gambar', audio: 'Audio', text: 'Teks' }[c.type];

  if (c.type === 'text') {
    inspector.append(group('Teks',
      field(c, 'text', 'Isi', 'textarea'),
      field(c, 'font', 'Font', 'select', { options: [
        ['system-ui, sans-serif', 'Sans'], ['Georgia, serif', 'Serif'], ['Impact, Haettenschweiler, sans-serif', 'Impact'],
        ['"Courier New", monospace', 'Mono'], ['"Comic Sans MS", cursive', 'Komik'],
      ] }),
      field(c, 'size', 'Ukuran', 'range', { attrs: { min: 16, max: 300 } }),
      field(c, 'weight', 'Tebal', 'select', { numeric: true, options: [[400, 'Normal'], [600, 'Semi'], [700, 'Bold'], [800, 'Extra']] }),
      field(c, 'color', 'Warna', 'color'),
      field(c, 'stroke', 'Garis tepi', 'color'),
      field(c, 'strokeW', 'Tebal garis', 'range', { attrs: { min: 0, max: 30 } }),
      field(c, 'glow', 'Glow', 'range', { attrs: { min: 0, max: 60 } }),
      field(c, 'maxWidth', 'Lebar maks', 'range', { attrs: { min: 100, max: W } }),
      field(c, 'anim', 'Animasi', 'select', { options: [['none', 'Tidak ada'], ['pop', 'Pop'], ['fade', 'Fade'], ['slide', 'Slide naik'], ['typewriter', 'Mesin ketik']] }),
    ));
    const bgRow = field(c, 'bg', 'Latar teks', 'color');
    const clear = button('Tanpa latar', () => { c.bg = ''; commit(); renderInspector(); });
    inspector.append(group('Kotak latar', bgRow, clear));
  }

  if (isVisual(c)) {
    inspector.append(group('Transformasi',
      field(c, 'x', 'X', 'range', { attrs: { min: -W / 2, max: W * 1.5 } }),
      field(c, 'y', 'Y', 'range', { attrs: { min: -H / 2, max: H * 1.5 } }),
      field(c, 'scale', 'Skala', 'range', { attrs: { min: 0.05, max: 5, step: 0.01 }, fmt: (v) => v.toFixed(2) }),
      field(c, 'rotation', 'Rotasi', 'range', { attrs: { min: -180, max: 180 }, fmt: (v) => `${v}°` }),
      field(c, 'opacity', 'Opasitas', 'range', { attrs: { min: 0, max: 1, step: 0.01 }, fmt: (v) => `${Math.round(v * 100)}%` }),
    ));
    if (c.type !== 'text') {
      const row = document.createElement('div');
      row.className = 'btn-row';
      const fit = (mode) => () => {
        Object.assign(c, { scale: fitScale(c.w, c.h, mode), x: W / 2, y: H / 2 });
        commit();
        renderInspector();
      };
      row.append(button('Pas (contain)', fit('contain')), button('Penuh (cover)', fit('cover')));
      inspector.lastChild.append(row);

      inspector.append(group('Filter',
        field(c, 'filter.brightness', 'Kecerahan', 'range', { attrs: { min: 0, max: 200 } }),
        field(c, 'filter.contrast', 'Kontras', 'range', { attrs: { min: 0, max: 200 } }),
        field(c, 'filter.saturate', 'Saturasi', 'range', { attrs: { min: 0, max: 300 } }),
        field(c, 'filter.grayscale', 'Grayscale', 'range', { attrs: { min: 0, max: 100 } }),
        field(c, 'filter.hue', 'Hue', 'range', { attrs: { min: -180, max: 180 } }),
        field(c, 'filter.blur', 'Blur', 'range', { attrs: { min: 0, max: 30 } }),
        button('Reset filter', () => { c.filter = { ...DEFAULT_FILTER }; commit(); renderInspector(); }),
      ));
    }
  }

  if (isMedia(c)) {
    inspector.append(group('Audio & kecepatan',
      field(c, 'volume', 'Volume', 'range', { attrs: { min: 0, max: 1, step: 0.01 }, fmt: (v) => `${Math.round(v * 100)}%` }),
      field(c, 'muted', 'Bisukan', 'checkbox'),
      field(c, 'speed', 'Kecepatan', 'select', {
        numeric: true,
        options: [[0.25, '0.25x'], [0.5, '0.5x'], [1, '1x'], [1.5, '1.5x'], [2, '2x'], [3, '3x'], [4, '4x']],
        set: (v) => { setSpeed(c, v); renderTimeline(); },
      }),
    ));
  }

  inspector.append(group('Waktu',
    field(c, 'fadeIn', 'Fade in', 'range', { attrs: { min: 0, max: 3, step: 0.1 }, fmt: (v) => `${v}s` }),
    field(c, 'fadeOut', 'Fade out', 'range', { attrs: { min: 0, max: 3, step: 0.1 }, fmt: (v) => `${v}s` }),
  ));
  const info = document.createElement('p');
  info.className = 'hint';
  info.textContent = `Mulai ${fmt(c.start)} · Durasi ${c.dur.toFixed(2)} dtk · Track ${c.track + 1}`;
  inspector.append(info);
}

// Kecepatan mengubah durasi di timeline, potongan sumber video tetap sama.
function setSpeed(c, v) {
  const span = c.dur * c.speed;
  c.speed = clamp(v, 0.25, 4);
  c.dur = span / c.speed;
}

function renderInspectorValues() {
  const c = selected();
  if (!c) return;
  for (const input of inspector.querySelectorAll('[data-path]')) {
    if (input === document.activeElement) continue;
    const v = getPath(c, input.dataset.path);
    if (input.type === 'checkbox') input.checked = !!v;
    else input.value = v ?? '';
    input.dispatchEvent(new Event('sync'));
  }
}

function refreshAll() {
  renderTimeline();
  renderInspector();
}

// =====================================================================
// Rasio kanvas
// =====================================================================
function applyCanvasSize() {
  canvas.width = state.project.width;
  canvas.height = state.project.height;
  $('#ratioSelect').value = `${state.project.width}x${state.project.height}`;
}

$('#ratioSelect').addEventListener('change', (e) => {
  const [w, h] = e.target.value.split('x').map(Number);
  const { width: oW, height: oH } = state.project;
  // Pertahankan posisi relatif setiap objek.
  for (const c of clips()) {
    c.x = c.x / oW * w;
    c.y = c.y / oH * h;
    if (c.type === 'text') c.maxWidth = w * 0.86;
    // Skala relatif terhadap ukuran "pas" dipertahankan.
    else if (isVisual(c)) c.scale *= Math.min(w / c.w, h / c.h) / Math.min(oW / c.w, oH / c.h);
  }
  Object.assign(state.project, { width: w, height: h });
  applyCanvasSize();
  commit();
  refreshAll();
});

// =====================================================================
// Ekspor (MediaRecorder dari canvas.captureStream + WebAudio)
// =====================================================================
function pickMime() {
  const cands = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return cands.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
}

async function startExport() {
  const dur = projectDuration();
  if (!dur) return alert('Timeline masih kosong.');
  const mime = pickMime();
  if (!mime) return alert('Browser ini tidak mendukung MediaRecorder. Gunakan Chrome/Edge/Firefox terbaru.');
  ensureAudio();
  pause();
  select(null);
  seek(0);
  syncMedia();
  // Beri waktu video untuk seek ke frame pertama.
  await new Promise((r) => setTimeout(r, 400));

  const stream = canvas.captureStream(state.project.fps);
  for (const tr of recordDest.stream.getAudioTracks()) stream.addTrack(tr);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  state.exporting = { rec, chunks, mime, dur, cancelled: false };

  $('#exportModal').classList.remove('hidden');
  $('#exportDownload').classList.add('hidden');
  $('#exportCancel').textContent = 'Batal';
  $('#exportInfo').textContent = `Format: ${mime.split(';')[0]} · ${state.project.width}×${state.project.height} @ ${state.project.fps}fps`;
  rec.start(500);
  play();
}

function finishExport() {
  const ex = state.exporting;
  if (!ex) return;
  ex.rec.onstop = () => {
    state.exporting = null;
    if (ex.cancelled) {
      $('#exportModal').classList.add('hidden');
      return;
    }
    const blob = new Blob(ex.chunks, { type: ex.mime.split(';')[0] });
    const ext = ex.mime.includes('mp4') ? 'mp4' : 'webm';
    const a = $('#exportDownload');
    a.href = URL.createObjectURL(blob);
    a.download = `kanvascut-${Date.now()}.${ext}`;
    a.classList.remove('hidden');
    $('#exportCancel').textContent = 'Tutup';
    $('#exportInfo').textContent = `Selesai · ${(blob.size / 1e6).toFixed(1)} MB (.${ext})`;
    $('#exportProgress').value = 1;
  };
  ex.rec.stop();
}

$('#exportBtn').addEventListener('click', startExport);
$('#exportCancel').addEventListener('click', () => {
  if (state.exporting) {
    state.exporting.cancelled = true;
    pause();
    finishExport();
  } else {
    $('#exportModal').classList.add('hidden');
  }
});

// =====================================================================
// AI
// =====================================================================
const aiLog = $('#aiLog');
const LS_KEY = 'kanvascut.apiKey';
const LS_MODEL = 'kanvascut.model';
try {
  $('#apiKey').value = localStorage.getItem(LS_KEY) || '';
  $('#aiModel').value = localStorage.getItem(LS_MODEL) || 'claude-opus-5-5';
} catch { /* storage diblokir */ }
$('#apiKey').addEventListener('change', (e) => { try { localStorage.setItem(LS_KEY, e.target.value.trim()); } catch {} });
$('#aiModel').addEventListener('change', (e) => { try { localStorage.setItem(LS_MODEL, e.target.value); } catch {} });

function log(msg, cls = '') {
  const p = document.createElement('div');
  if (cls) p.className = cls;
  p.textContent = msg;
  aiLog.prepend(p);
}

async function runAI(btn, label, fn) {
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = 'Memproses…';
  log(`⏳ ${label}…`);
  try {
    await fn();
  } catch (e) {
    log(`✖ ${e.message}`, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

function aiOpts() {
  return { apiKey: $('#apiKey').value.trim(), model: $('#aiModel').value };
}

function frameBlock() {
  const scale = 768 / Math.max(canvas.width, canvas.height);
  const c = document.createElement('canvas');
  c.width = Math.round(canvas.width * scale);
  c.height = Math.round(canvas.height * scale);
  c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
  const data = c.toDataURL('image/jpeg', 0.8).split(',')[1];
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } };
}

$('#aiIdeaBtn').addEventListener('click', (e) => runAI(e.currentTarget, 'Membuat naskah', async () => {
  const idea = $('#aiIdea').value.trim();
  if (!idea) throw new Error('Tulis idenya dulu.');
  const prompt = scriptPrompt({ idea, style: $('#aiStyle').value, duration: +$('#aiDuration').value });
  const content = $('#aiUseFrame').checked && clips().length
    ? [frameBlock(), { type: 'text', text: `${prompt}\nGambar di atas adalah frame video saat ini, sesuaikan naskah dengan isinya.` }]
    : prompt;
  const { data, model } = await askJSON({
    ...aiOpts(),
    system: 'Kamu penulis naskah konten video pendek yang viral dan penata teks on-screen.',
    content,
    schema: SCRIPT_SCHEMA,
  });
  const hasVisual = clips().some((c) => c.type === 'video' || c.type === 'image');
  if (!hasVisual) state.project.bg = data.background_color;
  let t = hasVisual ? 0 : state.time;
  for (const s of data.scenes) {
    const dur = clamp(s.duration, 0.8, 15);
    const c = makeTextClip(s.caption, {
      preset: s.emphasis ? 'title' : 'caption',
      start: t, dur,
      props: { anim: s.animation, ...(s.emphasis ? { color: data.accent_color, y: state.project.height * 0.45 } : {}) },
    });
    clips().push(c);
    t += dur;
  }
  commit();
  refreshAll();
  log(`✔ "${data.title}" — ${data.scenes.length} adegan ditambahkan (${model}).`, 'ok');
}));

$('#aiSubBtn').addEventListener('click', (e) => runAI(e.currentTarget, 'Membuat subtitle', async () => {
  const script = $('#aiScript').value.trim();
  if (!script) throw new Error('Tempel naskahnya dulu.');
  const { data } = await askJSON({
    ...aiOpts(),
    system: 'Kamu pembuat subtitle profesional.',
    content: subtitlePrompt({ script, totalDuration: projectDuration() }),
    schema: SUBTITLE_SCHEMA,
    effort: 'low',
  });
  for (const s of data.segments) {
    const dur = Math.max(0.3, s.end - s.start);
    clips().push(makeTextClip(s.text, { preset: 'subtitle', start: Math.max(0, s.start), dur }));
  }
  commit();
  refreshAll();
  log(`✔ ${data.segments.length} subtitle ditambahkan.`, 'ok');
}));

function projectSummary() {
  const P = state.project;
  return {
    canvas: { width: P.width, height: P.height, background: P.bg },
    playhead: +state.time.toFixed(2),
    selected_clip_id: state.selectedId,
    clips: clips().map((c) => {
      const o = { id: c.id, type: c.type, track: c.track, start: +c.start.toFixed(2), dur: +c.dur.toFixed(2) };
      if (c.type === 'text') Object.assign(o, { text: c.text, color: c.color, size: c.size, bg: c.bg, anim: c.anim });
      else o.name = c.name;
      if (isVisual(c)) Object.assign(o, { x: Math.round(c.x), y: Math.round(c.y), scale: +c.scale.toFixed(3), rotation: c.rotation, opacity: c.opacity });
      if (isMedia(c)) Object.assign(o, { volume: c.volume, speed: c.speed, muted: c.muted });
      if (c.filter && c.type !== 'text') Object.assign(o, c.filter);
      return o;
    }),
  };
}

const FILTER_KEYS = ['brightness', 'contrast', 'saturate', 'grayscale'];

function applyProps(c, props) {
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    if (FILTER_KEYS.includes(k)) {
      if (c.filter) c.filter[k] = v;
    } else if (k === 'speed') {
      if (isMedia(c)) setSpeed(c, v);
    } else if (k === 'opacity' || k === 'volume') {
      c[k] = clamp(v, 0, 1);
    } else if (k === 'dur') {
      c.dur = Math.max(0.1, v);
    } else if (k === 'start') {
      c.start = Math.max(0, v);
    } else if (k === 'track') {
      c.track = Math.max(0, Math.round(v));
    } else {
      c[k] = v;
    }
  }
}

function applyOps(ops) {
  let done = 0;
  for (const op of ops) {
    const c = op.clip_id ? getClip(op.clip_id) : null;
    if (op.op === 'update' && c) { applyProps(c, op.props); done++; }
    else if (op.op === 'delete' && c) { state.project.clips = clips().filter((x) => x !== c); done++; }
    else if (op.op === 'split' && c && op.at != null) { if (splitClip(c, op.at)) done++; }
    else if (op.op === 'add_text' && op.props?.text) {
      const p = op.props;
      const start = p.start ?? state.time;
      const dur = p.dur ?? 3;
      const n = makeTextClip(p.text, { preset: 'caption', start, dur, track: p.track ?? undefined });
      applyProps(n, { ...p, start: null, dur: null, track: null });
      clips().push(n);
      done++;
    } else if (op.op === 'set_background' && op.props?.color) { state.project.bg = op.props.color; done++; }
  }
  cleanupEls();
  return done;
}

$('#aiCmdBtn').addEventListener('click', (e) => runAI(e.currentTarget, 'Menjalankan perintah', async () => {
  const cmd = $('#aiCommand').value.trim();
  if (!cmd) throw new Error('Tulis perintahnya dulu.');
  const { data } = await askJSON({
    ...aiOpts(),
    system: AGENT_SYSTEM,
    content: `Status proyek:\n${JSON.stringify(projectSummary())}\n\nPerintah pengguna: ${cmd}`,
    schema: OPS_SCHEMA,
  });
  const n = applyOps(data.ops);
  if (!getClip(state.selectedId)) state.selectedId = null;
  commit();
  refreshAll();
  log(`✔ ${data.explanation} (${n}/${data.ops.length} operasi diterapkan, bisa di-undo)`, 'ok');
}));

// =====================================================================
// UI wiring
// =====================================================================
for (const b of document.querySelectorAll('.tabs button')) {
  b.addEventListener('click', () => {
    for (const x of document.querySelectorAll('.tabs button')) x.classList.toggle('active', x === b);
    for (const s of document.querySelectorAll('.tab-body')) s.classList.toggle('hidden', s.dataset.tab !== b.dataset.tab);
  });
}

const fileInput = $('#fileInput');
fileInput.addEventListener('change', async () => {
  for (const f of fileInput.files) await importFile(f);
  fileInput.value = '';
});
const dz = $('#dropzone');
for (const target of [dz, document.body]) {
  target.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  target.addEventListener('dragleave', () => dz.classList.remove('over'));
  target.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.remove('over');
    for (const f of e.dataTransfer.files) await importFile(f);
  });
}

for (const b of document.querySelectorAll('[data-preset]')) b.addEventListener('click', () => addText(b.dataset.preset));

$('#playBtn').addEventListener('click', () => (state.playing ? pause() : play()));
$('#toStartBtn').addEventListener('click', () => seek(0));
$('#splitBtn').addEventListener('click', splitAtPlayhead);
$('#delBtn').addEventListener('click', deleteSelected);
$('#dupBtn').addEventListener('click', duplicateSelected);
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);
$('#zoom').addEventListener('input', (e) => { state.pps = +e.target.value; renderTimeline(); });

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (e.code === 'Space') { e.preventDefault(); state.playing ? pause() : play(); }
  else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
  else if (e.key === 's' || e.key === 'S') splitAtPlayhead();
  else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  else if (e.key === 'ArrowLeft') seek(state.time - 1 / state.project.fps);
  else if (e.key === 'ArrowRight') seek(state.time + 1 / state.project.fps);
});

window.addEventListener('resize', renderTimeline);

// Untuk debugging / pengujian otomatis.
window.kanvascut = { state, addText, makeTextClip, applyOps, commit, refreshAll, seek, play, pause, projectDuration };

applyCanvasSize();
commit();
refreshAll();
requestAnimationFrame(loop);
