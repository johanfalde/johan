// Pembuat adegan bergaya motion graphics. Dipakai template bawaan dan fitur AI,
// jadi naskah dari Claude langsung jadi video dengan tata letak yang sama.

// Urutan lapisan (track 0 paling atas).
export const LAYER = {
  progress: 0, narration: 1, headline: 2, body: 3, card: 4, emoji: 5, kickerText: 6, kickerPill: 7, fx: 8, glow: 9, bg: 10, music: 11, voice: 12,
};

// Jeda dari awal adegan sampai narasi mulai.
export const VOICE_DELAY = 0.3;

/**
 * @param scenes  [{ kicker, headline, body, emoji, narration, duration, bg_from, bg_to, accent, transition,
 *                   photo?: { mediaId, w, h, type? }, motion?, steam?: { x, y, w, h }, voice_dur? }]
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

  let T = start;
  scenes.forEach((s, i) => {
    const D = Math.max(1.5, s.duration);
    const end = (offset) => ({ start: T + offset, dur: D - offset, fadeOut: 0.25 });

    const photo = withBackground && s.photo;
    // Posisi elemen (fraksi tinggi layar). Adegan foto: teks di bawah supaya makanannya tetap terlihat.
    const Y = photo
      ? { kicker: 0.12, emoji: 0.23, emojiSize: 130, headline: 0.63, body: 0.755, narr: 0.885 }
      : { kicker: 0.2, emoji: 0.36, emojiSize: 190, headline: 0.53, body: 0.68, narr: 0.85 };

    if (photo) {
      const cover = Math.max(W / s.photo.w, H / s.photo.h);
      const isVideo = s.photo.type === 'video';
      out.push(base({
        type: isVideo ? 'video' : 'image', role: 'scene', sceneIndex: i, name: isVideo ? 'Video adegan' : 'Foto',
        mediaId: s.photo.mediaId, w: s.photo.w, h: s.photo.h, volume: isVideo ? 0.25 : 1,
        track: LAYER.bg, start: T, dur: D, x: W / 2, y: H / 2, scale: cover, motion: s.motion || (i % 2 ? 'zoom-out' : 'zoom-in'),
        transition: { type: i === 0 ? 'none' : s.transition, dur: 0.5 },
      }));
      out.push(shape({ name: 'Bayangan', shape: 'shade', track: LAYER.glow, start: T, dur: D, x: W / 2, y: H / 2, color: '#000000', top: 0.15, bottom: 0.8 }));
      if (s.steam && !isVideo) {
        out.push(shape({
          name: 'Uap panas', shape: 'steam', track: LAYER.fx, start: T, dur: D, fadeIn: 0.4, fadeOut: 0.3, strength: 1.7,
          x: W * s.steam.x, y: H * s.steam.y, w: W * s.steam.w, h: H * s.steam.h,
        }));
      }
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
      const ky = H * Y.kicker;
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

    if (s.emoji) {
      const ey = H * Y.emoji;
      out.push(text({
        name: 'Ikon', text: s.emoji, track: LAYER.emoji, ...end(0.15), font: 'system-ui, sans-serif', size: Y.emojiSize * k,
        weight: 400, anim: 'pop', shadow: true, y: ey, keyframes: float(W / 2, ey, D - 0.15, 22 * k),
      }));
    }

    out.push(text({
      name: 'Judul', text: s.headline, track: LAYER.headline, ...end(0.3), font: '"Bebas Neue", Impact, sans-serif',
      weight: 400, size: 150 * k, upper: true, anim: 'none', textStyle: 'word', wordSpan: 0.9,
      highlight: s.accent, y: H * Y.headline, lineHeight: 1.0,
    }));

    if (s.body) {
      const by = H * Y.body;
      const bodySize = 46 * k;
      const maxW = W * 0.72;
      const lines = Math.max(1, Math.ceil(s.body.length * bodySize * 0.55 / maxW));
      out.push(shape({
        name: 'Kartu', shape: 'rect', track: LAYER.card, ...end(0.6), anim: 'fade', w: W * 0.84,
        h: lines * bodySize * 1.3 + 80 * k, radius: 36 * k, y: by,
        ...(photo ? { color: '#000000', color2: '#000000', opacity: 0.45 } : { color: '#ffffff', color2: '#ffffff', opacity: 0.14 }),
      }));
      out.push(text({
        name: 'Isi', text: s.body, track: LAYER.body, ...end(0.6), font: 'Poppins, system-ui, sans-serif', weight: 600,
        size: bodySize, color: '#f1f5f9', anim: 'slide', maxWidth: maxW, lineHeight: 1.3, shadow: false, y: by,
      }));
    }

    if (s.narration) {
      // Dengan voice-over, subtitle karaoke mengikuti panjang suara.
      const timing = s.voice_dur
        ? { start: T + VOICE_DELAY, dur: Math.min(D - VOICE_DELAY, s.voice_dur + 0.5), fadeOut: 0.25, wordSpan: s.voice_dur }
        : end(0.2);
      out.push(text({
        name: 'Subtitle', text: s.narration, track: LAYER.narration, ...timing, size: 54 * k, weight: 900,
        upper: true, anim: 'fade', textStyle: 'karaoke', hlBox: true, highlight: s.accent, hlText: '#0b1020',
        stroke: '#000000', strokeW: 8 * k, maxWidth: W * 0.84, y: H * Y.narr,
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
// Folder narasi per template: <base>/<suara>/01.mp3 … (dibuat buat_suara.py / buat_suara_gemini.py).
export function voiceSet(base) {
  return {
    wanita: `${base}/wanita`, 'wanita-ava': `${base}/wanita-ava`,
    pria: `${base}/pria`, 'pria-andrew': `${base}/pria-andrew`,
    'gemini-wanita': { dir: `${base}/gemini-wanita`, ext: 'wav' },
    'gemini-pria': { dir: `${base}/gemini-pria`, ext: 'wav' },
  };
}

export const DEMO_BISNIS_AI = {
  title: 'Bisnis dengan AI',
  music: 'examples/assets/musik-bisnis.mp3',
  voices: voiceSet('examples/assets/suara'),
  scenes: [
    {
      kicker: 'Bisnis 2026', emoji: '🤖', headline: 'Bisnis kamu masih manual?',
      body: 'Saatnya AI jadi asisten yang kerja 24 jam tanpa lelah.',
      narration: 'Ini tiga cara pakai AI, biar bisnismu naik level!',
      duration: 4.2, bg_from: '#0f172a', bg_to: '#1d4ed8', accent: '#facc15', transition: 'none',
    },
    {
      kicker: 'Cara #1', emoji: '💬', headline: 'Admin chat 24/7',
      body: 'Chatbot AI membalas pertanyaan pelanggan dalam hitungan detik, bahkan saat kamu tidur.',
      narration: 'Pelanggan dibalas cepat, closing pun makin banyak.',
      duration: 4.4, bg_from: '#042f2e', bg_to: '#0f766e', accent: '#5eead4', transition: 'zoom',
    },
    {
      kicker: 'Cara #2', emoji: '🎬', headline: 'Konten jalan otomatis',
      body: 'AI menulis naskah, caption, sampai subtitle. Kamu tinggal posting.',
      narration: 'Satu ide, bisa jadi puluhan konten.',
      duration: 4.4, bg_from: '#2e1065', bg_to: '#7c3aed', accent: '#f0abfc', transition: 'slide-up',
    },
    {
      kicker: 'Cara #3', emoji: '📊', headline: 'Baca data penjualan',
      body: 'AI merangkum laporan dan memberi saran stok serta promo yang paling laku.',
      narration: 'Keputusan pakai data, bukan tebakan.',
      duration: 4.4, bg_from: '#431407', bg_to: '#ea580c', accent: '#fde68a', transition: 'circle',
    },
    {
      kicker: 'Mulai sekarang', emoji: '🚀', headline: 'Mulai dari yang kecil',
      body: 'Pilih satu pekerjaan yang paling menyita waktu, lalu otomatiskan dengan AI.',
      narration: 'Langkah kecil hari ini, hasil besar besok.',
      duration: 4.4, bg_from: '#0c1427', bg_to: '#0369a1', accent: '#38bdf8', transition: 'whip',
    },
    {
      kicker: 'Bagikan', emoji: '👉', headline: 'Follow untuk tips bisnis AI',
      body: 'Simpan video ini dan kirim ke teman yang punya usaha.',
      narration: 'Follow dan simpan, biar nggak lupa ya!',
      duration: 4.2, bg_from: '#1e1b4b', bg_to: '#be123c', accent: '#fb7185', transition: 'wipe',
    },
  ],
};

// ---------------------------------------------------------------------
// Template promosi: "Cuanki Buhaji Factory" (9:16, foto asli dari pemilik usaha)
// ---------------------------------------------------------------------
const MANGKUK = 'examples/assets/cuanki/mangkuk.jpg';
const GEROBAK = 'examples/assets/cuanki/gerobak.jpg';

export const DEMO_CUANKI = {
  title: 'Cuanki Buhaji Factory',
  music: 'examples/assets/musik-bisnis.mp3',
  voices: voiceSet('examples/assets/suara/cuanki'),
  scenes: [
    {
      image: MANGKUK, motion: 'zoom-in', steam: { x: 0.5, y: 0.34, w: 0.75, h: 0.4 }, kicker: 'Kuliner Bandung', emoji: '🍜', headline: 'Cuanki yang lagi viral!',
      body: 'Kuah gurih, bakso, tahu, dan siomay goreng yang renyah.',
      narration: 'Lagi cari cuanki Bandung yang enak dan lagi viral? Ini dia!',
      duration: 4.4, bg_from: '#1c0a00', bg_to: '#c2410c', accent: '#facc15', transition: 'none',
    },
    {
      image: GEROBAK, motion: 'zoom-out', kicker: 'Buhaji Factory', emoji: '👩‍🍳', headline: 'Cuanki asli Bandung',
      body: 'Dibuat setiap hari dengan resep khas Bandung.',
      narration: 'Buhaji Factory, cuanki asli Bandung dengan kuah gurih yang bikin nagih.',
      duration: 4.6, bg_from: '#1c0a00', bg_to: '#b91c1c', accent: '#fde047', transition: 'whip',
    },
    {
      image: MANGKUK, motion: 'zoom-in', steam: { x: 0.5, y: 0.34, w: 0.75, h: 0.4 }, kicker: 'Paling pas', emoji: '😋', headline: 'Hangat, gurih, nagih!',
      body: 'Pas buat makan bareng teman dan keluarga, apalagi pas hujan.',
      narration: 'Kuahnya hangat dan gurih, paling pas dinikmati bareng teman, apalagi pas hujan.',
      duration: 4.8, bg_from: '#1c0a00', bg_to: '#9a3412', accent: '#fdba74', transition: 'fade',
    },
    {
      image: MANGKUK, motion: 'pan-left', steam: { x: 0.5, y: 0.34, w: 0.75, h: 0.4 }, kicker: 'Promo hari ini', emoji: '🔥', headline: 'Cuma 10 ribu!',
      body: 'Dari Rp15.000 jadi Rp10.000 per porsi. Murah meriah, porsi puas.',
      narration: 'Lagi promo, cuma sepuluh ribu rupiah per porsi!',
      duration: 4.2, bg_from: '#3f0d0d', bg_to: '#dc2626', accent: '#fde047', transition: 'zoom',
    },
    {
      image: MANGKUK, motion: 'zoom-out', kicker: 'Frozen food', emoji: '❄️', headline: 'Bisa kirim frozen',
      body: 'Stok cuanki di rumah, tinggal rebus kapan saja.',
      narration: 'Mau stok di rumah? Cuanki kami bisa dikirim dalam bentuk frozen food.',
      duration: 4.6, bg_from: '#082f49', bg_to: '#0284c7', accent: '#7dd3fc', transition: 'slide-up',
    },
    {
      image: GEROBAK, motion: 'pan-right', kicker: 'Go international', emoji: '✈️', headline: 'Sampai mancanegara',
      body: 'Rasa khas Bandung kini dinikmati sampai luar negeri.',
      narration: 'Rasa khas Bandung ini, sekarang sudah sampai ke mancanegara.',
      duration: 4.4, bg_from: '#1e1b4b', bg_to: '#4338ca', accent: '#a5b4fc', transition: 'circle',
    },
    {
      image: GEROBAK, motion: 'zoom-in', kicker: 'Pesan sekarang', emoji: '👉', headline: 'Buhaji Factory Cuanki Bandung',
      body: 'Mampir langsung, atau pesan versi frozen untuk dikirim.',
      narration: 'Yuk cobain sekarang, dan pesan frozen-nya untuk stok di rumah!',
      duration: 4.6, bg_from: '#1c0a00', bg_to: '#ea580c', accent: '#facc15', transition: 'wipe',
    },
  ],
};
