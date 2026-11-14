#!/usr/bin/env node
// Klip AI gratis otomatis: kirim prompt hari ini ke Kaggle (Wan 2.2, GPU T4), lalu ambil hasilnya.
//
//   node kaggle_wan.mjs kirim     # buat skrip dari notebook + prompt, push & jalankan di Kaggle
//   node kaggle_wan.mjs status
//   node kaggle_wan.mjs ambil     # unduh klip ke automation/.cache/kaggle/ (kalau sudah selesai)
//
// Butuh: CLI `kaggle` (pip install kaggle), KAGGLE_API_TOKEN, KAGGLE_USERNAME.
// Akun Kaggle harus sudah verifikasi nomor HP (supaya GPU + internet bisa dipakai).
// Opsional: WAN_PRESET (default "natural"), KAGGLE_SLUG (default "kanvascut-wan-harian").
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './render.mjs';
import { HERE, pilihBaris, isiNaskahGemini, namaKlip } from './pipeline.mjs';

const USER = process.env.KAGGLE_USERNAME;
const SLUG = process.env.KAGGLE_SLUG || 'kanvascut-wan-harian';
const PRESET = process.env.WAN_PRESET || 'natural';
const JOB_DIR = join(HERE, '.cache', 'kaggle_job');
const OUT_DIR = join(HERE, '.cache', 'kaggle');

function kaggle(...a) {
  const r = spawnSync('kaggle', a, { encoding: 'utf8' });
  if (r.error) throw new Error('CLI kaggle tidak ditemukan. Jalankan: pip install kaggle');
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

/** Ambil sel kode dari notebook supaya Kaggle memakai kode yang sama persis dengan notebook manual. */
async function kodeNotebook() {
  const nb = JSON.parse(await readFile(join(ROOT, 'kaggle', 'wan22_video_gratis.ipynb'), 'utf8'));
  const codes = nb.cells.filter((c) => c.cell_type === 'code').map((c) => c.source.join(''));
  const cari = (penanda) => {
    const c = codes.find((x) => x.includes(penanda));
    if (!c) throw new Error(`Sel notebook dengan "${penanda}" tidak ditemukan`);
    return c;
  };
  return [cari('os.environ["HF_HOME"]'), cari('class WanStudio'), cari('def muat_worker')].join('\n\n');
}

async function kirim() {
  if (!USER) throw new Error('KAGGLE_USERNAME belum diisi');
  const jobs = [];
  for (const [row0, nomor] of await pilihBaris()) {
    const row = await isiNaskahGemini({ ...row0 });
    const prompts = String(row.prompt_ai || '').split('|').map((s) => s.trim()).filter(Boolean);
    const manual = String(row.latar || '').split('|').map((s) => s.trim());
    prompts.forEach((prompt, i) => {
      if (manual[i]) return;  // adegan ini sudah punya latar sendiri
      jobs.push({ prompt, name: namaKlip(row, nomor, i), seed: 1000 + nomor * 10 + i });
    });
  }
  if (!jobs.length) {
    console.log('Tidak ada prompt_ai untuk hari ini, Kaggle tidak dijalankan.');
    return;
  }
  console.log(`${jobs.length} klip akan dibuat di Kaggle (preset ${PRESET}):`);
  for (const j of jobs) console.log(`  ${j.name}: ${j.prompt.slice(0, 80)}`);

  const ekor = `
# ---------- dijalankan otomatis oleh automation/kaggle_wan.mjs ----------
import json, shutil
JOBS = json.loads(${JSON.stringify(JSON.stringify(jobs))})
studio.encode_semua(JOBS)
if n_gpu >= 2:
    studio.text_encoder_to_cpu()
    studio.tambah_worker(muat_worker("cuda:1"))
files = studio.batch(JOBS, preset=${JSON.stringify(PRESET)})
shutil.rmtree("/kaggle/working/wan_output/mentah", ignore_errors=True)   # cukup unduh versi final
json.dump({"files": [f.name for f in files], "jobs": JOBS},
          open("/kaggle/working/wan_output/manifest.json", "w"), ensure_ascii=False, indent=1)
print("SELESAI", len(files), "klip")
`;
  const pip = 'import subprocess, sys\nsubprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "diffusers", "transformers", "accelerate", "ftfy", "imageio", "imageio-ffmpeg"], check=True)\n\n';
  await rm(JOB_DIR, { recursive: true, force: true });
  await mkdir(JOB_DIR, { recursive: true });
  await writeFile(join(JOB_DIR, 'wan_harian.py'), pip + (await kodeNotebook()) + '\n' + ekor);
  await writeFile(join(JOB_DIR, 'kernel-metadata.json'), JSON.stringify({
    id: `${USER}/${SLUG}`,
    title: SLUG,
    code_file: 'wan_harian.py',
    language: 'python',
    kernel_type: 'script',
    is_private: true,
    enable_gpu: true,
    enable_internet: true,
    machine_shape: 'NvidiaTeslaT4',
    dataset_sources: [], competition_sources: [], kernel_sources: [], model_sources: [],
  }, null, 2));
  const r = kaggle('kernels', 'push', '-p', JOB_DIR);
  console.log(r.out);
  if (!r.ok) throw new Error('Gagal push ke Kaggle');
}

function status() {
  if (!USER) throw new Error('KAGGLE_USERNAME belum diisi');
  const r = kaggle('kernels', 'status', `${USER}/${SLUG}`);
  const s = (r.out.match(/(COMPLETE|ERROR|RUNNING|QUEUED|CANCEL\w*|NEW_SCRIPT)/i)?.[1] || 'TIDAK_DIKENAL').toUpperCase();
  return { status: s, raw: r.out };
}

async function ambil() {
  const { status: s, raw } = status();
  console.log(`Status Kaggle: ${s}`);
  if (s !== 'COMPLETE') {
    console.log(s === 'ERROR' ? `Kaggle gagal. Buka notebook "${SLUG}" di Kaggle untuk melihat log.\n${raw}`
      : 'Belum selesai. Video hari ini dirender dengan latar gradien (tanpa klip AI).');
    return false;
  }
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const r = kaggle('kernels', 'output', `${USER}/${SLUG}`, '-p', OUT_DIR, '-o');
  console.log(r.out.split('\n').slice(-5).join('\n'));
  // Kumpulkan semua .mp4 ke satu folder, apa pun struktur folder unduhan Kaggle.
  const tujuan = join(OUT_DIR, 'wan_output');
  await mkdir(tujuan, { recursive: true });
  let n = 0;
  for (const f of await readdir(OUT_DIR, { recursive: true })) {
    if (!f.endsWith('.mp4') || f.includes('mentah')) continue;
    const dst = join(tujuan, f.split('/').pop());
    if (join(OUT_DIR, f) !== dst) await rename(join(OUT_DIR, f), dst);
    n++;
  }
  console.log(`${n} klip siap dipakai di automation/.cache/kaggle/wan_output/`);
  return r.ok && n > 0;
}

const cmd = process.argv[2];
try {
  if (cmd === 'kirim') await kirim();
  else if (cmd === 'status') console.log(status());
  else if (cmd === 'ambil') await ambil();
  else console.log('Pakai: node kaggle_wan.mjs kirim | status | ambil');
} catch (e) {
  console.error(`❌ ${e.message}`);
  process.exitCode = 1;
}
