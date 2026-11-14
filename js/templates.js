// Pembuat adegan bergaya motion graphics. Dipakai template bawaan dan fitur AI,
// jadi naskah dari Claude langsung jadi video dengan tata letak yang sama.

// Urutan lapisan (track 0 paling atas).
export const LAYER = {
  progress: 0, narration: 1, headline: 2, body: 3, card: 4, emoji: 5, productCard: 6, kickerText: 7, kickerPill: 8, glow: 9, bg: 10, music: 11,
};

/**
 * @param scenes  [{ kicker, headline, body, emoji, narration, duration, bg_from, bg_to, accent, transition }]
 * @param base    fungsi pembuat klip dasar dari editor
 * @param opts    { W, H, start, withBackground, progressBar }
 */
export function buildSceneClips(scenes, base, { W, H, start = 0, withBackground = true, progressBar = true }) {
  const k = Math.min(W, H) / 1080;
  const out = [];
  const text = (props) => base({
    type: 'text', name: 'Teks', font: 'Montserrat, system-ui, sans-serif', weight: 800, size: 60 * k,
    color: '#ffffff', stroke: '', strokeW: 0, bg: '', glow: 0, align: 'center', anim: 'pop',
    textStyle: 'static', highlight: '#facc15', hlBox: false, hlText: '#0b1020', upper: false, shadow: true,
    wordSpan: 0, lineHeight: 1.12, maxWidth: W * 0.86, x: W / 2,
    ...props,
  });
  const shape = (props) => base({ type: 'shape', name: 'Bentuk', color: '#ffffff', color2: '#ffffff', w: 200, h: 200, radius: 0, x: W / 2, anim: 'none', ...props });
  // Keyframe melayang naik-turun pelan supaya elemen tidak terasa kaku.
  const float = (x, y, dur, amp, scale = 1) => [
    { t: 0, x, y, scale, rotation: 0, opacity: 1 },
    { t: dur / 2, x, y: y - amp, scale: scale * 1.04, rotation: 0, opacity: 1 },
    { t: dur, x, y, scale, rotation: 0, opacity: 1 },
  ];

  // m = { id, type: 'image'|'video', w, h, duration }
  const mediaClip = (m, props, D) => base({
    type: m.type, mediaId: m.id, name: 'Media', w: m.w, h: m.h, in: 0, volume: 0, muted: true,
    // video lebih pendek dari adegan diperlambat sedikit supaya tidak habis di tengah
    speed: m.type === 'video' && m.duration ? Math.min(1, m.duration / D) : 1,
    ...props,
  });

  let T = start;
  scenes.forEach((s, i) => {
    const D = Math.max(1.5, s.duration);
    const end = (offset) => ({ start: T + offset, dur: D - offset, fadeOut: 0.25 });

    if (s.background) {
      // Klip AI / video stok / foto sebagai latar penuh, ditutup lapisan gelap supaya teks tetap terbaca.
      out.push(mediaClip(s.background, {
        name: 'Latar', track: LAYER.bg, start: T, dur: D, x: W / 2, y: H / 2,
        scale: Math.max(W / s.background.w, H / s.background.h),
        motion: s.background.type === 'image' ? 'zoom-in' : 'none',
        transition: { type: i === 0 ? 'none' : s.transition, dur: 0.5 },
      }, D));
      out.push(shape({
        name: 'Gelap', shape: 'rect', track: LAYER.glow, start: T, dur: D, w: W, h: H, x: W / 2, y: H / 2,
        color: '#000000', color2: '#000000', opacity: s.dim ?? 0.45,
      }));
    } else if (withBackground) {
      out.push(shape({
        name: 'Latar', shape: 'gradient', track: LAYER.bg, start: T, dur: D, color: s.bg_from, color2: s.bg_to,
        angle: 120 + i * 40, x: W / 2, y: H / 2, motion: 'zoom-in',
        transition: { type: i === 0 ? 'none' : s.transition, dur: 0.5 },
      }));
      const gy = H * 0.36;
      out.push(shape({
        name: 'Cahaya', shape: 'circle', track: LAYER.glow, ...end(0.1), fadeIn: 0.4, w: W * 0.52, color: s.accent,
        opacity: 0.22, y: gy, keyframes: float(W / 2, gy, D - 0.1, 0, 1).map((kf, j) => ({ ...kf, scale: [0.9, 1.08, 0.95][j], opacity: 0.22 })),
      }));
    }

    if (s.kicker) {
      const ky = H * 0.2;
      const kSize = 38 * k;
      out.push(shape({
        name: 'Label', shape: 'rect', track: LAYER.kickerPill, ...end(0.1), anim: 'slide-left',
        w: s.kicker.length * kSize * 0.72 + 70 * k, h: 76 * k, radius: 38 * k, color: s.accent, color2: s.accent, y: ky,
      }));
      out.push(text({
        text: s.kicker, track: LAYER.kickerText, ...end(0.1), anim: 'slide-left', size: kSize, weight: 800,
        color: '#0b1020', upper: true, shadow: false, y: ky,
      }));
    }

    if (s.media) {
      // Foto/video produk di kartu putih, posisi sama dengan emoji.
      const my = H * 0.345;
      const boxW = W * 0.6, boxH = H * 0.19;
      const fit = Math.min(boxW / s.media.w, boxH / s.media.h);
      const pad = 26 * k;
      out.push(shape({
        name: 'Kartu produk', shape: 'rect', track: LAYER.productCard, ...end(0.15), anim: 'pop',
        w: s.media.w * fit + pad * 2, h: s.media.h * fit + pad * 2, radius: 36 * k,
        color: '#ffffff', color2: '#ffffff', opacity: 0.95, y: my, keyframes: float(W / 2, my, D - 0.15, 14 * k),
      }));
      out.push(mediaClip(s.media, {
        name: 'Produk', track: LAYER.emoji, ...end(0.15), x: W / 2, y: my, scale: fit, anim: 'pop',
        keyframes: float(W / 2, my, D - 0.15, 14 * k, fit),
      }, D - 0.15));
    } else if (s.emoji) {
      const ey = H * 0.36;
      out.push(text({
        name: 'Ikon', text: s.emoji, track: LAYER.emoji, ...end(0.15), font: 'system-ui, sans-serif', size: 190 * k,
        weight: 400, anim: 'pop', shadow: true, y: ey, keyframes: float(W / 2, ey, D - 0.15, 22 * k),
      }));
    }

    out.push(text({
      name: 'Judul', text: s.headline, track: LAYER.headline, ...end(0.3), font: '"Bebas Neue", Impact, sans-serif',
      weight: 400, size: 150 * k, upper: true, anim: 'none', textStyle: 'word', wordSpan: 0.9,
      highlight: s.accent, y: H * 0.53, lineHeight: 1.0,
    }));

    if (s.body) {
      const by = H * 0.68;
      const bodySize = 46 * k;
      const maxW = W * 0.72;
      const lines = s.body.split('\n').reduce((n, para) => n + Math.max(1, Math.ceil(para.length * bodySize * 0.55 / maxW)), 0);
      out.push(shape({
        name: 'Kartu', shape: 'rect', track: LAYER.card, ...end(0.6), anim: 'fade', w: W * 0.84,
        h: lines * bodySize * 1.3 + 80 * k, radius: 36 * k, color: '#ffffff', color2: '#ffffff', opacity: 0.14, y: by,
      }));
      out.push(text({
        name: 'Isi', text: s.body, track: LAYER.body, ...end(0.6), font: 'Poppins, system-ui, sans-serif', weight: 600,
        size: bodySize, color: '#f1f5f9', anim: 'slide', maxWidth: maxW, lineHeight: 1.3, shadow: false, y: by,
      }));
    }

    if (s.narration) {
      out.push(text({
        name: 'Subtitle', text: s.narration, track: LAYER.narration, ...end(0.2), size: 54 * k, weight: 900,
        upper: true, anim: 'fade', textStyle: 'karaoke', hlBox: true, highlight: s.accent, hlText: '#0b1020',
        stroke: '#000000', strokeW: 8 * k, maxWidth: W * 0.84, y: H * 0.85,
      }));
    }
    T += D;
  });

  if (progressBar && scenes.length) {
    out.push(shape({
      name: 'Progress', shape: 'progress', track: LAYER.progress, start, dur: T - start, w: W * 0.86, h: 10 * k,
      radius: 5 * k, color: '#ffffff', color2: '#ffffff', y: H * 0.055,
    }));
  }
  return { clips: out, end: T };
}

// ---------------------------------------------------------------------
// Template contoh: "Bisnis dengan AI" (9:16, 26 detik)
// ---------------------------------------------------------------------
export const DEMO_BISNIS_AI = {
  title: 'Bisnis dengan AI',
  music: 'examples/assets/musik-bisnis.mp3',
  scenes: [
    {
      kicker: 'Bisnis 2026', emoji: '🤖', headline: 'Bisnis kamu masih manual?',
      body: 'Saatnya AI jadi asisten yang kerja 24 jam tanpa lelah.',
      narration: 'Ini 3 cara pakai AI biar bisnismu naik level',
      duration: 4.2, bg_from: '#0f172a', bg_to: '#1d4ed8', accent: '#facc15', transition: 'none',
    },
    {
      kicker: 'Cara #1', emoji: '💬', headline: 'Admin chat 24/7',
      body: 'Chatbot AI membalas pertanyaan pelanggan dalam hitungan detik, bahkan saat kamu tidur.',
      narration: 'Pelanggan dibalas cepat closing makin banyak',
      duration: 4.4, bg_from: '#042f2e', bg_to: '#0f766e', accent: '#5eead4', transition: 'zoom',
    },
    {
      kicker: 'Cara #2', emoji: '🎬', headline: 'Konten jalan otomatis',
      body: 'AI menulis naskah, caption, sampai subtitle. Kamu tinggal posting.',
      narration: 'Satu ide jadi puluhan konten',
      duration: 4.4, bg_from: '#2e1065', bg_to: '#7c3aed', accent: '#f0abfc', transition: 'slide-up',
    },
    {
      kicker: 'Cara #3', emoji: '📊', headline: 'Baca data penjualan',
      body: 'AI merangkum laporan dan memberi saran stok serta promo yang paling laku.',
      narration: 'Keputusan pakai data bukan tebakan',
      duration: 4.4, bg_from: '#431407', bg_to: '#ea580c', accent: '#fde68a', transition: 'circle',
    },
    {
      kicker: 'Mulai sekarang', emoji: '🚀', headline: 'Mulai dari yang kecil',
      body: 'Pilih satu pekerjaan yang paling menyita waktu, lalu otomatiskan dengan AI.',
      narration: 'Langkah kecil hari ini hasil besar besok',
      duration: 4.4, bg_from: '#0c1427', bg_to: '#0369a1', accent: '#38bdf8', transition: 'whip',
    },
    {
      kicker: 'Bagikan', emoji: '👉', headline: 'Follow untuk tips bisnis AI',
      body: 'Simpan video ini dan kirim ke teman yang punya usaha.',
      narration: 'Follow dan simpan biar nggak lupa',
      duration: 4.2, bg_from: '#1e1b4b', bg_to: '#be123c', accent: '#fb7185', transition: 'wipe',
    },
  ],
};

// ---------------------------------------------------------------------
// Template affiliate (9:16, ±18 detik): hook → masalah → produk → manfaat → CTA
// Dipakai tombol template di editor dan pipeline otomatis (automation/).
// ---------------------------------------------------------------------
const AFF_PALETTE = [
  { bg_from: '#0f172a', bg_to: '#be123c', accent: '#fde047' },
  { bg_from: '#1c1917', bg_to: '#57534e', accent: '#fca5a5' },
  { bg_from: '#042f2e', bg_to: '#0d9488', accent: '#99f6e4' },
  { bg_from: '#1e1b4b', bg_to: '#6d28d9', accent: '#f0abfc' },
  { bg_from: '#431407', bg_to: '#ea580c', accent: '#fef08a' },
];

/**
 * row: { produk, hook, masalah, manfaat ("a | b | c"), bukti, promo, cta,
 *        emoji_hook, emoji_masalah, media (foto/video produk), latar: [media per adegan] }
 */
export function affiliateScenes(row) {
  const manfaat = String(row.manfaat || '').split('|').map((t) => t.trim()).filter(Boolean);
  const latar = row.latar || [];
  const scenes = [
    {
      kicker: row.kicker || 'Wajib tahu', emoji: row.emoji_hook || '😱', headline: row.hook,
      narration: row.narasi_hook || row.hook, duration: 3.2, transition: 'none',
    },
    {
      kicker: 'Masalahnya', emoji: row.emoji_masalah || '😩', headline: row.masalah_judul || 'Sering begini?',
      body: row.masalah, narration: row.narasi_masalah || row.masalah, duration: 3.8, transition: 'whip',
    },
    {
      kicker: 'Solusinya', emoji: row.emoji_produk || '✨', media: row.media, headline: row.produk,
      body: row.bukti, narration: row.narasi_produk || `Pakai ${row.produk}`, duration: 4.2, transition: 'zoom',
    },
    {
      kicker: 'Kenapa bagus', emoji: row.emoji_manfaat || '✅', headline: manfaat[0] || row.produk,
      body: manfaat.slice(1).map((t) => `✔ ${t}`).join('\n'), narration: row.narasi_manfaat || manfaat.join(', '),
      duration: 3.8, transition: 'slide-up',
    },
    {
      kicker: row.promo || 'Lagi promo', emoji: '👇', headline: row.cta || 'Cek keranjang kuning',
      body: row.promo_detail || 'Stok terbatas, cek sekarang sebelum harga naik.',
      narration: row.narasi_cta || 'Klik keranjang kuning sekarang', duration: 3.4, transition: 'circle',
    },
  ];
  return scenes.map((s, i) => ({ ...AFF_PALETTE[i % AFF_PALETTE.length], ...s, ...(latar[i] ? { background: latar[i] } : {}) }));
}

export const DEMO_AFFILIATE = {
  title: 'Affiliate: Tumbler 1 Liter',
  music: 'examples/assets/musik-bisnis.mp3',
  row: {
    produk: 'Tumbler 1 Liter',
    hook: 'Minum air putih masih malas?',
    emoji_hook: '🥤',
    masalah_judul: 'Lupa minum lagi',
    masalah: 'Botol kecil cepat habis, ujung-ujungnya seharian kurang minum.',
    narasi_masalah: 'Botol kecil cepat habis jadi malas isi ulang',
    emoji_masalah: '😮‍💨',
    emoji_produk: '💧',
    bukti: 'Muat 1 liter, ada penanda waktu minum dari pagi sampai sore.',
    narasi_produk: 'Cukup isi sekali pagi dan ikuti penanda waktunya',
    manfaat: 'Penanda jam minum | Tahan dingin | Anti bocor | Muat tas',
    emoji_manfaat: '🕒',
    narasi_manfaat: 'Ada penanda jam tahan dingin dan anti bocor',
    promo: 'Diskon hari ini',
    cta: 'Cek keranjang kuning',
    promo_detail: 'Harga promo terbatas. Cek dulu sebelum kehabisan.',
    narasi_cta: 'Klik keranjang kuning sebelum promonya habis',
  },
};
