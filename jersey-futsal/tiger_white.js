// Ilustrasi vektor: kepala HARIMAU PUTIH MENGAUM (gaya maskot e-sport), digambar sendiri.
// Berpusat di (0,0), kira-kira -190..190 x -185..175.
const OL = '#0B0F17';        // garis luar
const W = '#F7F9FC', W2 = '#DCE3EC', W3 = '#AEBACB', ST = '#151820';

function halfHead() {
  return `
  <!-- telinga -->
  <path d="M-92 -118 L-156 -176 Q-170 -112 -136 -78 Z" fill="${W}" stroke="${OL}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M-102 -114 L-146 -154 Q-152 -114 -132 -90 Z" fill="#C7CCD6"/>
  <path d="M-156 -176 L-150 -146 L-138 -160 Z" fill="${ST}"/>
  <!-- kepala (setengah kiri) -->
  <path d="M0 -150 C-40 -152 -76 -140 -100 -118 L-120 -94 L-134 -62 L-152 -44 L-186 -24 L-154 -10 L-192 18 L-156 26 L-184 60 L-144 62 L-158 98 L-114 92 L-104 124 L-74 114 L-58 156 L-30 132 L0 168 L1 168 L1 -150 Z" fill="${W}"/>
  <!-- bayangan biru-abu -->
  <path d="M-134 -62 L-152 -44 L-186 -24 L-154 -10 L-192 18 L-156 26 L-184 60 L-144 62 L-158 98 L-114 92 L-120 70 L-136 40 L-128 0 L-112 -30 Z" fill="${W2}"/>
  <path d="M-114 92 L-104 124 L-74 114 L-58 156 L-30 132 L-40 120 L-70 100 Z" fill="${W2}"/>
  <path d="M-12 -40 L-30 -18 L-36 10 L-14 4 Z" fill="${W2}"/>
  <!-- garis dahi -->
  <path d="M-26 -148 Q-40 -120 -20 -92 Q-30 -118 -26 -148 Z" fill="${ST}"/>
  <path d="M-54 -144 Q-72 -116 -46 -88 Q-58 -116 -54 -144 Z" fill="${ST}"/>
  <path d="M-82 -134 Q-98 -112 -76 -90 Q-84 -112 -82 -134 Z" fill="${ST}"/>
  <!-- garis pelipis & pipi (runcing ke dalam) -->
  <path d="M-128 -70 Q-102 -70 -86 -54 Q-106 -60 -124 -58 Z" fill="${ST}"/>
  <path d="M-170 -18 Q-130 -18 -104 -2 Q-132 -8 -164 -6 Z" fill="${ST}"/>
  <path d="M-174 22 Q-136 18 -108 32 Q-136 30 -168 34 Z" fill="${ST}"/>
  <path d="M-166 62 Q-136 54 -112 62 Q-136 66 -160 72 Z" fill="${ST}"/>
  <path d="M-138 96 Q-118 86 -100 92 Q-116 98 -132 106 Z" fill="${ST}"/>
  <!-- alis marah -->
  <path d="M-18 -44 L-96 -84 L-104 -70 L-26 -30 Z" fill="${ST}"/>
  <!-- mata (biru es, menyipit) -->
  <path d="M-26 -32 L-84 -60 Q-92 -40 -70 -28 Q-46 -18 -26 -32 Z" fill="url(#tw-eye)" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M-55 -48 Q-50 -38 -55 -26 Q-60 -38 -55 -48 Z" fill="${OL}"/>
  <circle cx="-64" cy="-44" r="3" fill="#fff"/>
  <!-- kerutan moncong (menggeram) -->
  <path d="M-30 -6 Q-46 -10 -58 0" stroke="${OL}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M-34 6 Q-52 4 -64 14" stroke="${OL}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- mulut terbuka -->
  <path d="M1 34 Q-40 30 -80 50 Q-72 116 1 140 Z" fill="#3A070C"/>
  <path d="M1 96 Q-26 92 -44 108 Q-26 132 1 134 Z" fill="#D8435A"/>
  <path d="M-80 50 Q-40 34 1 38 L1 46 Q-40 44 -76 58 Z" fill="#E7848F"/>
  <!-- taring & gigi -->
  <path d="M-64 50 L-54 104 L-42 46 Z" fill="#FFFFFF" stroke="${OL}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M-38 44 L-33 60 L-27 42 Z M-24 41 L-20 54 L-15 40 Z" fill="#FFFFFF" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M-46 122 L-40 92 L-30 126 Z" fill="#FFFFFF" stroke="${OL}" stroke-width="3.5" stroke-linejoin="round"/>
  <!-- bibir atas (moncong putih) -->
  <path d="M1 8 L0 8 C-10 30 -30 40 -54 40 C-72 40 -82 36 -88 48 C-90 30 -74 16 -50 14 C-30 12 -12 4 0 -4 L1 -4 Z" fill="${W}"/>
  <path d="M0 8 C-10 30 -30 40 -54 40 C-72 40 -82 36 -88 48" fill="none" stroke="${OL}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="-30" cy="26" r="2.6" fill="${W3}"/><circle cx="-44" cy="30" r="2.6" fill="${W3}"/><circle cx="-38" cy="20" r="2.6" fill="${W3}"/>
  <!-- garis luar mulut -->
  <path d="M-80 50 Q-72 116 0 140" fill="none" stroke="${OL}" stroke-width="6" stroke-linejoin="round"/>
  <!-- kumis -->
  <g stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity=".9">
    <path d="M-60 28 Q-120 14 -176 28"/><path d="M-62 34 Q-122 32 -170 54"/><path d="M-60 40 Q-112 50 -150 80"/>
  </g>`;
}

function whiteTiger() {
  return `
  <defs>
    <linearGradient id="tw-eye" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BFF0FF"/><stop offset="1" stop-color="#2BA7E6"/>
    </linearGradient>
  </defs>
  <path d="M0 -150 C-40 -152 -76 -140 -100 -118 L-100 -118 L-120 -94 L-134 -62 L-152 -44 L-186 -24 L-154 -10 L-192 18 L-156 26 L-184 60 L-144 62 L-158 98 L-114 92 L-104 124 L-74 114 L-58 156 L-30 132 L0 168 L30 132 L58 156 L74 114 L104 124 L114 92 L158 98 L144 62 L184 60 L156 26 L192 18 L154 -10 L186 -24 L152 -44 L134 -62 L120 -94 L100 -118 L100 -118 C76 -140 40 -152 0 -150 Z" fill="${W}" stroke="${OL}" stroke-width="14" stroke-linejoin="round"/>
  ${halfHead()}
  <g transform="scale(-1 1)">${halfHead()}</g>
  <!-- garis tengah dahi -->
  <path d="M0 -148 L-10 -114 L0 -84 L10 -114 Z" fill="${ST}"/>
  <path d="M0 -76 L-6 -62 L0 -50 L6 -62 Z" fill="${ST}"/>
  <!-- hidung -->
  <path d="M-30 -12 Q0 -24 30 -12 Q26 10 0 18 Q-26 10 -30 -12 Z" fill="#2B2C33" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M-14 -12 Q0 -17 12 -12 Q4 -8 -14 -12 Z" fill="#fff" opacity=".45"/>
  <path d="M0 18 L0 34" stroke="${OL}" stroke-width="5"/>
  <!-- dagu -->
  <path d="M-26 140 Q0 152 26 140 Q16 160 0 164 Q-16 160 -26 140 Z" fill="${W2}"/>`;
}

// Versi mono/tonal (semua warna jadi satu warna dengan tingkat terang berbeda)
function tonalTiger(color) {
  return whiteTiger().replace(/#(?:[0-9A-Fa-f]{6})|url\(#tw-eye\)/g, (c) => {
    if (c.startsWith('url')) return color;
    const h = c.slice(1), l = (0.3 * parseInt(h.slice(0, 2), 16) + 0.59 * parseInt(h.slice(2, 4), 16) + 0.11 * parseInt(h.slice(4, 6), 16)) / 255;
    return `${color}" fill-opacity="${(0.12 + 0.88 * l).toFixed(2)}`;
  });
}
module.exports = { whiteTiger, tonalTiger };

// Versi ILUSTRASI SEMI-REALISTIS: tanpa outline tebal, tepi bulu berserabut, bayangan lembut, monokrom.
function realTiger(id = 'rt') {
  let art = whiteTiger()
    .replace(/stroke-width="14"/g, 'stroke-width="2"')
    .replace(/stroke-width="7"/g, 'stroke-width="1.5"')
    .replace(/url\(#tw-eye\)/g, '#9FB4C8');
  // rambut halus: garis pendek mengikuti arah tumbuh bulu dari tengah keluar
  let s = 99991; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const hair = [];
  for (let i = 0; i < 1400; i++) {
    const a = rnd() * Math.PI * 2, r = 30 + Math.sqrt(rnd()) * 160;
    const x = r * Math.cos(a) * 1.05, y = r * Math.sin(a) * 0.95 + 6;
    if (y > 30 && Math.abs(x) < 80 && y < 140) continue;       // jangan di mulut
    const len = 6 + rnd() * 12, ang = Math.atan2(y + 20, x) + (rnd() - .5) * .5;
    const c = rnd() > .5 ? '#FFFFFF' : '#0B0F17';
    hair.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(ang) * len).toFixed(1)} ${(Math.sin(ang) * len).toFixed(1)}" stroke="${c}" stroke-opacity="${(0.12 + rnd() * .25).toFixed(2)}" stroke-width="${(0.6 + rnd() * 1.1).toFixed(1)}"/>`);
  }
  return `
  <defs>
    <filter id="${id}-fur" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="2" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="${id}-soft"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="${id}-gray"><feColorMatrix type="saturate" values="0"/></filter>
    <clipPath id="${id}-clip"><path d="M0 -150 C-40 -152 -76 -140 -100 -118 L-192 18 L-158 98 L-58 156 L0 168 L58 156 L158 98 L192 18 L100 -118 C76 -140 40 -152 0 -150 Z"/></clipPath>
  </defs>
  <g filter="url(#${id}-gray)">
    <g filter="url(#${id}-fur)">${art}</g>
    <g filter="url(#${id}-soft)" opacity=".55">
      <ellipse cx="-56" cy="-40" rx="40" ry="20" fill="#000" opacity=".5"/><ellipse cx="56" cy="-40" rx="40" ry="20" fill="#000" opacity=".5"/>
      <ellipse cx="-110" cy="40" rx="40" ry="70" fill="#000" opacity=".35"/><ellipse cx="110" cy="40" rx="40" ry="70" fill="#000" opacity=".35"/>
      <ellipse cx="0" cy="-110" rx="50" ry="30" fill="#fff" opacity=".35"/>
      <ellipse cx="-34" cy="20" rx="30" ry="16" fill="#fff" opacity=".5"/><ellipse cx="34" cy="20" rx="30" ry="16" fill="#fff" opacity=".5"/>
    </g>
    <g filter="url(#${id}-fur)">${hair.join('')}</g>
  </g>`;
}
module.exports.realTiger = realTiger;
