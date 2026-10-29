// Mesin render kanvas: dipakai preview dan ekspor, jadi hasilnya identik.

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const easeOutCubic = (x) => 1 - (1 - x) ** 3;
export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export const FONT_OPTIONS = [
  ['Montserrat, system-ui, sans-serif', 'Montserrat'],
  ['"Bebas Neue", Impact, sans-serif', 'Bebas Neue'],
  ['Poppins, system-ui, sans-serif', 'Poppins'],
  ['system-ui, sans-serif', 'Sans sistem'],
  ['Georgia, serif', 'Serif'],
  ['"Courier New", monospace', 'Mono'],
];

export function loadFonts() {
  const specs = ['400 40px Montserrat', '800 40px Montserrat', '900 40px Montserrat', '400 40px "Bebas Neue"', '600 40px Poppins', '800 40px Poppins'];
  return Promise.all(specs.map((s) => document.fonts.load(s).catch(() => null)));
}

export const TRANSITIONS = [
  ['none', 'Tanpa transisi'], ['fade', 'Crossfade'], ['slide-left', 'Geser kiri'], ['slide-up', 'Geser atas'],
  ['zoom', 'Zoom'], ['whip', 'Whip (blur cepat)'], ['wipe', 'Wipe'], ['circle', 'Lingkaran'],
];

export const MOTIONS = [
  ['none', 'Diam'], ['zoom-in', 'Zoom in pelan'], ['zoom-out', 'Zoom out pelan'], ['pan-left', 'Geser ke kiri'], ['pan-right', 'Geser ke kanan'],
];

export const TEXT_ANIMS = [
  ['none', 'Tidak ada'], ['pop', 'Pop'], ['fade', 'Fade'], ['slide', 'Slide naik'], ['slide-left', 'Slide dari kanan'],
  ['zoom', 'Zoom masuk'], ['typewriter', 'Mesin ketik'],
];

// ---------------------------------------------------------------------
// Keyframe & gerak kamera
// ---------------------------------------------------------------------
export const KF_KEYS = ['x', 'y', 'scale', 'rotation', 'opacity'];

export function evalProps(c, local, W, H) {
  const o = { x: c.x, y: c.y, scale: c.scale, rotation: c.rotation, opacity: c.opacity };
  const k = c.keyframes;
  if (k?.length) {
    let a = k[0];
    let b = k[k.length - 1];
    if (local <= a.t) b = a;
    else if (local >= b.t) a = b;
    else {
      for (let i = 0; i < k.length - 1; i++) {
        if (local >= k[i].t && local <= k[i + 1].t) { a = k[i]; b = k[i + 1]; break; }
      }
    }
    const u = a === b ? 0 : easeInOutCubic((local - a.t) / (b.t - a.t));
    for (const key of KF_KEYS) o[key] = a[key] + (b[key] - a[key]) * u;
  }
  const u = c.dur > 0 ? clamp(local / c.dur, 0, 1) : 0;
  switch (c.motion) {
    case 'zoom-in': o.scale *= 1 + 0.15 * u; break;
    case 'zoom-out': o.scale *= 1.15 - 0.15 * u; break;
    case 'pan-left': o.scale *= 1.12; o.x += (0.5 - u) * W * 0.08; break;
    case 'pan-right': o.scale *= 1.12; o.x -= (0.5 - u) * W * 0.08; break;
    default: break;
  }
  return o;
}

export function fadeLocal(c, local) {
  let f = 1;
  if (c.fadeIn > 0) f = Math.min(f, local / c.fadeIn);
  if (c.fadeOut > 0) f = Math.min(f, (c.dur - local) / c.fadeOut);
  return clamp(f, 0, 1);
}

export const srcTime = (c, local) => c.in + local * c.speed;

// ---------------------------------------------------------------------
// Rencana frame: klip apa saja yang tampil di waktu t, termasuk klip
// sebelumnya yang sedang "keluar" karena transisi.
// ---------------------------------------------------------------------
export function framePlan(clips, t, fps) {
  const items = [];
  for (const c of clips) {
    if (c.type === 'audio' || t < c.start || t >= c.start + c.dur) continue;
    const it = { c, local: t - c.start, order: 1 };
    const tr = c.transition;
    if (tr && tr.type !== 'none' && it.local < tr.dur) {
      const p = it.local / tr.dur;
      it.tin = { type: tr.type, p };
      const prev = clips.find((o) => o !== c && o.type !== 'audio' && o.track === c.track && Math.abs(o.start + o.dur - c.start) < 0.05);
      if (prev) items.push({ c: prev, local: Math.max(0, prev.dur - 1 / fps), order: 0, tout: { type: tr.type, p } });
    }
    items.push(it);
  }
  // Track 0 digambar terakhir (paling atas).
  return items.sort((a, b) => b.c.track - a.c.track || a.order - b.order);
}

// ---------------------------------------------------------------------
// Teks
// ---------------------------------------------------------------------
export function textLayout(ctx, c) {
  const text = c.upper ? c.text.toUpperCase() : c.text;
  ctx.font = `${c.weight} ${c.size}px ${c.font}`;
  const space = ctx.measureText(' ').width;
  const lines = [];
  let idx = 0;
  for (const para of String(text).split('\n')) {
    let line = { words: [], w: 0 };
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const w = ctx.measureText(word).width;
      if (line.words.length && line.w + space + w > c.maxWidth) {
        lines.push(line);
        line = { words: [], w: 0 };
      }
      line.w = line.words.length ? line.w + space + w : w;
      line.words.push({ word, w, i: idx++ });
    }
    lines.push(line);
  }
  const lh = c.size * (c.lineHeight || 1.15);
  return { lines, lh, space, w: Math.max(1, ...lines.map((l) => l.w)), h: lines.length * lh, count: idx };
}

// Waktu mulai tiap kata (kata panjang dapat jatah lebih lama).
function wordTimes(words, c) {
  const span = Math.min(c.dur * 0.92, c.wordSpan > 0 ? c.wordSpan : Infinity);
  const weights = words.map((w) => w.word.length + 2);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return { span, starts: weights.map((w) => { const s = acc / total * span; acc += w; return s; }) };
}

function drawText(ctx, c, local) {
  const L = textLayout(ctx, c);
  const words = L.lines.flatMap((l) => l.words);
  let active = -1;
  let timing = null;
  if (c.textStyle === 'karaoke' || c.textStyle === 'word') {
    timing = wordTimes(words, c);
    if (local < timing.span) {
      for (let i = 0; i < words.length; i++) if (local >= timing.starts[i]) active = i;
    } else if (c.textStyle === 'word') {
      active = words.length; // semua kata tampil, tanpa sorotan
    }
  }
  let charsLeft = Infinity;
  if (c.anim === 'typewriter') {
    const totalChars = words.reduce((a, w) => a + w.word.length + 1, 0);
    charsLeft = Math.round(totalChars * clamp(local / Math.min(1.5, c.dur * 0.6), 0, 1));
  }

  if (c.bg) {
    const pad = c.size * 0.35;
    ctx.fillStyle = c.bg;
    ctx.beginPath();
    ctx.roundRect(-L.w / 2 - pad, -L.h / 2 - pad, L.w + pad * 2, L.h + pad * 2, c.size * 0.25);
    ctx.fill();
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  const top = -L.h / 2 + L.lh / 2;
  L.lines.forEach((line, li) => {
    const y = top + li * L.lh;
    let x = c.align === 'left' ? -L.w / 2 : c.align === 'right' ? L.w / 2 - line.w : -line.w / 2;
    for (const wd of line.words) {
      if (charsLeft <= 0) return;
      if (c.textStyle === 'word' && wd.i > active) return;
      let txt = wd.word;
      if (txt.length > charsLeft) txt = txt.slice(0, charsLeft);
      charsLeft -= wd.word.length + 1;

      const isActive = timing && wd.i === active && active < words.length;
      ctx.save();
      if (isActive) {
        const p = clamp((local - timing.starts[wd.i]) / 0.18, 0, 1);
        const s = 1 + 0.14 * (1 - easeOutCubic(p));
        const cx = x + wd.w / 2;
        ctx.translate(cx, y);
        ctx.scale(s, s);
        ctx.translate(-cx, -y);
        if (c.hlBox) {
          const px = c.size * 0.1;
          ctx.fillStyle = c.highlight;
          ctx.beginPath();
          ctx.roundRect(x - px, y - c.size * 0.62, wd.w + px * 2, c.size * 1.24, c.size * 0.2);
          ctx.fill();
        }
      }
      if (c.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = c.size * 0.25;
        ctx.shadowOffsetY = c.size * 0.08;
      }
      if (c.stroke && c.strokeW > 0 && !(isActive && c.hlBox)) {
        ctx.lineWidth = c.strokeW;
        ctx.strokeStyle = c.stroke;
        ctx.strokeText(txt, x, y);
        ctx.shadowColor = 'transparent';
      }
      if (c.glow) {
        ctx.shadowColor = c.color;
        ctx.shadowBlur = c.glow;
        ctx.shadowOffsetY = 0;
      }
      ctx.fillStyle = isActive ? (c.hlBox ? c.hlText : c.highlight) : c.color;
      ctx.fillText(txt, x, y);
      ctx.restore();
      x += wd.w + L.space;
    }
  });
}

// ---------------------------------------------------------------------
// Bentuk (latar gradien, kotak, lingkaran, progress bar)
// ---------------------------------------------------------------------
function drawShape(ctx, c, local, W, H) {
  if (c.shape === 'gradient') {
    const ang = ((c.angle ?? 135) + local * 6) * Math.PI / 180;
    const r = Math.hypot(W, H) / 2;
    const g = ctx.createLinearGradient(-Math.cos(ang) * r, -Math.sin(ang) * r, Math.cos(ang) * r, Math.sin(ang) * r);
    g.addColorStop(0, c.color);
    g.addColorStop(1, c.color2);
    ctx.fillStyle = g;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    // Cahaya lembut yang bergerak pelan supaya latar terasa hidup.
    for (const [ox, oy, rr, sp] of [[-0.3, -0.25, 0.55, 0.5], [0.32, 0.3, 0.6, 0.35]]) {
      const bx = (ox + Math.sin(local * sp) * 0.05) * W;
      const by = (oy + Math.cos(local * sp) * 0.04) * H;
      const rad = rr * Math.min(W, H);
      const rg = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
      rg.addColorStop(0, 'rgba(255,255,255,0.16)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(-W / 2, -H / 2, W, H);
    }
    return;
  }
  const fill = () => {
    if (c.color2 && c.shape === 'rect' && c.color2 !== c.color) {
      const g = ctx.createLinearGradient(-c.w / 2, 0, c.w / 2, 0);
      g.addColorStop(0, c.color);
      g.addColorStop(1, c.color2);
      return g;
    }
    return c.color;
  };
  ctx.beginPath();
  if (c.shape === 'circle') {
    ctx.arc(0, 0, c.w / 2, 0, Math.PI * 2);
    ctx.fillStyle = fill();
    ctx.fill();
  } else if (c.shape === 'progress') {
    ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, c.radius);
    ctx.fillStyle = c.color2;
    ctx.save();
    ctx.globalAlpha *= 0.3;
    ctx.fill();
    ctx.restore();
    const p = clamp(local / c.dur, 0, 1);
    ctx.beginPath();
    ctx.roundRect(-c.w / 2, -c.h / 2, Math.max(c.h, c.w * p), c.h, c.radius);
    ctx.fillStyle = c.color;
    ctx.fill();
  } else {
    ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, c.radius || 0);
    ctx.fillStyle = fill();
    ctx.fill();
  }
}

// Ukuran lokal (sebelum skala) untuk hit-test & garis seleksi.
export function localSize(ctx, c, W, H) {
  if (c.type === 'text') {
    const L = textLayout(ctx, c);
    const pad = c.bg ? c.size * 0.35 : 0;
    return { w: L.w + pad * 2, h: L.h + pad * 2 };
  }
  if (c.type === 'shape' && c.shape === 'gradient') return { w: W, h: H };
  if (c.type === 'shape' && c.shape === 'circle') return { w: c.w, h: c.w };
  return { w: c.w || 100, h: c.h || 100 };
}

export function filterCss(f, extraBlur = 0) {
  const parts = [];
  if (f) {
    if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
    if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
    if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
    if (f.grayscale) parts.push(`grayscale(${f.grayscale}%)`);
    if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`);
  }
  const blur = (f?.blur || 0) + extraBlur;
  if (blur > 0.2) parts.push(`blur(${blur.toFixed(1)}px)`);
  return parts.join(' ') || 'none';
}

// ---------------------------------------------------------------------
// Gambar satu item
// ---------------------------------------------------------------------
function drawItem(ctx, it, W, H, getSource) {
  const c = it.c;
  const P = evalProps(c, it.local, W, H);
  let alpha = P.opacity * fadeLocal(c, it.local);
  let scale = P.scale;
  let dx = 0;
  let dy = 0;
  let blur = 0;
  let reveal = null;

  const isOverlay = c.type === 'text' || (c.type === 'shape' && c.shape !== 'gradient');
  if (isOverlay && c.anim && c.anim !== 'none' && c.anim !== 'typewriter') {
    const p = clamp(it.local / 0.45, 0, 1);
    const e = easeOutCubic(p);
    switch (c.anim) {
      case 'pop': scale *= 0.4 + 0.6 * easeOutBack(p); alpha *= clamp(p * 3, 0, 1); break;
      case 'fade': alpha *= e; break;
      case 'slide': dy += (1 - e) * 0.05 * H; alpha *= e; break;
      case 'slide-left': dx += (1 - e) * 0.25 * W; alpha *= e; break;
      case 'zoom': scale *= 1 + (1 - e) * 0.6; alpha *= e; break;
      default: break;
    }
  }

  if (it.tin) {
    const p = easeInOutCubic(it.tin.p);
    switch (it.tin.type) {
      case 'fade': alpha *= p; break;
      case 'slide-left': dx += (1 - p) * W; break;
      case 'slide-up': dy += (1 - p) * H; break;
      case 'zoom': scale *= 1 + (1 - p) * 0.35; alpha *= p; break;
      case 'whip': dx += (1 - p) * W; blur = (1 - p) * 40; break;
      case 'wipe': reveal = { kind: 'wipe', p }; break;
      case 'circle': reveal = { kind: 'circle', p }; break;
      default: break;
    }
  }
  if (it.tout) {
    const p = easeInOutCubic(it.tout.p);
    switch (it.tout.type) {
      case 'slide-left': dx -= p * W; break;
      case 'slide-up': dy -= p * H; break;
      case 'zoom': scale *= 1 + p * 0.35; break;
      case 'whip': dx -= p * W; blur = p * 40; break;
      default: break;
    }
  }
  if (alpha <= 0.002) return;

  ctx.save();
  if (reveal) {
    ctx.beginPath();
    if (reveal.kind === 'wipe') ctx.rect(0, 0, W * reveal.p, H);
    else ctx.arc(W / 2, H / 2, reveal.p * Math.hypot(W, H) / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  ctx.globalAlpha = alpha;
  ctx.translate(P.x + dx, P.y + dy);
  ctx.rotate(P.rotation * Math.PI / 180);
  ctx.scale(scale, scale);
  if (c.type === 'text') {
    if (blur) ctx.filter = filterCss(null, blur);
    drawText(ctx, c, it.local);
  } else if (c.type === 'shape') {
    if (blur) ctx.filter = filterCss(null, blur);
    drawShape(ctx, c, it.local, W, H);
  } else {
    const src = getSource(c);
    const ready = c.type === 'image' ? src?.complete : src?.readyState >= 2;
    if (ready) {
      ctx.filter = filterCss(c.filter, blur);
      ctx.drawImage(src, -c.w / 2, -c.h / 2, c.w, c.h);
    }
  }
  ctx.restore();
}

export function renderFrame(ctx, project, t, getSource) {
  const { width: W, height: H, bg, fps } = project;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const it of framePlan(project.clips, t, fps)) drawItem(ctx, it, W, H, getSource);
}
