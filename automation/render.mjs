// Render KanvasCut tanpa layar: buka editor di Chromium headless, muat job, ekspor MP4.
// Pemakaian: import { openRenderer } from './render.mjs'
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { extname, join, normalize, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const ROOT = resolve(new URL('..', import.meta.url).pathname);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

function serve(root) {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, path.endsWith('/') ? `${path}index.html` : path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    let st;
    try { st = statSync(file); } catch { res.writeHead(404).end(); return; }
    if (!st.isFile()) { res.writeHead(404).end(); return; }
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    // Range request supaya elemen <video> bisa seek.
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
      createReadStream(file).pipe(res);
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/** Ubah path lokal (relatif ke root repo) jadi URL server. URL http(s) dibiarkan. */
export function toUrl(base, p) {
  if (!p) return null;
  if (/^https?:\/\//.test(p)) return p;
  return `${base}/${p.replace(/^\.?\//, '')}`;
}

function ffmpegFix(src, dst) {
  // Chromium tidak punya encoder AAC, jadi audionya Opus. TikTok/IG butuh AAC.
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart', dst], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg gagal mengubah audio ke AAC');
}

export async function openRenderer({ root = ROOT, log = console.log } = {}) {
  const server = await serve(root);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', (e) => log(`  [browser] ${e.message}`));
  page.on('dialog', (d) => { log(`  [browser dialog] ${d.message()}`); d.dismiss(); });
  let onProgress = () => {};
  await page.exposeFunction('__progress', (p) => onProgress(p));
  await page.goto(`${base}/index.html`);
  await page.waitForFunction(() => window.kanvascut?.loadJob);

  async function render(job, outPath) {
    const j = { ...job, media: toUrl(base, job.media), music: toUrl(base, job.music), latar: (job.latar || []).map((p) => toUrl(base, p)) };
    const info = await page.evaluate((jj) => window.kanvascut.loadJob(jj), j);
    log(`  durasi ${info.duration.toFixed(1)} dtk, ${info.clips} klip`);
    let last = -1;
    onProgress = (p) => {
      const pct = Math.floor(p * 4) * 25;
      if (pct !== last) { last = pct; log(`  render ${pct}%`); }
    };
    const res = await page.evaluate(async () => {
      const r = await window.kanvascut.renderMP4({ onProgress: (p) => window.__progress(p) });
      const buf = new Uint8Array(await r.blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return { b64: btoa(bin), videoCodec: r.videoCodec, audioCodec: r.audioCodec };
    });
    const raw = `${outPath}.raw.mp4`;
    await writeFile(raw, Buffer.from(res.b64, 'base64'));
    if (res.audioCodec) ffmpegFix(raw, outPath);
    else spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-c', 'copy', '-movflags', '+faststart', outPath]);
    await rm(raw, { force: true });
    return { file: outPath, ...info, videoCodec: res.videoCodec, audioCodec: res.audioCodec ? 'aac' : null };
  }

  async function close() {
    await browser.close();
    server.close();
  }
  return { render, close, base };
}
