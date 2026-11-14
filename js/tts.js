// Text-to-speech untuk voice-over. Dipanggil langsung dari browser dengan key milik pengguna.
// Hasilnya Blob MP3 yang diperlakukan seperti audio impor biasa.

export const TTS_PROVIDERS = {
  gemini: {
    label: 'Google Gemini TTS',
    hint: 'Suara AI generasi terbaru, intonasi seperti manusia dan gaya bicara bisa diatur. Key GRATIS: buka aistudio.google.com, login akun Google, klik "Get API key" → "Create API key". Tanpa kartu kredit (ada batas pemakaian harian).',
    needsRegion: false,
    voices: [
      ['Kore', 'Kore — wanita, tegas'],
      ['Aoede', 'Aoede — wanita, ringan'],
      ['Leda', 'Leda — wanita, muda'],
      ['Zephyr', 'Zephyr — wanita, cerah'],
      ['Puck', 'Puck — pria, ceria'],
      ['Charon', 'Charon — pria, informatif'],
      ['Fenrir', 'Fenrir — pria, bersemangat'],
      ['Orus', 'Orus — pria, mantap'],
    ],
  },
  elevenlabs: {
    label: 'ElevenLabs',
    hint: 'Suara AI paling ekspresif dan mirip manusia. Daftar di elevenlabs.io (ada paket gratis bulanan), buka Profile → API Keys. Untuk logat Indonesia asli: tambahkan suara Indonesia dari Voice Library ke akunmu, lalu klik "Muat suara dari akun".',
    needsRegion: false,
    voices: [
      ['21m00Tcm4TlvDq8ikWAM', 'Rachel — wanita'],
      ['EXAVITQu4vr4xnSDxMaL', 'Sarah — wanita'],
      ['pNInz6obpgDQGcFmaJgB', 'Adam — pria'],
      ['TX3LPaxmHKxFdv7VOQHJ', 'Liam — pria'],
    ],
  },
  azure: {
    label: 'Microsoft Azure AI Speech',
    hint: 'Suara neural Indonesia yang jernih (Gadis/Ardi). Paket gratis F0: 500 ribu karakter/bulan. Buat resource "Speech" di portal Azure, lalu salin Key dan Region (mis. southeastasia).',
    needsRegion: true,
    voices: [
      ['id-ID-GadisNeural', 'Gadis — wanita'],
      ['id-ID-ArdiNeural', 'Ardi — pria'],
    ],
  },
  google: {
    label: 'Google Cloud Text-to-Speech',
    hint: 'Aktifkan "Cloud Text-to-Speech API" di Google Cloud, lalu buat API key. Ada kuota gratis bulanan.',
    needsRegion: false,
    voices: [
      ['id-ID-Chirp3-HD-Sulafat', 'Chirp3 HD Sulafat — wanita (paling natural)'],
      ['id-ID-Chirp3-HD-Vindemiatrix', 'Chirp3 HD Vindemiatrix — wanita'],
      ['id-ID-Chirp3-HD-Zephyr', 'Chirp3 HD Zephyr — wanita'],
      ['id-ID-Chirp3-HD-Umbriel', 'Chirp3 HD Umbriel — pria (paling natural)'],
      ['id-ID-Chirp3-HD-Zubenelgenubi', 'Chirp3 HD Zubenelgenubi — pria'],
      ['id-ID-Wavenet-A', 'Wavenet A — wanita'],
      ['id-ID-Wavenet-D', 'Wavenet D — wanita'],
      ['id-ID-Wavenet-B', 'Wavenet B — pria'],
      ['id-ID-Wavenet-C', 'Wavenet C — pria'],
    ],
  },
};

const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

async function failure(res, who) {
  let detail = '';
  try { detail = (await res.text()).slice(0, 200); } catch { /* abaikan */ }
  if (res.status === 401 || res.status === 403) return new Error(`${who}: key atau region tidak valid (${res.status}).`);
  if (res.status === 429) return new Error(`${who}: kuota/rate limit habis (429).`);
  return new Error(`${who}: error ${res.status} ${detail}`);
}

async function azure({ key, region, voice, text, rate }) {
  if (!region) throw new Error('Isi region Azure (mis. southeastasia).');
  const pct = Math.round((rate - 1) * 100);
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="id-ID">`
    + `<voice name="${voice}"><prosody rate="${pct >= 0 ? '+' : ''}${pct}%">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${encodeURIComponent(region.trim())}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
    },
    body: ssml,
  });
  if (!res.ok) throw await failure(res, 'Azure');
  return res.blob();
}

async function google({ key, voice, text, rate }) {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'id-ID', name: voice },
      // Chirp 3 HD mengatur tempo sendiri; speakingRate hanya untuk suara lama.
      audioConfig: voice.includes('Chirp3') ? { audioEncoding: 'MP3' } : { audioEncoding: 'MP3', speakingRate: rate },
    }),
  });
  if (!res.ok) throw await failure(res, 'Google');
  const { audioContent } = await res.json();
  const bytes = Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'audio/mpeg' });
}

async function elevenlabs({ key, voice, text, model, rate }) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: model || 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: Math.min(1.2, Math.max(0.7, rate)) },
    }),
  });
  if (!res.ok) throw await failure(res, 'ElevenLabs');
  return res.blob();
}

// Daftar suara di akun ElevenLabs (termasuk suara Indonesia yang ditambahkan dari Voice Library).
export async function listElevenLabsVoices(key) {
  if (!key) throw new Error('Isi API key ElevenLabs dulu.');
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  if (!res.ok) throw await failure(res, 'ElevenLabs');
  const { voices } = await res.json();
  return voices.map((v) => {
    const l = v.labels || {};
    const gender = l.gender === 'female' ? 'wanita' : l.gender === 'male' ? 'pria' : (l.gender || '');
    const extra = [gender, l.accent, l.language].filter(Boolean).join(', ');
    return [v.voice_id, extra ? `${v.name} — ${extra}` : v.name];
  });
}

// ---------------------------------------------------------------------
// Gemini TTS: model dicari otomatis dari akun (nama model sering berganti).
// ---------------------------------------------------------------------
export const GEMINI_STYLES = {
  santai: 'Bacakan dalam bahasa Indonesia dengan gaya santai, hangat, dan antusias seperti kreator konten TikTok',
  jualan: 'Bacakan dalam bahasa Indonesia dengan gaya semangat dan meyakinkan seperti host live jualan',
  profesional: 'Bacakan dalam bahasa Indonesia dengan gaya profesional, tenang, dan jelas seperti presenter berita',
  cerita: 'Bacakan dalam bahasa Indonesia dengan gaya bercerita yang lembut dan ekspresif',
};

const geminiModels = new Map();

async function geminiModel(key) {
  if (!geminiModels.has(key)) {
    geminiModels.set(key, (async () => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(key)}`);
      if (!res.ok) throw await failure(res, 'Gemini');
      const { models = [] } = await res.json();
      const tts = models.map((m) => m.name).filter((n) => /tts/i.test(n));
      if (!tts.length) throw new Error('Gemini: tidak ada model TTS untuk key ini.');
      // Pilih versi terbaru; utamakan "flash" (cepat & kuota gratis lebih longgar) daripada "pro".
      const ver = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]);
      tts.sort((a, b) => ver(b) - ver(a) || (/flash/.test(b) - /flash/.test(a)) || (/lite/.test(a) - /lite/.test(b)));
      return tts[0];
    })().catch((e) => { geminiModels.delete(key); throw e; }));
  }
  return geminiModels.get(key);
}

// PCM 16-bit mono → WAV supaya bisa diputar & didecode browser.
function pcmToWav(bytes, rate) {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const str = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + bytes.length, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, bytes.length, true);
  return new Blob([header, bytes], { type: 'audio/wav' });
}

async function gemini({ key, voice, text, style }) {
  const model = await geminiModel(key);
  // Arahan yang sama untuk setiap kalimat supaya nada & tempo antar-adegan tetap konsisten.
  const prompt = `${GEMINI_STYLES[style] || GEMINI_STYLES.santai}. Pertahankan karakter suara, nada, dan tempo yang sama sepanjang video:\n${text}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (!res.ok) throw await failure(res, 'Gemini');
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error('Gemini tidak mengirim audio. Coba lagi atau ganti suara.');
  const { mimeType = '', data: b64 } = part.inlineData;
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (/wav|mpeg|mp3/i.test(mimeType)) return new Blob([bytes], { type: mimeType });
  const rate = +(mimeType.match(/rate=(\d+)/) || [0, 24000])[1];
  return pcmToWav(bytes, rate);
}

// Cache supaya teks yang sama tidak dibayar dua kali.
const cache = new Map();

export async function synthesize(opts) {
  if (!opts.key) throw new Error('Isi API key layanan suara dulu.');
  const text = opts.text.trim();
  if (!text) throw new Error('Teks kosong.');
  const id = JSON.stringify([opts.provider, opts.region, opts.voice, opts.model, opts.style, opts.rate, text]);
  if (!cache.has(id)) {
    const fn = { gemini, google, elevenlabs, azure }[opts.provider] || azure;
    cache.set(id, fn({ ...opts, text }).catch((e) => { cache.delete(id); throw e; }));
  }
  return cache.get(id);
}
