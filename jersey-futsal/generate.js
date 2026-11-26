// Generator desain jersey futsal anak (4-6 th) — TK IP AI MUHAAJIR
// Jalankan:  node generate.js
// Hasil ada di folder ./output (JPG untuk dibagikan, PDF vektor + SVG untuk konveksi)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'output');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
const FONT_CSS = `
@font-face{font-family:'Anton';src:url(${font('Anton.woff2')}) format('woff2');}
@font-face{font-family:'Bebas';src:url(${font('BebasNeue.woff2')}) format('woff2');}
@font-face{font-family:'Teko';src:url(${font('Teko-Bold.woff2')}) format('woff2');font-weight:700;}
`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- Desain (palet & gaya) ----------
const DESIGNS = [
  {
    key: 'desain-1-emerald-gold',
    judul: 'DESAIN 1 — EMERALD GOLD',
    tagline: 'Hijau zamrud + emas, motif geometri islami (sublim)',
    base1: '#12875E', base2: '#065238', panel: '#043D2A', accent: '#F4B400', accent2: '#FFFFFF',
    text: '#FFFFFF', textStroke: '#F4B400', numFill: '#FFFFFF', numStroke: '#043D2A',
    neck: 'crew', pattern: 'islamic',
    chips: [['#12875E', 'Hijau Zamrud'], ['#065238', 'Hijau Tua'], ['#F4B400', 'Emas'], ['#FFFFFF', 'Putih']],
  },
  {
    key: 'desain-2-ocean-blast',
    judul: 'DESAIN 2 — OCEAN BLAST',
    tagline: 'Biru laut + oranye ceria, motif kilat & halftone (sublim)',
    base1: '#2563EB', base2: '#0B1F5C', panel: '#0A1A4A', accent: '#FF7A00', accent2: '#FFC93C',
    text: '#FFFFFF', textStroke: '#FF7A00', numFill: '#FFFFFF', numStroke: '#FF7A00',
    neck: 'v', pattern: 'blast',
    chips: [['#2563EB', 'Biru Royal'], ['#0B1F5C', 'Navy'], ['#FF7A00', 'Oranye'], ['#FFC93C', 'Kuning']],
  },
];

// ---------- Geometri kaos (viewBox 600x660) ----------
const BODY = 'M205 50 L130 75 L25 175 L80 265 L138 228 L132 630 Q300 648 468 630 L462 228 L520 265 L575 175 L470 75 L395 50 Z';
const SLEEVE_R = 'M380 56 L470 75 L575 175 L520 265 L462 228 Q430 140 380 56 Z';
const SLEEVE_L = 'M220 56 L130 75 L25 175 L80 265 L138 228 Q170 140 220 56 Z';
const CUFF_R = 'M575 175 L520 265 L503 254 L558 163 Z';
const CUFF_L = 'M25 175 L80 265 L97 254 L42 163 Z';
const NECK = {
  crew: { front: 'M205 50 Q300 118 395 50', inner: 'M205 50 Q300 118 395 50 Q300 74 205 50 Z' },
  v: { front: 'M212 50 L300 128 L388 50', inner: 'M212 50 L300 128 L388 50 Q300 74 212 50 Z' },
};
const BACK_NECK = 'M205 50 Q300 76 395 50';

function defs(d, id) {
  const islamic = `
    <pattern id="${id}-pat" width="60" height="60" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="2">
        <rect x="15" y="15" width="30" height="30"/>
        <rect x="15" y="15" width="30" height="30" transform="rotate(45 30 30)"/>
        <circle cx="30" cy="30" r="6"/>
        <path d="M0 0 L15 15 M60 0 L45 15 M0 60 L15 45 M60 60 L45 45"/>
      </g>
    </pattern>`;
  const blast = `
    <pattern id="${id}-pat" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
      <circle cx="7" cy="7" r="2.6" fill="#fff" fill-opacity=".13"/>
    </pattern>`;
  return `
  <defs>
    <linearGradient id="${id}-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${d.base1}"/><stop offset="1" stop-color="${d.base2}"/>
    </linearGradient>
    <linearGradient id="${id}-shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".32"/>
      <stop offset=".22" stop-color="#000" stop-opacity="0"/>
      <stop offset=".45" stop-color="#fff" stop-opacity=".10"/>
      <stop offset=".78" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".32"/>
    </linearGradient>
    <linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".25"/>
      <stop offset="1" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="${id}-fademask"><rect width="600" height="660" fill="url(#${id}-fade)"/></mask>
    <clipPath id="${id}-clip"><path d="${BODY}"/></clipPath>
    <filter id="${id}-shadow" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".28"/>
    </filter>
    ${d.pattern === 'islamic' ? islamic : blast}
  </defs>`;
}

// Motif sublim di badan kaos
function bodyArt(d, id) {
  if (d.pattern === 'islamic') {
    return `
      <rect width="600" height="660" fill="url(#${id}-pat)"/>
      <!-- panel samping gelap + list emas -->
      <path d="M120 228 L150 228 L150 660 L120 660 Z" fill="${d.panel}"/>
      <path d="M450 228 L480 228 L480 660 L450 660 Z" fill="${d.panel}"/>
      <path d="M150 228 L155 228 L155 660 L150 660 Z" fill="${d.accent}"/>
      <path d="M445 228 L450 228 L450 660 L445 660 Z" fill="${d.accent}"/>
      <!-- gelombang emas di bawah -->
      <path d="M100 560 Q200 520 300 555 T500 545 L500 660 L100 660 Z" fill="${d.panel}"/>
      <path d="M100 548 Q200 508 300 543 T500 533 L500 547 Q400 520 300 557 T100 562 Z" fill="${d.accent}"/>
      <path d="M100 572 Q200 535 300 568 T500 560 L500 566 Q400 545 300 576 T100 580 Z" fill="${d.accent2}" opacity=".85"/>
      <!-- chevron tipis di dada -->
      <path d="M150 205 L300 250 L450 205 L450 214 L300 259 L150 214 Z" fill="${d.accent}" opacity=".9"/>`;
  }
  return `
      <g mask="url(#${id}-fademask)"><rect width="600" height="660" fill="url(#${id}-pat)"/></g>
      <!-- kilat / speed slashes -->
      <path d="M90 600 L560 330 L560 380 L90 650 Z" fill="${d.accent}"/>
      <path d="M90 668 L560 398 L560 420 L90 690 Z" fill="${d.accent2}"/>
      <path d="M90 560 L560 290 L560 302 L90 572 Z" fill="${d.accent2}" opacity=".9"/>
      <path d="M380 660 L560 556 L560 660 Z" fill="${d.panel}" opacity=".55"/>
      <!-- bintang kecil ceria -->
      ${[[180, 470, 1], [230, 520, .7], [420, 610, .8]].map(([x, y, s]) =>
        `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -14 L4 -4 L14 -4 L6 2 L9 13 L0 6 L-9 13 L-6 2 L-14 -4 L-4 -4 Z" fill="#fff" opacity=".35"/>`).join('')}`;
}

// Logo/badge kecil di dada kiri
function badge(d, x, y) {
  return `
  <g transform="translate(${x} ${y})">
    <path d="M0 -34 L28 -24 L28 4 Q28 26 0 38 Q-28 26 -28 4 L-28 -24 Z" fill="${d.panel}" stroke="${d.accent}" stroke-width="3.5"/>
    <circle cx="0" cy="2" r="15" fill="#fff"/>
    <path d="M0 -6 L7 -1 L4.5 7 L-4.5 7 L-7 -1 Z" fill="#111"/>
    <path d="M0 -13 L0 -6 M7 -1 L14 -4 M4.5 7 L9 13 M-4.5 7 L-9 13 M-7 -1 L-14 -4" stroke="#111" stroke-width="2"/>
    <text x="0" y="-19" text-anchor="middle" font-family="Bebas" font-size="11" fill="${d.accent}" letter-spacing="1">TK</text>
  </g>`;
}

function shirt(d, id, view, player) {
  const neck = NECK[d.neck];
  const sleeveFill = d.pattern === 'islamic' ? d.panel : d.panel;
  let front = '';
  if (view === 'front') {
    front = `
      ${badge(d, 215, 150)}
      <text x="385" y="168" text-anchor="middle" font-family="Anton" font-size="44" fill="${d.numFill}" stroke="${d.numStroke}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${esc(player.nomor)}</text>
      <text x="300" y="318" text-anchor="middle" font-family="Bebas" font-size="44" letter-spacing="8" fill="${d.text}" stroke="${d.textStroke}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${esc(cfg.sekolah_baris1)}</text>
      <text x="300" y="395" text-anchor="middle" font-family="Anton" font-size="76" letter-spacing="2" textLength="${Math.min(268, cfg.sekolah_baris2.length * 34)}" lengthAdjust="spacingAndGlyphs" fill="${d.text}" stroke="${d.textStroke}" stroke-width="7" paint-order="stroke" stroke-linejoin="round">${esc(cfg.sekolah_baris2)}</text>`;
  } else {
    const nm = String(player.nama).toUpperCase();
    front = `
      <text x="300" y="178" text-anchor="middle" font-family="Bebas" font-size="58" letter-spacing="5" ${nm.length > 9 ? `textLength="290" lengthAdjust="spacingAndGlyphs"` : ''} fill="${d.text}" stroke="${d.textStroke}" stroke-width="6" paint-order="stroke" stroke-linejoin="round">${esc(nm)}</text>
      <text x="300" y="440" text-anchor="middle" font-family="Anton" font-size="235" ${String(player.nomor).length > 1 ? 'letter-spacing="-4"' : ''} fill="${d.numFill}" stroke="${d.numStroke}" stroke-width="12" paint-order="stroke" stroke-linejoin="round">${esc(player.nomor)}</text>
      ${d.pattern !== "islamic" ? "" : `<text x="300" y="520" text-anchor="middle" font-family="Bebas" font-size="22" letter-spacing="6" fill="#fff" opacity=".75">${esc(cfg.sekolah_baris1 + " " + cfg.sekolah_baris2)}</text>`}`;
  }
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 660" width="100%" height="100%">
    ${defs(d, id)}
    <g filter="url(#${id}-shadow)">
      <path d="${BODY}" fill="url(#${id}-base)"/>
      <g clip-path="url(#${id}-clip)">
        ${bodyArt(d, id)}
        <path d="${SLEEVE_R}" fill="${sleeveFill}"/><path d="${SLEEVE_L}" fill="${sleeveFill}"/>
        <path d="${CUFF_R}" fill="${d.accent}"/><path d="${CUFF_L}" fill="${d.accent}"/>
        <path d="M380 56 Q430 140 462 228" fill="none" stroke="${d.accent}" stroke-width="4"/>
        <path d="M220 56 Q170 140 138 228" fill="none" stroke="${d.accent}" stroke-width="4"/>
        ${front}
        <rect width="600" height="660" fill="url(#${id}-shade)"/>
      </g>
      ${view === 'front'
        ? `<path d="${neck.inner}" fill="${d.base2}"/><path d="${neck.inner}" fill="#000" opacity=".35"/>
           <path d="${neck.front}" fill="none" stroke="${d.panel}" stroke-width="18" stroke-linejoin="round" stroke-linecap="round"/>
           <path d="${neck.front}" fill="none" stroke="${d.accent}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`
        : `<path d="${BACK_NECK}" fill="none" stroke="${d.panel}" stroke-width="16" stroke-linecap="round"/>
           <path d="${BACK_NECK}" fill="none" stroke="${d.accent}" stroke-width="4" stroke-linecap="round"/>`}
      <path d="${BODY}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
    </g>
  </svg>`;
}

// ---------- Celana (viewBox 600x660) ----------
const SHORTS = 'M128 185 L472 185 L508 520 L318 542 L300 372 L282 542 L92 520 Z';
function shorts(d, id, player, view) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 660" width="100%" height="100%">
    ${defs(d, id)}
    <clipPath id="${id}-sclip"><path d="${SHORTS}"/></clipPath>
    <g filter="url(#${id}-shadow)">
      <path d="${SHORTS}" fill="${d.pattern === 'islamic' ? `url(#${id}-base)` : d.panel}"/>
      <g clip-path="url(#${id}-sclip)">
        ${d.pattern === 'islamic' ? `<rect width="600" height="660" fill="url(#${id}-pat)"/>` : `<rect width="600" height="660" fill="url(#${id}-pat)" opacity=".6"/>`}
        <!-- panel samping -->
        <path d="M128 185 L168 185 L134 525 L92 520 Z" fill="${d.pattern === 'islamic' ? d.panel : d.accent}"/>
        <path d="M472 185 L432 185 L466 525 L508 520 Z" fill="${d.pattern === 'islamic' ? d.panel : d.accent}"/>
        <path d="M168 185 L176 185 L142 526 L134 525 Z" fill="${d.pattern === 'islamic' ? d.accent : d.accent2}"/>
        <path d="M432 185 L424 185 L458 526 L466 525 Z" fill="${d.pattern === 'islamic' ? d.accent : d.accent2}"/>
        <!-- list bawah kaki -->
        <path d="M80 498 L300 520 L520 498 L520 560 L80 560 Z" fill="${d.accent}" opacity=".95"/>
        <path d="M80 490 L300 512 L520 490 L520 498 L300 520 L80 498 Z" fill="#fff" opacity=".9"/>
        ${view === 'front'
          ? `<text x="${d.pattern === 'islamic' ? 222 : 225}" y="${470}" text-anchor="middle" font-family="Anton" font-size="46" fill="${d.numFill}" stroke="${d.pattern === 'islamic' ? d.accent : d.accent}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${esc(player.nomor)}</text>`
          : `<text x="300" y="300" text-anchor="middle" font-family="Bebas" font-size="26" letter-spacing="5" fill="#fff" opacity=".8">${esc(cfg.sekolah_baris2)}</text>`}
        <rect width="600" height="660" fill="url(#${id}-shade)"/>
      </g>
      <!-- pinggang karet -->
      <path d="M130 150 L470 150 L473 188 L127 188 Z" fill="${d.panel}"/>
      <path d="M128 180 L472 180 L473 188 L127 188 Z" fill="${d.accent}"/>
      ${view === 'front' ? `<path d="M292 186 Q285 215 278 232 M308 186 Q315 215 322 232" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>` : ''}
      <path d="M300 188 L300 372" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
      <path d="${SHORTS}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
      <path d="M130 150 L470 150 L473 188 L127 188 Z" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
    </g>
  </svg>`;
}

// ---------- Lembar presentasi ----------
function sheet(d, player) {
  const card = (label, svg) => `<div class="card"><div class="art">${svg}</div><div class="lbl">${label}</div></div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  ${FONT_CSS}
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1600px;height:1000px;font-family:'Bebas',sans-serif;background:
    radial-gradient(circle at 50% 40%, #ffffff 0%, #eef1f4 60%, #dfe4ea 100%);color:#16202b;overflow:hidden}
  header{height:120px;display:flex;align-items:center;justify-content:space-between;padding:0 56px;
    background:${d.panel};color:#fff;border-bottom:8px solid ${d.accent}}
  header h1{font-family:'Anton';font-size:46px;letter-spacing:2px;font-weight:400}
  header h1 span{color:${d.accent}}
  header .r{text-align:right;font-size:26px;letter-spacing:2px;line-height:1.2}
  header .r b{display:block;font-family:'Anton';font-weight:400;font-size:30px;color:${d.accent}}
  .row{display:flex;justify-content:center;gap:10px;padding:26px 30px 0}
  .card{width:500px;text-align:center}
  .art{height:600px}
  .lbl{font-size:30px;letter-spacing:4px;margin-top:2px;color:#2b3846}
  .shorts{display:flex;flex-direction:column;width:500px}
  .shorts .art{height:300px}
  .shorts .lbl{font-size:26px;margin:-8px 0 2px}
  footer{position:absolute;bottom:0;left:0;right:0;height:150px;display:flex;align-items:center;justify-content:space-between;
    padding:0 56px;border-top:3px solid #cfd6de;background:#fff}
  .chips{display:flex;gap:18px}
  .chip{display:flex;align-items:center;gap:10px;font-size:22px;letter-spacing:1px}
  .chip i{width:42px;height:42px;border-radius:10px;border:2px solid #0002;display:block}
  .notes{font-size:23px;letter-spacing:1px;line-height:1.35;text-align:right;color:#394756}
  .notes b{color:${d.base2}}
  </style></head><body>
  <header><h1>JERSEY FUTSAL <span>${esc(cfg.sekolah_baris1)} ${esc(cfg.sekolah_baris2)}</span></h1>
    <div class="r"><b>${esc(d.judul)}</b>${esc(d.tagline)}</div></header>
  <div class="row">
    ${card('TAMPAK DEPAN', shirt(d, d.key + '-f', 'front', player))}
    ${card('TAMPAK BELAKANG', shirt(d, d.key + '-b', 'back', player))}
    <div class="shorts">
      <div class="card"><div class="art">${shorts(d, d.key + '-sf', player, 'front')}</div><div class="lbl">CELANA — DEPAN</div></div>
      <div class="card"><div class="art">${shorts(d, d.key + '-sb', player, 'back')}</div><div class="lbl">CELANA — BELAKANG</div></div>
    </div>
  </div>
  <footer>
    <div class="chips">${d.chips.map(([c, n]) => `<div class="chip"><i style="background:${c}"></i>${n}<br>${c}</div>`).join('')}</div>
    <div class="notes">Ukuran anak <b>4–6 tahun</b> · Bahan <b>dryfit / milano</b> · Full printing <b>sublimasi</b><br>
      Nama &amp; nomor punggung <b>bisa diganti</b> per anak · Font: Anton &amp; Bebas Neue</div>
  </footer>
  </body></html>`;
}

// Hanya tampak belakang (untuk daftar nama & nomor per anak)
function backOnly(d, player) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FONT_CSS}
  *{margin:0}body{width:800px;height:900px;background:#fff;font-family:'Bebas'}
  .a{height:800px;padding:20px}.l{text-align:center;font-size:34px;letter-spacing:3px;color:#223}</style></head><body>
  <div class="a">${shirt(d, 'p', 'back', player)}</div>
  <div class="l">${esc(player.nama)} · NO ${esc(player.nomor)} · ${esc(d.judul)}</div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  for (const d of DESIGNS) {
    await page.setContent(sheet(d, cfg.contoh_pemain), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, `${d.key}.jpg`), type: 'jpeg', quality: 95 });
    await page.pdf({ path: path.join(OUT, `${d.key}.pdf`), width: '1600px', height: '1000px', printBackground: true });
    // SVG terpisah (vektor) untuk diedit di CorelDraw/Illustrator
    const svgHead = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    const withFont = (s) => s.replace('<defs>', `<defs><style>${FONT_CSS}</style>`);
    fs.writeFileSync(path.join(OUT, `${d.key}_baju-depan.svg`), svgHead + withFont(shirt(d, 'f', 'front', cfg.contoh_pemain)));
    fs.writeFileSync(path.join(OUT, `${d.key}_baju-belakang.svg`), svgHead + withFont(shirt(d, 'b', 'back', cfg.contoh_pemain)));
    fs.writeFileSync(path.join(OUT, `${d.key}_celana-depan.svg`), svgHead + withFont(shorts(d, 's', cfg.contoh_pemain, 'front')));
    console.log('OK', d.key);
  }
  // Per pemain (opsional)
  if (cfg.pemain && cfg.pemain.length) {
    const pp = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 2 });
    const dir = path.join(OUT, 'per-pemain');
    fs.mkdirSync(dir, { recursive: true });
    for (const d of DESIGNS) for (const p of cfg.pemain) {
      await pp.setContent(backOnly(d, p), { waitUntil: 'load' });
      await pp.evaluate(() => document.fonts.ready);
      const safe = `${p.nomor}-${p.nama}`.replace(/[^\w-]+/g, '_');
      await pp.screenshot({ path: path.join(dir, `${d.key}_${safe}.jpg`), type: 'jpeg', quality: 92 });
    }
    console.log('OK per-pemain:', cfg.pemain.length, 'anak x', DESIGNS.length, 'desain');
  }
  await browser.close();
})();
