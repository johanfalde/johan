// Text-to-speech untuk voice-over. Dipanggil langsung dari browser dengan key milik pengguna.
// Hasilnya Blob MP3 yang diperlakukan seperti audio impor biasa.

export const TTS_PROVIDERS = {
  azure: {
    label: 'Microsoft Azure AI Speech',
    hint: 'Suara neural paling natural untuk bahasa Indonesia. Paket gratis F0: 500 ribu karakter/bulan. Buat resource "Speech" di portal Azure, lalu salin Key dan Region (mis. southeastasia).',
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
      audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
    }),
  });
  if (!res.ok) throw await failure(res, 'Google');
  const { audioContent } = await res.json();
  const bytes = Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'audio/mpeg' });
}

// Cache supaya teks yang sama tidak dibayar dua kali.
const cache = new Map();

export async function synthesize(opts) {
  if (!opts.key) throw new Error('Isi API key layanan suara dulu.');
  const text = opts.text.trim();
  if (!text) throw new Error('Teks kosong.');
  const id = JSON.stringify([opts.provider, opts.region, opts.voice, opts.rate, text]);
  if (!cache.has(id)) {
    const fn = opts.provider === 'google' ? google : azure;
    cache.set(id, fn({ ...opts, text }).catch((e) => { cache.delete(id); throw e; }));
  }
  return cache.get(id);
}
