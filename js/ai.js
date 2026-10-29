// Integrasi Claude API langsung dari browser.
// SDK dimuat dari CDN hanya saat fitur AI dipakai, jadi editor tetap jalan offline.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.133.0/+esm';

let sdkPromise = null;
let cachedClient = null;
let cachedKey = null;

async function loadSDK() {
  sdkPromise ??= import(SDK_URL);
  return (await sdkPromise).default;
}

async function getClient(apiKey) {
  const Anthropic = await loadSDK();
  if (!cachedClient || cachedKey !== apiKey) {
    // Key milik pengguna sendiri, disimpan lokal; aplikasi ini tidak punya server.
    cachedClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    cachedKey = apiKey;
  }
  return { client: cachedClient, Anthropic };
}

// Helper skema: semua objek wajib additionalProperties:false dan semua field required.
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const obj = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/**
 * Minta jawaban JSON yang dijamin cocok dengan `schema` (structured outputs).
 * `content` boleh string atau array content block (mis. teks + gambar).
 */
export async function askJSON({ apiKey, model, system, content, schema, effort = 'medium' }) {
  if (!apiKey) throw new Error('Isi Claude API key dulu di "Pengaturan API".');
  const { client, Anthropic } = await getClient(apiKey);

  const params = {
    model,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content }],
    output_config: { effort, format: { type: 'json_schema', schema } },
  };

  let res;
  try {
    if (model.startsWith('claude-haiku')) {
      // Haiku tidak punya server-side fallback.
      res = await client.messages.create(params);
    } else {
      // Jika model menolak karena kebijakan, API otomatis mencoba model cadangan.
      res = await client.beta.messages.create({
        ...params,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('API key tidak valid (401).');
    if (err instanceof Anthropic.PermissionDeniedError) throw new Error('Key tidak punya akses ke model ini (403).');
    if (err instanceof Anthropic.RateLimitError) throw new Error('Kena rate limit (429). Tunggu sebentar lalu coba lagi.');
    if (err instanceof Anthropic.APIConnectionError) throw new Error('Tidak bisa terhubung ke api.anthropic.com. Cek koneksi internet.');
    if (err instanceof Anthropic.APIError) throw new Error(`API error ${err.status ?? ''}: ${err.message}`);
    throw err;
  }

  if (res.stop_reason === 'refusal') {
    const why = res.stop_details?.explanation ? `: ${res.stop_details.explanation}` : '.';
    throw new Error(`Permintaan ditolak model${why}`);
  }
  if (res.stop_reason === 'max_tokens') throw new Error('Jawaban terpotong (max_tokens). Coba perintah yang lebih singkat.');

  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { data: JSON.parse(text), usage: res.usage, model: res.model };
}

// ---------- Fitur 1: naskah video dari ide ----------
export const SCRIPT_SCHEMA = obj({
  title: { type: 'string' },
  background_color: { type: 'string', description: 'Warna hex latar yang cocok, mis. #101828' },
  accent_color: { type: 'string', description: 'Warna hex teks utama, mis. #FFD400' },
  scenes: {
    type: 'array',
    items: obj({
      caption: { type: 'string', description: 'Teks yang tampil di layar, maks ~12 kata' },
      duration: { type: 'number', description: 'Durasi adegan dalam detik' },
      animation: { type: 'string', enum: ['pop', 'fade', 'slide', 'typewriter'] },
      emphasis: { type: 'boolean', description: 'true untuk hook/judul yang perlu lebih besar' },
    }),
  },
});

export function scriptPrompt({ idea, style, duration }) {
  return [
    `Buat naskah video pendek vertikal berbahasa Indonesia.`,
    `Ide: ${idea}`,
    `Gaya: ${style}. Target total durasi: ${duration} detik.`,
    `Adegan pertama harus hook yang kuat (emphasis=true). Adegan terakhir ajakan (follow/komentar/beli).`,
    `Jumlah durasi semua adegan harus mendekati ${duration} detik. Caption singkat dan mudah dibaca di HP.`,
  ].join('\n');
}

// ---------- Fitur 2: subtitle dari naskah ----------
export const SUBTITLE_SCHEMA = obj({
  segments: {
    type: 'array',
    items: obj({
      text: { type: 'string' },
      start: { type: 'number' },
      end: { type: 'number' },
    }),
  },
});

export function subtitlePrompt({ script, totalDuration }) {
  return [
    `Pecah naskah berikut menjadi subtitle berwaktu (detik, mulai dari 0).`,
    `Tiap segmen maks 2 baris pendek (~7 kata). Jangan ubah isi kata-katanya.`,
    totalDuration > 0
      ? `Sebar segmen merata sampai total ${totalDuration.toFixed(1)} detik.`
      : `Perkirakan waktu dengan kecepatan bicara ~2,5 kata per detik.`,
    `Naskah:\n"""${script}"""`,
  ].join('\n');
}

// ---------- Fitur 3: perintah edit (agent) ----------
const PROPS = obj({
  text: nullable({ type: 'string' }),
  start: nullable({ type: 'number' }),
  dur: nullable({ type: 'number' }),
  track: nullable({ type: 'integer' }),
  x: nullable({ type: 'number' }),
  y: nullable({ type: 'number' }),
  scale: nullable({ type: 'number' }),
  rotation: nullable({ type: 'number' }),
  opacity: nullable({ type: 'number' }),
  fadeIn: nullable({ type: 'number' }),
  fadeOut: nullable({ type: 'number' }),
  color: nullable({ type: 'string' }),
  size: nullable({ type: 'number' }),
  bg: nullable({ type: 'string' }),
  stroke: nullable({ type: 'string' }),
  anim: nullable({ type: 'string', enum: ['none', 'pop', 'fade', 'slide', 'typewriter'] }),
  volume: nullable({ type: 'number' }),
  speed: nullable({ type: 'number' }),
  muted: nullable({ type: 'boolean' }),
  brightness: nullable({ type: 'number' }),
  contrast: nullable({ type: 'number' }),
  saturate: nullable({ type: 'number' }),
  grayscale: nullable({ type: 'number' }),
});

export const OPS_SCHEMA = obj({
  explanation: { type: 'string', description: 'Ringkasan singkat apa yang diubah, bahasa Indonesia' },
  ops: {
    type: 'array',
    items: obj({
      op: { type: 'string', enum: ['update', 'delete', 'split', 'add_text', 'set_background'] },
      clip_id: nullable({ type: 'string' }),
      at: nullable({ type: 'number', description: 'Detik timeline untuk split' }),
      props: PROPS,
    }),
  },
});

export const AGENT_SYSTEM = `Kamu asisten editor video di aplikasi KanvasCut.
Kamu menerima status proyek (JSON) dan perintah pengguna, lalu mengembalikan daftar operasi.
Aturan:
- Koordinat x,y adalah titik tengah objek dalam piksel kanvas. scale 1 = ukuran asli.
- Track 0 paling atas (biasanya teks); angka track lebih besar digambar lebih bawah.
- "update": isi clip_id dan hanya field props yang berubah; field lain null.
- "delete": isi clip_id. "split": isi clip_id dan at (detik timeline, harus di dalam klip).
- "add_text": clip_id null, props minimal text, start, dur.
- "set_background": props.color berisi warna hex latar proyek.
- opacity 0-1, volume 0-1, speed 0.25-4, filter brightness/contrast/saturate dalam persen (100 = normal), grayscale 0-100.
- Warna dalam hex (#RRGGBB). bg null = tidak berubah; bg "" = hapus latar teks.
- Jika perintah tidak bisa dilakukan, kembalikan ops kosong dan jelaskan di explanation.`;
