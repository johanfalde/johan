#!/usr/bin/env node
// Pipeline video otomatis: bank konten (CSV / Google Sheets) → naskah (opsional Gemini) → render KanvasCut
// → MP4 1080x1920 + caption → (opsional) kirim ke Telegram untuk dicek lalu diposting.
//
//   node pipeline.mjs                    # baris dengan tanggal hari ini (WIB)
//   node pipeline.mjs --tanggal 2026-11-15
//   node pipeline.mjs --baris 1          # baris ke-1 (setelah header)
//   node pipeline.mjs --semua
//
// Variabel lingkungan (semua opsional):
//   SHEET_CSV_URL       link CSV Google Sheets (File → Bagikan → Publikasikan ke web → CSV)
//   GEMINI_API_KEY      isi kolom naskah yang kosong dari kolom "ide" (tier gratis Gemini)
//   GEMINI_MODEL        default gemini-flash-latest
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID   kirim video + caption ke Telegram
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { openRenderer, ROOT } from './render.mjs';

export const HERE = join(ROOT, 'automation');
const OUT = join(HERE, 'output');
const CACHE = join(HERE, '.cache');
const DEFAULT_MUSIC = 'examples/assets/musik-bisnis.mp3';

// ---------- argumen ----------
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? (args[i + 1] ?? true) : null; };
export const todayWIB = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

// ---------- CSV ----------
export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  const [head, ...body] = rows;
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

export async function loadRows() {
  const url = process.env.SHEET_CSV_URL;
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gagal mengambil Google Sheets (${res.status})`);
    console.log('Bank konten: Google Sheets');
    return parseCSV(await res.text());
  }
  console.log('Bank konten: automation/konten.csv');
  return parseCSV(await readFile(join(HERE, 'konten.csv'), 'utf8'));
}

// ---------- media: URL diunduh dulu supaya bisa dibuka editor ----------
async function localMedia(p) {
  if (!p) return null;
  if (!/^https?:\/\//.test(p)) {
    const rel = p.replace(/^\.?\//, '');
    for (const cand of [rel, `automation/${rel}`]) if (existsSync(join(ROOT, cand))) return cand;
    throw new Error(`File tidak ditemukan: ${p}`);
  }
  await mkdir(CACHE, { recursive: true });
  const name = createHash('sha1').update(p).digest('hex').slice(0, 12) + (extname(new URL(p).pathname) || '.bin');
  const dst = join(CACHE, name);
  if (!existsSync(dst)) {
    const res = await fetch(p);
    if (!res.ok) throw new Error(`Gagal mengunduh ${p} (${res.status})`);
    await writeFile(dst, Buffer.from(await res.arrayBuffer()));
  }
  return `automation/.cache/${name}`;
}

// ---------- Gemini (opsional, tier gratis) ----------
const NASKAH = ['hook', 'masalah_judul', 'masalah', 'bukti', 'manfaat', 'promo', 'cta', 'caption', 'hashtag', 'prompt_ai'];

export async function isiNaskahGemini(row) {
  const key = process.env.GEMINI_API_KEY;
  const kosong = NASKAH.filter((k) => !row[k]);
  if (!key || !kosong.length || !(row.ide || row.produk)) return row;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const prompt = `Kamu copywriter video TikTok affiliate berbahasa Indonesia santai.
Produk: ${row.produk || '-'}
Ide/keterangan: ${row.ide || '-'}
Isi kolom berikut untuk video 18 detik (hook → masalah → produk → manfaat → ajakan cek keranjang kuning).
Batas: hook ≤ 6 kata, masalah_judul ≤ 4 kata, masalah & bukti ≤ 14 kata, manfaat = 4 poin pendek dipisah " | ",
promo ≤ 3 kata, cta ≤ 4 kata, caption ≤ 25 kata, hashtag 5 buah. Jangan membuat klaim kesehatan/medis
atau angka yang tidak ada di keterangan.
prompt_ai = 2 prompt video dalam BAHASA INGGRIS dipisah " | " untuk latar adegan hook dan masalah: video HP realistis
(subjek, gerakan, suasana, kamera), JANGAN menampilkan produk, merek, logo, atau tulisan. Jawab JSON dengan kunci: ${NASKAH.join(', ')}.`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
    }),
  });
  if (!res.ok) {
    console.log(`  ⚠️  Gemini gagal (${res.status}), kolom kosong dibiarkan.`);
    return row;
  }
  try {
    const data = await res.json();
    const out = JSON.parse(data.candidates[0].content.parts.map((p) => p.text).join(''));
    for (const k of kosong) if (out[k]) row[k] = String(out[k]);
    console.log(`  ✍️  Gemini mengisi: ${kosong.join(', ')}`);
  } catch (e) {
    console.log(`  ⚠️  Jawaban Gemini tidak terbaca: ${e.message}`);
  }
  return row;
}

// ---------- Telegram (opsional) ----------
async function kirimTelegram(file, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  const form = new FormData();
  form.append('chat_id', chat);
  form.append('caption', caption.slice(0, 1024));
  form.append('supports_streaming', 'true');
  form.append('video', new Blob([await readFile(file)], { type: 'video/mp4' }), file.split('/').pop());
  const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, { method: 'POST', body: form });
  if (!res.ok) console.log(`  ⚠️  Telegram gagal (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.ok;
}

export async function latarUntuk(row, nomor) {
  const manual = String(row.latar || '').split('|').map((x) => x.trim());
  const out = [];
  for (let i = 0; i < 5; i++) {
    if (manual[i]) { out.push(await localMedia(manual[i])); continue; }
    const klip = join(KLIP_KAGGLE, `${namaKlip(row, nomor, i)}.mp4`);
    if (existsSync(klip)) {
      out.push(`automation/.cache/kaggle/wan_output/${namaKlip(row, nomor, i)}.mp4`);
      row.pakai_ai = 'ya';
      console.log(`  🎞️  latar adegan ${i + 1}: klip Wan dari Kaggle`);
    } else out.push(null);
  }
  return out;
}

export const slug = (s) => String(s || 'video').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function teksCaption(row) {
  const ai = /^(ya|yes|y|true|1)$/i.test(row.pakai_ai || '');
  return [
    row.caption,
    row.hashtag,
    '',
    '— Sebelum posting —',
    '• Pasang produk di keranjang kuning',
    ai ? '• Aktifkan label "AI-generated content" (video ini memakai klip AI)' : null,
    '• Cek produk tampil akurat',
  ].filter((x) => x !== null).join('\n');
}

// ---------- pilih baris (dipakai pipeline dan kaggle_wan) ----------
export async function pilihBaris() {
  const rows = await loadRows();
  let pilih;
  if (arg('semua')) pilih = rows.map((r, i) => [r, i + 1]);
  else if (arg('baris')) pilih = [[rows[Number(arg('baris')) - 1], Number(arg('baris'))]].filter(([r]) => r);
  else {
    const tgl = arg('tanggal') || todayWIB();
    pilih = rows.map((r, i) => [r, i + 1]).filter(([r]) => r.tanggal === tgl);
    console.log(`Tanggal ${tgl}: ${pilih.length} konten`);
  }
  return pilih.filter(([r]) => !/^(selesai|done|skip|lewati)$/i.test(r.status || ''));
}

export const namaKlip = (row, nomor, i) => `${row.tanggal || todayWIB()}_${String(nomor).padStart(2, '0')}_s${i}`;
export const KLIP_KAGGLE = join(HERE, '.cache', 'kaggle', 'wan_output');

// ---------- main ----------
async function main() {
  const pilih = await pilihBaris();
  if (!pilih.length) { console.log('Tidak ada konten untuk dibuat.'); return; }

  await mkdir(OUT, { recursive: true });
  const renderer = await openRenderer();
  const hasil = [];
  try {
    for (const [row0, nomor] of pilih) {
      const row = await isiNaskahGemini({ ...row0 });
      console.log(`\n🎬 [baris ${nomor}] ${row.produk}`);
      if (!row.hook || !row.produk) { console.log('  ⏭️  Kolom produk/hook kosong, dilewati.'); continue; }
      try {
        const job = {
          row,
          media: await localMedia(row.foto_produk),
          latar: await latarUntuk(row, nomor),
          music: row.musik ? await localMedia(row.musik) : DEFAULT_MUSIC,
        };
        const nama = `${row.tanggal || todayWIB()}_${String(nomor).padStart(2, '0')}_${slug(row.produk)}`;
        const t0 = Date.now();
        const r = await renderer.render(job, join(OUT, `${nama}.mp4`));
        const caption = teksCaption(row);
        await writeFile(join(OUT, `${nama}.txt`), caption);
        console.log(`  ✅ output/${nama}.mp4 (${((Date.now() - t0) / 1000).toFixed(0)} dtk render)`);
        if (await kirimTelegram(r.file, caption)) console.log('  📱 terkirim ke Telegram');
        hasil.push(r.file);
      } catch (e) {
        console.log(`  ❌ gagal: ${e.message}`);
      }
    }
  } finally {
    await renderer.close();
  }
  console.log(`\nSelesai: ${hasil.length}/${pilih.length} video di automation/output/`);
  if (hasil.length < pilih.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
