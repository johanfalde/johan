// Generator desain jersey futsal anak (4-6 th) — v2 "Kit Launch"
// Jalankan:  node generate.js     → hasil di ./output
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const LOGO = require('./logo');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'output');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
const FONT_CSS = `
@font-face{font-family:'Anton';src:url(${font('Anton.woff2')}) format('woff2');}
@font-face{font-family:'Bebas';src:url(${font('BebasNeue.woff2')}) format('woff2');}
@font-face{font-family:'Fredoka';src:url(${font('Fredoka-Bold.woff2')}) format('woff2');font-weight:700;}
@font-face{font-family:'Cinzel';src:url(${font('Cinzel-ExtraBold.woff2')}) format('woff2');font-weight:800;}
@font-face{font-family:'Teko';src:url(${font('Teko-Bold.woff2')}) format('woff2');font-weight:700;}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SCHOOL = `${cfg.sekolah_baris1} ${cfg.sekolah_baris2}`;

// ======================= PALET DESAIN =======================
const DESIGNS = [
  {
    key: 'desain-1-emerald-royale', no: 'DESAIN 01', nama: 'EMERALD ROYALE', jenis: 'HOME KIT',
    tagline: 'Hijau zamrud · motif geometri islami tonal · sapuan emas asimetris',
    c1: '#14936A', c2: '#0A6646', c3: '#04331F', accent: '#F2B705', accentHi: '#FFE27A', accentLo: '#B37F00',
    line2: '#FFFFFF', text: '#FFFFFF', outline: '#04331F', neck: 'crew', art: 'royale',
    bg1: '#06301F', bg2: '#010D08',
    chips: [['#14936A', 'Hijau Zamrud'], ['#04331F', 'Hijau Gelap'], ['#F2B705', 'Emas'], ['#FFFFFF', 'Putih']],
  },
  {
    key: 'desain-2-electric-ocean', no: 'DESAIN 02', nama: 'ELECTRIC OCEAN', jenis: 'AWAY KIT',
    tagline: 'Biru elektrik · pecahan geometris & halftone · aksen kilat oranye',
    c1: '#2F6BFF', c2: '#1236B8', c3: '#07134A', accent: '#FF6A00', accentHi: '#FFB35C', accentLo: '#C24A00',
    line2: '#FFD23F', text: '#FFFFFF', outline: '#07134A', neck: 'v', art: 'electric',
    bg1: '#0A1B5C', bg2: '#020617',
    chips: [['#2F6BFF', 'Biru Elektrik'], ['#07134A', 'Navy'], ['#FF6A00', 'Oranye'], ['#FFD23F', 'Kuning']],
  },
  {
    key: 'desain-3-golden-crescent', no: 'DESAIN 03', nama: 'GOLDEN CRESCENT', jenis: 'PREMIUM KIT',
    tagline: 'Putih mutiara · arabesque tonal · busur bulan sabit emas & navy',
    c1: '#FFFFFF', c2: '#F1F4F9', b3: '#D9E0EB', c3: '#0E1B3D', accent: '#D4A017', accentHi: '#F7DC7A', accentLo: '#9C7410',
    line2: '#FFFFFF', text: '#0E1B3D', outline: '#FFFFFF', neck: 'crew', art: 'crescent', ink: '#0E1B3D',
    bg1: '#1B2A55', bg2: '#050A1C',
    chips: [['#F4F6FA', 'Putih Mutiara'], ['#0E1B3D', 'Navy'], ['#D4A017', 'Emas'], ['#C9D1DE', 'Abu Perak']],
  },
];

// ======================= GEOMETRI KAOS (600x660) =======================
const BODY = 'M205 46 C176 56 150 64 126 74 L30 168 Q22 178 28 188 L76 262 Q84 272 96 266 L140 236 L136 616 Q300 642 464 616 L460 236 L504 266 Q516 272 524 262 L572 188 Q578 178 570 168 L474 74 C450 64 424 56 395 46 Z';
const SLEEVE = 'M382 52 L620 40 L620 320 L460 236 Q428 150 382 52 Z';
const RAGLAN = 'M382 52 Q428 150 460 236';
const CUFF = 'M590 160 L512 280 L495 269 L573 149 Z';
const CUFF2 = 'M569 146 L491 266 L486 263 L564 143 Z';
const MIRROR = 'matrix(-1 0 0 1 600 0)';
const NECK = {
  crew: { edge: 'M205 46 Q300 122 395 46', inner: 'M205 46 Q300 122 395 46 Q300 70 205 46 Z' },
  v: { edge: 'M214 46 L300 134 L386 46', inner: 'M214 46 L300 134 L386 46 Q300 70 214 46 Z' },
};
const BACK_NECK = 'M205 46 Q300 74 395 46';
const HEM_STITCH = 'M138 600 Q300 626 462 600';

function commonDefs(d, id) {
  return `
    <linearGradient id="${id}-base" x1="0" y1="0" x2=".35" y2="1">
      <stop offset="0" stop-color="${d.c1}"/><stop offset=".55" stop-color="${d.c2}"/><stop offset="1" stop-color="${d.b3 || d.c3}"/>
    </linearGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${d.accentHi}"/><stop offset=".45" stop-color="${d.accent}"/><stop offset="1" stop-color="${d.accentLo}"/>
    </linearGradient>
    <linearGradient id="${id}-shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".2" stop-color="#000" stop-opacity=".05"/>
      <stop offset=".42" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#fff" stop-opacity=".02"/>
      <stop offset=".82" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="${id}-vshade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient>
    <pattern id="${id}-mesh" width="5" height="5" patternUnits="userSpaceOnUse">
      <circle cx="2.5" cy="2.5" r=".9" fill="#000" fill-opacity=".13"/>
    </pattern>
    <filter id="${id}-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="${id}-shadow" x="-15%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000" flood-opacity=".55"/>
    </filter>
    <filter id="${id}-tshadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".45"/>
    </filter>
    ${d.art !== 'electric' ? `
    <pattern id="${id}-pat" width="56" height="56" patternUnits="userSpaceOnUse">
      <g fill="${d.ink || '#fff'}" fill-opacity=".055" stroke="${d.ink || '#fff'}" stroke-opacity=".09" stroke-width="1.4">
        <polygon points="28,8 34,22 48,28 34,34 28,48 22,34 8,28 22,22"/>
      </g>
      <g fill="none" stroke="${d.ink || '#fff'}" stroke-opacity=".09" stroke-width="1.4">
        <rect x="16" y="16" width="24" height="24" transform="rotate(45 28 28)"/>
        <path d="M0 0 L8 8 M56 0 L48 8 M0 56 L8 48 M56 56 L48 48"/>
        <circle cx="28" cy="28" r="4"/>
      </g>
    </pattern>` : `
    <pattern id="${id}-pat" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <circle cx="6" cy="6" r="2.4" fill="#fff" fill-opacity=".16"/>
    </pattern>
    <linearGradient id="${id}-fade" x1="0" y1="0" x2="1" y2="1">
      <stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="${id}-fm"><rect width="600" height="660" fill="url(#${id}-fade)"/></mask>`}
    <pattern id="${id}-kawung" width="24" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-42)">
      <g fill="${d.art === 'crescent' ? '#FFFFFF' : d.accent}" stroke="${d.art === 'crescent' ? '#FFFFFF' : d.accent}">
        <rect x="0" y="1.2" width="24" height="2.6" stroke="none" fill-opacity=".55"/>
        <rect x="0" y="6" width="24" height=".9" stroke="none" fill-opacity=".45"/>
        <circle cx="2" cy="10" r=".95" stroke="none" fill-opacity=".6"/><circle cx="8" cy="10" r=".95" stroke="none" fill-opacity=".6"/>
        <circle cx="14" cy="10" r=".95" stroke="none" fill-opacity=".6"/><circle cx="20" cy="10" r=".95" stroke="none" fill-opacity=".6"/>
        <path d="M6 12.6 L8.4 14.4 L6 16.2 L3.6 14.4 Z M18 12.6 L20.4 14.4 L18 16.2 L15.6 14.4 Z" stroke="none" fill-opacity=".5"/>
      </g>
    </pattern>
    <linearGradient id="${id}-sfade" gradientUnits="userSpaceOnUse" x1="430" y1="70" x2="560" y2="235">
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/>
    </linearGradient>
    <mask id="${id}-smask" maskUnits="userSpaceOnUse" x="0" y="0" width="660" height="400"><rect x="0" y="0" width="660" height="400" fill="url(#${id}-sfade)"/></mask>
    <clipPath id="${id}-clip"><path d="${BODY}"/></clipPath>`;
}

// ---------- motif badan ----------
function artBody(d, id, view) {
  const o = view === 'front' ? 0 : 100; // geser motif bawah sedikit di tampak belakang
  if (d.art === 'royale') {
    return `
      <rect width="600" height="660" fill="url(#${id}-pat)"/>
      <path class="ko" d="M120 236 L162 236 Q150 420 156 660 L110 660 Z" fill="${d.c3}" opacity=".9"/>
      <path class="ko" d="M480 236 L438 236 Q450 420 444 660 L490 660 Z" fill="${d.c3}" opacity=".9"/>
      <path class="ko" d="M162 236 L168 236 Q156 420 162 660 L156 660 Q150 420 162 236 Z" fill="url(#${id}-gold)"/>
      <path class="ko" d="M438 236 L432 236 Q444 420 438 660 L444 660 Q450 420 438 236 Z" fill="url(#${id}-gold)"/>
      <g transform="translate(0 ${o})">
        <path class="ko" d="M90 470 C220 430 360 560 620 430 L620 470 C360 600 230 470 90 505 Z" fill="url(#${id}-gold)"/>
        <path class="ko" d="M90 520 C230 485 360 615 620 490 L620 498 C360 625 230 495 90 530 Z" fill="${d.line2}" opacity=".9"/>
        <path class="ko" d="M90 540 C230 505 360 640 620 515 L620 760 L90 760 Z" fill="${d.c3}" opacity=".85"/>
        <path class="ko" d="M90 540 C230 505 360 640 620 515 L620 760 L90 760 Z" fill="url(#${id}-pat)"/>
      </g>`;
  }
  if (d.art === 'crescent') {
    return `
      <rect width="600" height="660" fill="url(#${id}-pat)"/>
      <path class="ko" d="M120 236 L162 236 Q150 420 156 660 L110 660 Z" fill="${d.c3}"/>
      <path class="ko" d="M480 236 L438 236 Q450 420 444 660 L490 660 Z" fill="${d.c3}"/>
      <path class="ko" d="M162 236 L168 236 Q156 420 162 660 L156 660 Q150 420 162 236 Z" fill="url(#${id}-gold)"/>
      <path class="ko" d="M438 236 L432 236 Q444 420 438 660 L444 660 Q450 420 438 236 Z" fill="url(#${id}-gold)"/>
      <g transform="translate(0 ${o})">
        <circle class="ko" cx="560" cy="720" r="290" fill="${d.c3}" opacity=".07"/>
        <circle class="ko" cx="560" cy="720" r="335" fill="none" stroke="${d.c3}" stroke-width="34"/>
        <circle class="ko" cx="560" cy="720" r="335" fill="none" stroke="url(#${id}-pat)" stroke-width="34"/>
        <circle class="ko" cx="560" cy="720" r="305" fill="none" stroke="url(#${id}-gold)" stroke-width="13"/>
        <circle class="ko" cx="560" cy="720" r="290" fill="none" stroke="${d.c3}" stroke-width="3"/>
        <circle class="ko" cx="560" cy="720" r="372" fill="none" stroke="url(#${id}-gold)" stroke-width="3.5"/>
      </g>`;
  }
  return `
      <g fill="#fff">
        <polygon points="100,40 330,40 180,330" opacity=".06"/>
        <polygon points="330,40 520,40 520,200 260,180" opacity=".035"/>
        <polygon points="180,330 520,200 520,420" opacity=".05"/>
        <polygon points="80,420 300,330 140,660 80,660" opacity=".04"/>
      </g>
      <g mask="url(#${id}-fm)"><rect width="600" height="660" fill="url(#${id}-pat)"/></g>
      <g transform="translate(0 ${o})">
        <path class="ko" d="M620 360 L380 470 L430 482 L80 640 L80 600 L330 490 L280 478 L620 322 Z" fill="url(#${id}-gold)"/>
        <path class="ko" d="M620 300 L300 455 L620 310 Z" fill="${d.line2}"/>
        <path class="ko" d="M80 660 L470 500 L620 440 L620 760 L80 760 Z" fill="${d.c3}" opacity=".75"/>
        <path class="ko" d="M80 662 L470 502 L620 442" stroke="${d.line2}" stroke-width="4" fill="none"/>
      </g>`;
}

// ---------- logo perisai TK Islam Plus Al Muhaajir ----------
function crest(d, id, x, y, s = 1) {
  return `
  <g class="chk" transform="translate(${x} ${y}) scale(${s})" filter="url(#${id}-tshadow)">${LOGO.crestShield(id, d.c3, `url(#${id}-gold)`)}</g>`;
}

// ---------- detail lengan: bintang segi-8 islami (Rub el Hizb) transparan / tonal ----------
function rubElHizb(d, id, x, y, rot) {
  const c = d.art === 'crescent' ? '#FFFFFF' : `url(#${id}-gold)`;
  return `
    <g class="chk" transform="translate(${x} ${y}) rotate(${rot}) scale(.78)" opacity=".34">
      <rect x="-19" y="-19" width="38" height="38" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="2.2"/>
      <rect x="-19" y="-19" width="38" height="38" transform="rotate(45)" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="2.2"/>
      <circle r="9" fill="none" stroke="${c}" stroke-width="2.2"/>
      <circle r="3" fill="${c}"/>
    </g>`;
}
function sleeveBadges(d, id) {
  return rubElHizb(d, id, 486, 170, -57 + 22.5) + rubElHizb(d, id, 114, 170, 57 - 22.5);
}

// Harimau realistis transparan di tengah depan baju (foto domain publik / gambar milik sendiri, lihat assets/)
const TIGER_PNG = (() => {
  require('child_process').execFileSync('python3', ['-I', path.join(ROOT, 'prep_tiger.py'), ROOT]);
  return 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets', 'tiger-head.png')).toString('base64');
})();
function tigerMark(d) {
  const white = d.art === 'crescent';
  return `<image href="${TIGER_PNG}" x="125" y="262" width="350" height="350" preserveAspectRatio="xMidYMid meet"
    style="mix-blend-mode:${white ? 'multiply' : 'luminosity'}" opacity="${white ? .3 : .5}"/>`;
}

function shirt(d, id, view, player) {
  const neck = NECK[d.neck];
  const nm = String(player.nama).toUpperCase();
  let deco;
  if (view === 'front') {
    deco = `
      ${crest(d, id, 228, 164, 0.94)}
      <text class="chk" x="374" y="186" text-anchor="middle" font-family="Anton" font-size="48" fill="${d.text}" stroke="${d.art === 'crescent' ? d.accent : d.outline}" stroke-width="6" paint-order="stroke" stroke-linejoin="round" filter="url(#${id}-tshadow)">${esc(player.nomor)}</text>
      <g filter="url(#${id}-tshadow)">
        <text class="chk" data-fit="236" x="300" y="286" text-anchor="middle" font-family="Bebas" font-size="40" letter-spacing="7" fill="${d.art === 'crescent' ? d.c3 : `url(#${id}-gold)`}" ${d.art === 'crescent' ? '' : `stroke="${d.c3}" stroke-width="3" paint-order="stroke"`}>${esc(cfg.sekolah_baris1)}</text>
        <text class="chk" data-fit="246" x="300" y="360" text-anchor="middle" font-family="Anton" font-size="78" letter-spacing="1" fill="${d.text}" stroke="${d.art === 'crescent' ? d.accent : d.outline}" stroke-width="${d.art === 'crescent' ? 3 : 9}" paint-order="stroke" stroke-linejoin="round">${esc(cfg.sekolah_baris2)}</text>
        <rect x="236" y="378" width="128" height="5" rx="2.5" fill="url(#${id}-gold)"/>
        <path d="M222 380.5 l7 -6 7 6 -7 6 Z M364 380.5 l7 -6 7 6 -7 6 Z" fill="url(#${id}-gold)"/>
      </g>`;
  } else {
    deco = `
      <path id="${id}-arc" d="M186 182 Q300 158 414 182" fill="none"/>
      <g filter="url(#${id}-tshadow)">
        <text class="chk" data-fit="214" font-family="Bebas" font-size="56" letter-spacing="3" text-anchor="middle" fill="${d.text}" stroke="${d.outline}" stroke-width="7" paint-order="stroke" stroke-linejoin="round"><textPath href="#${id}-arc" startOffset="50%">${esc(nm)}</textPath></text>
        <text class="chk" x="300" y="438" text-anchor="middle" font-family="Anton" font-size="225" letter-spacing="-2" fill="${d.text}" stroke="url(#${id}-gold)" stroke-width="16" paint-order="stroke" stroke-linejoin="round">${esc(player.nomor)}</text>
        <text class="chk" x="300" y="438" text-anchor="middle" font-family="Anton" font-size="225" letter-spacing="-2" fill="none" stroke="${d.outline}" stroke-width="3.5">${esc(player.nomor)}</text>
      </g>
      <text class="chk" data-fit="176" x="300" y="106" text-anchor="middle" font-family="Bebas" font-size="22" letter-spacing="2" fill="${d.art === 'crescent' ? d.c3 : '#fff'}" opacity=".7">${esc(SCHOOL)}</text>`;
  }
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 660" width="100%" height="100%">
    <defs>${commonDefs(d, id)}</defs>
    <g filter="url(#${id}-shadow)">
      <path d="${BODY}" fill="url(#${id}-base)"/>
      <g clip-path="url(#${id}-clip)">
        ${view === 'front' ? tigerMark(d) : ''}
        ${artBody(d, id, view)}
        ${[0, 1].map((m) => `<g ${m ? `transform="${MIRROR}"` : ''}>
          <path d="${SLEEVE}" fill="${d.c3}"/><path d="${SLEEVE}" fill="url(#${id}-kawung)" mask="url(#${id}-smask)" opacity=".7"/>
          <path class="ko" d="${CUFF}" fill="url(#${id}-gold)"/><path class="ko" d="${CUFF2}" fill="${d.line2}"/>
          <path class="ko" d="${RAGLAN}" fill="none" stroke="url(#${id}-gold)" stroke-width="5"/>
          <path d="${RAGLAN}" transform="translate(-9 3)" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.3" stroke-dasharray="5 4"/>
        </g>`).join('')}
        ${deco}
        <g filter="url(#${id}-blur)">
          <path d="M150 250 Q210 300 190 420" stroke="#000" stroke-opacity=".28" stroke-width="16" fill="none"/>
          <path d="M450 250 Q395 310 412 430" stroke="#000" stroke-opacity=".25" stroke-width="16" fill="none"/>
          <path d="M230 560 Q300 590 380 555" stroke="#000" stroke-opacity=".2" stroke-width="14" fill="none"/>
          <path d="M260 110 Q300 300 280 600" stroke="#fff" stroke-opacity=".12" stroke-width="40" fill="none"/>
          <path d="M60 180 L110 250" stroke="#fff" stroke-opacity=".15" stroke-width="14"/>
        </g>
        <rect width="600" height="660" fill="url(#${id}-mesh)"/>
        <rect width="600" height="660" fill="url(#${id}-shade)"/>
        <rect width="600" height="660" fill="url(#${id}-vshade)"/>
        <path d="${HEM_STITCH}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" stroke-dasharray="6 4"/>
      </g>
      ${view === 'front'
        ? `<path d="${neck.inner}" fill="${d.c3}"/><path d="${neck.inner}" fill="#000" opacity=".45"/>
           <rect x="286" y="62" width="28" height="11" rx="2" fill="#fff" opacity=".85"/>
           <path d="${neck.edge}" fill="none" stroke="${d.c3}" stroke-width="20" stroke-linejoin="round" stroke-linecap="round"/>
           <path d="${neck.edge}" fill="none" stroke="url(#${id}-gold)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" transform="translate(0 4)"/>`
        : `<path d="${BACK_NECK}" fill="none" stroke="${d.c3}" stroke-width="18" stroke-linecap="round"/>
           <path d="${BACK_NECK}" fill="none" stroke="url(#${id}-gold)" stroke-width="5" stroke-linecap="round" transform="translate(0 5)"/>`}
      <path d="${BODY}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2"/>
    </g>
  </svg>`;
}

// ======================= CELANA (600x520) =======================
const SHORTS = 'M118 70 L482 70 Q500 250 520 420 L326 446 Q312 330 300 268 Q288 330 274 446 L80 420 Q100 250 118 70 Z';
function shorts(d, id, player, view) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="100%" height="100%">
    <defs>${commonDefs(d, id)}<clipPath id="${id}-sc"><path d="${SHORTS}"/></clipPath></defs>
    <g filter="url(#${id}-shadow)">
      <path d="${SHORTS}" fill="${d.c3}"/>
      <g clip-path="url(#${id}-sc)">
        <rect width="600" height="520" fill="url(#${id}-pat)" opacity=".8"/>
        ${[0, 1].map((m) => `<g ${m ? `transform="${MIRROR}"` : ''}>
          <path d="M100 60 L168 60 Q150 250 150 460 L60 460 Z" fill="url(#${id}-base)"/>
          <path class="ko" d="M168 60 L176 60 Q158 250 158 460 L150 460 Q150 250 168 60 Z" fill="url(#${id}-gold)"/>
          <path d="M182 60 L185 60 Q167 250 167 460 L164 460 Q164 250 182 60 Z" fill="${d.line2}" opacity=".9"/>
        </g>`).join('')}
        <path d="M60 396 L300 424 L540 396 L540 470 L60 470 Z" fill="url(#${id}-gold)"/>
        <path class="ko" d="M60 388 L300 416 L540 388 L540 394 L300 422 L60 394 Z" fill="${d.line2}"/>
        ${view === 'front'
          ? `<text class="chk" x="222" y="372" text-anchor="middle" font-family="Anton" font-size="56" fill="#FFFFFF" stroke="url(#${id}-gold)" stroke-width="6" paint-order="stroke" stroke-linejoin="round" filter="url(#${id}-tshadow)">${esc(player.nomor)}</text>
             ${crest(d, id, 392, 150, 0.62)}`
          : ''}
        <g filter="url(#${id}-blur)">
          <path d="M200 120 Q240 250 215 380" stroke="#fff" stroke-opacity=".12" stroke-width="30" fill="none"/>
          <path d="M300 268 L290 440" stroke="#000" stroke-opacity=".35" stroke-width="14"/>
          <path d="M400 110 Q370 250 392 390" stroke="#000" stroke-opacity=".2" stroke-width="14" fill="none"/>
        </g>
        <rect width="600" height="520" fill="url(#${id}-mesh)"/>
        <rect width="600" height="520" fill="url(#${id}-shade)"/>
      </g>
      <path d="M120 30 L480 30 Q484 52 484 76 L116 76 Q116 52 120 30 Z" fill="${d.c3}"/>
      <path d="M116 68 L484 68 L484 76 L116 76 Z" fill="url(#${id}-gold)"/>
      <path d="M120 40 L480 40 M120 50 L480 50 M120 60 L480 60" stroke="#000" stroke-opacity=".25" stroke-width="1.2"/>
      ${view === 'front' ? `<path d="M293 74 Q284 112 276 132 M307 74 Q316 112 324 132" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/>` : ''}
      <path d="${SHORTS}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2"/>
      <path d="M120 30 L480 30 Q484 52 484 76 L116 76 Q116 52 120 30 Z" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2"/>
    </g>
  </svg>`;
}

// ======================= LEMBAR PRESENTASI 1920x1200 =======================
function sheet(d, player) {
  const p = (t) => `<div class="tag"><span></span>${t}</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FONT_CSS}
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1920px;height:1200px;overflow:hidden;position:relative;color:#fff;font-family:'Bebas',sans-serif;
    background:radial-gradient(ellipse 70% 60% at 45% 48%, ${d.bg1} 0%, ${d.bg2} 75%);}
  .bgsvg{position:absolute;inset:0}
  .wm{position:absolute;left:-30px;top:330px;font-family:'Anton';font-size:420px;letter-spacing:10px;line-height:1;
    color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.06);white-space:nowrap}
  header{position:absolute;left:70px;top:52px;right:70px;display:flex;justify-content:space-between;align-items:flex-start}
  .eyebrow{font-size:24px;letter-spacing:7px;color:${d.accent}}
  h1{font-family:'Anton';font-weight:400;font-size:92px;line-height:1;letter-spacing:2px;margin-top:6px}
  .sub{font-size:25px;letter-spacing:3px;opacity:.75;margin-top:10px}
  .badge{text-align:right}
  .badge .k{font-family:'Anton';font-size:64px;line-height:1;color:transparent;-webkit-text-stroke:2px ${d.accent}}
  .badge .s{font-size:26px;letter-spacing:6px;margin-top:6px}
  .stage{position:absolute;top:255px;left:40px;right:40px;height:760px}
  .g{position:absolute}
  .tag{display:inline-flex;align-items:center;gap:10px;font-size:22px;letter-spacing:5px;
    padding:6px 16px 4px;border:1.5px solid rgba(255,255,255,.25);border-radius:30px;background:rgba(0,0,0,.25);white-space:nowrap}
  .tag span{width:9px;height:9px;border-radius:50%;background:${d.accent};display:block;margin-top:-2px}
  .floor{position:absolute;height:60px;border-radius:50%;background:radial-gradient(ellipse at center, rgba(0,0,0,.55), transparent 70%)}
  footer{position:absolute;left:0;right:0;bottom:0;height:150px;display:flex;align-items:center;justify-content:space-between;
    padding:0 70px;background:linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,.25));border-top:3px solid ${d.accent}}
  .chips{display:flex;gap:26px}
  .chip{display:flex;align-items:center;gap:12px;font-size:21px;letter-spacing:2px;line-height:1.15}
  .chip i{width:46px;height:46px;border-radius:50%;display:block;border:3px solid rgba(255,255,255,.85);box-shadow:0 4px 10px rgba(0,0,0,.4)}
  .chip small{opacity:.6;font-size:18px}
  .spec{display:grid;grid-template-columns:auto auto auto;gap:6px 40px;font-size:21px;letter-spacing:2px}
  .spec div b{display:block;color:${d.accent};font-weight:400;font-size:17px;letter-spacing:4px}
  </style></head><body>
  <svg class="bgsvg" viewBox="0 0 1920 1200" preserveAspectRatio="none">
    <defs><radialGradient id="spot" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <polygon points="520,0 760,0 1050,1200 260,1200" fill="url(#spot)"/>
    <polygon points="1080,0 1280,0 1600,1200 900,1200" fill="url(#spot)" opacity=".8"/>
    <g fill="none" stroke="#fff" stroke-opacity=".06" stroke-width="3">
      <circle cx="960" cy="1250" r="330"/><rect x="-200" y="200" width="2320" height="1100"/>
    </g>
    <g stroke="${d.accent}" stroke-opacity=".5" stroke-width="5"><line x1="1700" y1="250" x2="1880" y2="160"/><line x1="1730" y1="275" x2="1880" y2="200"/></g>
    <g stroke="${d.accent}" stroke-opacity=".35" stroke-width="5"><line x1="40" y1="1030" x2="220" y2="940"/></g>
  </svg>
  <div class="wm">${esc(cfg.sekolah_baris2)}</div>
  <header>
    <div><div class="eyebrow">KIT FUTSAL ANAK 2026/27 · ${esc(SCHOOL)}</div><h1>${esc(d.nama)}</h1><div class="sub">${esc(d.tagline)}</div></div>
    <div class="badge"><div class="k">${esc(d.no)}</div><div class="s">${esc(d.jenis)} · USIA 4–6 TH</div></div>
  </header>
  <div class="stage">
    <div class="floor" style="left:80px;top:650px;width:480px"></div>
    <div class="floor" style="left:710px;top:650px;width:480px"></div>
    <div class="g" style="left:20px;top:30px;width:600px;height:660px">${shirt(d, 'f', 'front', player)}</div>
    <div class="g" style="left:650px;top:30px;width:600px;height:660px">${shirt(d, 'b', 'back', player)}</div>
    <div class="g" style="left:1330px;top:-10px;width:460px;height:399px">${shorts(d, 'sf', player, 'front')}</div>
    <div class="g" style="left:1330px;top:375px;width:460px;height:399px">${shorts(d, 'sb', player, 'back')}</div>
    <div style="position:absolute;left:225px;top:712px">${p('TAMPAK DEPAN')}</div>
    <div style="position:absolute;left:835px;top:712px">${p('TAMPAK BELAKANG')}</div>
    <div style="position:absolute;left:1475px;top:330px">${p('CELANA DEPAN')}</div>
    <div style="position:absolute;left:1455px;top:712px">${p('CELANA BELAKANG')}</div>
  </div>
  <footer>
    <div class="chips">${d.chips.map(([c, n]) => `<div class="chip"><i style="background:${c}"></i><div>${n}<br><small>${c}</small></div></div>`).join('')}</div>
    <div class="spec">
      <div><b>BAHAN</b>Dryfit / Milano</div><div><b>PRINTING</b>Full Sublimasi</div><div><b>UKURAN</b>Anak 4–6 Th (S–M–L)</div>
      <div><b>CONTOH NAMA</b>${esc(player.nama)}</div><div><b>NOMOR</b>${esc(player.nomor)}</div><div><b>FONT</b>Anton · Bebas Neue</div>
    </div>
  </footer>
  </body></html>`;
}

function backOnly(d, player) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FONT_CSS}
  *{margin:0}body{width:900px;height:1000px;font-family:'Bebas';color:#fff;
  background:radial-gradient(ellipse at 50% 40%, ${d.bg1}, ${d.bg2} 80%)}
  .a{height:860px;padding:40px 40px 0}.l{text-align:center;font-size:34px;letter-spacing:4px}
  .l b{color:${d.accent};font-weight:400}</style></head><body>
  <div class="a">${shirt(d, 'p', 'back', player)}</div>
  <div class="l">${esc(player.nama)} · <b>NO ${esc(player.nomor)}</b> · ${esc(d.nama)}</div></body></html>`;
}


// ======================= LEMBAR LOGO =======================
function logoSheet(svg) {
  const m = [['Kubah & dua menara', 'Nilai-nilai Islam sebagai fondasi pendidikan'],
    ['Kitab terbuka', "Ilmu & cinta Al-Qur'an sejak dini"],
    ['Bulan sabit & bintang', 'Akhlak yang menerangi, cita-cita setinggi bintang'],
    ['Bola', 'Anak yang aktif, sehat, sportif & kompak'],
    ['Sinar matahari', 'Generasi yang tumbuh ceria & bersinar'],
    ['Untaian daun', 'Pendidikan yang menumbuhkan & membanggakan']];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FONT_CSS}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1920px;height:1200px;display:flex;font-family:'Bebas';overflow:hidden}
  .l{width:1000px;height:1200px;background:radial-gradient(circle at 50% 45%,#FFFEF8,#EFE6CC);display:flex;align-items:center;justify-content:center;position:relative}
  .l .lg{width:860px;height:860px;filter:drop-shadow(0 25px 40px rgba(0,0,0,.25))}
  .r{flex:1;background:radial-gradient(ellipse at 30% 20%,#0E6B45,#03261A 75%);color:#fff;padding:70px 70px 0}
  .ey{letter-spacing:7px;color:#F2C230;font-size:24px}
  h1{font-family:'Cinzel';font-weight:800;font-size:54px;line-height:1.1;margin:10px 0 6px}
  .sub{opacity:.75;letter-spacing:3px;font-size:24px}
  .row{display:flex;gap:28px;align-items:center;margin:34px 0 30px}
  .sm{width:190px;height:190px}
  .lock{display:flex;align-items:center;gap:18px;background:#fff;border-radius:18px;padding:16px 26px}
  .lock .sm2{width:120px;height:120px}
  .lock b{display:block;font-family:'Cinzel';font-weight:800;color:#0B5D3B;font-size:26px;letter-spacing:2px}
  .lock i{display:block;font-style:normal;font-family:'Cinzel';font-weight:800;color:#C7920B;font-size:40px;letter-spacing:2px;line-height:1}
  .mk{display:grid;grid-template-columns:1fr 1fr;gap:16px 30px}
  .mk div{font-size:22px;letter-spacing:1.5px;line-height:1.25;opacity:.9}
  .mk b{display:block;color:#F2C230;font-weight:400;font-size:25px;letter-spacing:3px}
  .ch{display:flex;gap:22px;margin-top:34px}
  .ch span{display:flex;align-items:center;gap:10px;font-size:20px;letter-spacing:2px}
  .ch i{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.8);display:block}
  </style></head><body>
  <div class="l"><div class="lg">${svg}</div></div>
  <div class="r">
    <div class="ey">LOGO RESMI · IDENTITAS SEKOLAH</div>
    <h1>TK ISLAM PLUS<br>AL MUHAAJIR</h1>
    <div class="sub">Dipakai di jersey, seragam, spanduk, kop surat & media sosial</div>
    <div class="row"><div class="sm">${svg}</div>
      <div class="lock"><div class="sm2">${svg}</div><div><b>TK ISLAM PLUS</b><i>AL MUHAAJIR</i></div></div></div>
    <div class="mk">${m.map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join('')}</div>
    <div class="ch">${[['#0B5D3B', 'HIJAU'], ['#E8B21A', 'EMAS'], ['#F2E8CC', 'KREM'], ['#FFFFFF', 'PUTIH']].map(([c, n]) => `<span><i style="background:${c}"></i>${n} ${c}</span>`).join('')}</div>
  </div></body></html>`;
}

// Kecilkan otomatis teks yang terlalu panjang (mis. nama panjang) supaya muat
const FIT = () => {
  document.querySelectorAll('text[data-fit]').forEach((t) => {
    const max = +t.dataset.fit; let fs = parseFloat(t.getAttribute('font-size'));
    for (let i = 0; i < 30 && t.getComputedTextLength() > max; i++) { fs *= 0.96; t.setAttribute('font-size', fs.toFixed(1)); }
    t.removeAttribute('data-fit');
  });
};

// Cek tabrakan: tulisan/logo (.chk) tidak boleh kena garis/motif (.ko) atau saling tumpuk
const CHECK = () => {
  const out = [], PAD = 3;
  const boxes = (e) => {
    if (e.tagName === 'text') {
      const M = e.getScreenCTM(), r = [], cs = getComputedStyle(e);
      const ctx = (window.__c ||= document.createElement('canvas').getContext('2d'));
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const sw = e.getAttribute('paint-order') ? (parseFloat(e.getAttribute('stroke-width')) || 0) / 2 : 0;
      const txt = e.textContent;
      for (let i = 0; i < e.getNumberOfChars(); i++) {
        const ch = txt[i]; if (!ch || ch === ' ') continue;
        const m = ctx.measureText(ch), p = e.getStartPositionOfChar(i), rot = e.getRotationOfChar(i) * Math.PI / 180;
        const L = -m.actualBoundingBoxLeft - sw, Rr = m.actualBoundingBoxRight + sw, T = -m.actualBoundingBoxAscent - sw, B = m.actualBoundingBoxDescent + sw;
        const pts = [[L, T], [Rr, T], [L, B], [Rr, B]].map(([x, y]) =>
          new DOMPoint(p.x + x * Math.cos(rot) - y * Math.sin(rot), p.y + x * Math.sin(rot) + y * Math.cos(rot)).matrixTransform(M));
        r.push({ l: Math.min(...pts.map((q) => q.x)), r: Math.max(...pts.map((q) => q.x)), t: Math.min(...pts.map((q) => q.y)), b: Math.max(...pts.map((q) => q.y)) });
      }
      return r;
    }
    const b = e.getBoundingClientRect(); return [{ l: b.left, r: b.right, t: b.top, b: b.bottom }];
  };
  document.querySelectorAll('svg').forEach((svg, si) => {
    const chk = [...svg.querySelectorAll('.chk')].map((e) => ({ e, bx: boxes(e) }));
    const ko = [...svg.querySelectorAll('.ko')];
    const name = (e) => e.tagName === 'text' ? e.textContent.trim().slice(0, 20) : 'logo/badge@' + e.getAttribute('transform');
    chk.forEach(({ e, bx }) => {
      ko.forEach((k) => {
        const L = k.getTotalLength(), M = k.getScreenCTM();
        for (let l = 0; l <= L; l += Math.max(1, L / 400)) {
          const p = k.getPointAtLength(l), q = new DOMPoint(p.x, p.y).matrixTransform(M);
          if (bx.some((b) => q.x > b.l - PAD && q.x < b.r + PAD && q.y > b.t - PAD && q.y < b.b + PAD)) {
            out.push(`svg${si}: "${name(e)}" kena garis/motif [${(k.getAttribute("d") || k.tagName).slice(0, 30)} @${q.x.toFixed(0)},${q.y.toFixed(0)}]`); return;
          }
        }
      });
    });
    for (let i = 0; i < chk.length; i++) for (let j = i + 1; j < chk.length; j++) {
      if (chk[i].e.contains(chk[j].e) || chk[j].e.contains(chk[i].e)) continue;
      const hit = chk[i].bx.some((a) => chk[j].bx.some((b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b));
      if (hit && !(chk[i].e.tagName === 'text' && chk[j].e.tagName === 'text' && chk[i].e.textContent.trim() === chk[j].e.textContent.trim())) out.push(`svg${si}: "${name(chk[i].e)}" tumpuk "${name(chk[j].e)}"`);
    }
  });
  return [...new Set(out)];
};

async function render(page, html) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(FIT);
  const w = await page.evaluate(CHECK);
  if (w.length) { console.log('  ⚠ TABRAKAN:'); w.forEach((x) => console.log('   -', x)); }
  return w;
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 2 });
  for (const d of DESIGNS) {
    await render(page, sheet(d, cfg.contoh_pemain));
    await page.screenshot({ path: path.join(OUT, `${d.key}.jpg`), type: 'jpeg', quality: 95 });
    await page.pdf({ path: path.join(OUT, `${d.key}.pdf`), width: '1920px', height: '1200px', printBackground: true });
    const svgs = await page.$$eval('.g svg', (els) => els.map((e) => e.outerHTML));
    ['baju-depan', 'baju-belakang', 'celana-depan', 'celana-belakang'].forEach((n, i) => {
      const s = svgs[i].replace('<defs>', `<defs><style>${FONT_CSS}</style>`);
      fs.writeFileSync(path.join(OUT, 'svg', `${d.key}_${n}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${s}`);
    });
    console.log('OK', d.key);
  }
  // ---------- LOGO ----------
  const LD = path.join(OUT, 'logo');
  fs.mkdirSync(LD, { recursive: true });
  const logoSvg = LOGO.fullLogo(FONT_CSS);
  fs.writeFileSync(path.join(LD, 'logo-tk-islam-plus-al-muhaajir.svg'), `<?xml version="1.0" encoding="UTF-8"?>\n${logoSvg.replace('width="100%" height="100%"', 'width="1000" height="1000"')}`);
  const lp = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2 });
  await render(lp, `<html><body style="margin:0;background:transparent">${logoSvg}</body></html>`);
  await lp.screenshot({ path: path.join(LD, 'logo-tk-islam-plus-al-muhaajir.png'), omitBackground: true });
  await render(page, logoSheet(logoSvg));
  await page.screenshot({ path: path.join(LD, 'logo-presentasi.jpg'), type: 'jpeg', quality: 95 });
  await page.pdf({ path: path.join(LD, 'logo-presentasi.pdf'), width: '1920px', height: '1200px', printBackground: true });
  console.log('OK logo');

  if (cfg.pemain && cfg.pemain.length) {
    const pp = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
    const dir = path.join(OUT, 'per-pemain');
    fs.mkdirSync(dir, { recursive: true });
    for (const d of DESIGNS) for (const p of cfg.pemain) {
      await render(pp, backOnly(d, p));
      const safe = `${p.nomor}-${p.nama}`.replace(/[^\w-]+/g, '_');
      await pp.screenshot({ path: path.join(dir, `${d.key}_${safe}.jpg`), type: 'jpeg', quality: 92 });
    }
    console.log('OK per-pemain:', cfg.pemain.length, 'anak x', DESIGNS.length, 'desain');
  }
  await browser.close();
})();
