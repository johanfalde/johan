// Logo TK Islam Plus Al Muhaajir
// Simbol: kubah masjid + 2 menara (nilai Islam), bulan sabit & bintang, kitab/Al-Qur'an terbuka (ilmu),
// sinar matahari (generasi yang tumbuh cerah), rangkaian daun (pendidikan & pertumbuhan).

// Bola futsal (lingkaran putih + panel segilima hitam)
function ball(cx, cy, r, ink = '#111', base = '#FFFFFF') {
  const pent = (x, y, s, rot = 0) => {
    const p = []; for (let i = 0; i < 5; i++) { const a = (rot - 90 + i * 72) * Math.PI / 180; p.push(`${(x + s * Math.cos(a)).toFixed(2)},${(y + s * Math.sin(a)).toFixed(2)}`); }
    return `<polygon points="${p.join(' ')}" fill="${ink}"/>`;
  };
  const out = [pent(0, 0, r * 0.36)];
  const seams = [];
  for (let i = 0; i < 5; i++) {
    const a = (-90 + i * 72) * Math.PI / 180, x1 = r * .36 * Math.cos(a), y1 = r * .36 * Math.sin(a);
    const x2 = r * .78 * Math.cos(a), y2 = r * .78 * Math.sin(a);
    seams.push(`M${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)}`);
    out.push(pent(r * 0.98 * Math.cos(a), r * 0.98 * Math.sin(a), r * 0.3, i * 72 + 36));
  }
  return `<g transform="translate(${cx} ${cy})">
    <defs><clipPath id="bc${String(r).replace('.', '_')}${cx}${cy}"><circle r="${r}"/></clipPath></defs>
    <circle r="${r}" fill="${base}"/>
    <g clip-path="url(#bc${String(r).replace('.', '_')}${cx}${cy})">${out.join('')}<path d="${seams.join(' ')}" stroke="${ink}" stroke-width="${(r * 0.06).toFixed(2)}"/></g>
    <circle r="${r}" fill="none" stroke="${ink}" stroke-width="${(r * 0.07).toFixed(2)}"/>
  </g>`;
}

// Motif inti, berpusat di (0,0), kira-kira -40..40
function emblem({ dome, book, line, gold, edge = 'none' }) {
  const minaret = (s) => `<g transform="scale(${s} 1)">
      <path d="M-34 12 L-34 -14 L-31 -23 L-28 -14 L-28 12 Z" fill="${dome}" stroke="${edge}" stroke-width="1"/>
      <rect x="-35.5" y="-9" width="9" height="2.6" rx="1" fill="${gold}"/>
      <circle cx="-31" cy="-25" r="1.4" fill="${gold}"/></g>`;
  return `
    ${minaret(1)}${minaret(-1)}
    <path d="M-21 12 L-21 -2 C-21 -16 -8 -20 0 -31 C8 -20 21 -16 21 -2 L21 12 Z" fill="${dome}" stroke="${edge}" stroke-width="1"/>
    <path d="M-21 -3 L21 -3" stroke="${gold}" stroke-width="1.6"/>
    <path d="M0 -31 L0 -36" stroke="${gold}" stroke-width="1.6"/>
    <path d="M-2.2 -43.5 A4.6 4.6 0 1 0 3.6 -37 A3.6 3.6 0 1 1 -2.2 -43.5 Z" fill="${gold}"/>
    <g stroke="${gold}" stroke-width="1.6" stroke-linejoin="round">
      <path d="M0 9 C-9 4 -22 4 -33 8 L-33 27 C-22 23 -9 23 0 28 Z" fill="${book}"/>
      <path d="M0 9 C9 4 22 4 33 8 L33 27 C22 23 9 23 0 28 Z" fill="${book}"/>
    </g>
    <g stroke="${line}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".75">
      <path d="M-27 13 C-20 11 -12 11 -5 14"/><path d="M-27 18 C-20 16 -12 16 -5 19"/><path d="M-27 23 C-20 21 -12 21 -5 24"/>
      <path d="M27 13 C20 11 12 11 5 14"/><path d="M27 18 C20 16 12 16 5 19"/><path d="M27 23 C20 21 12 21 5 24"/>
    </g>`;
}

// Logo perisai untuk dada jersey (koordinat -40..44)
function crestShield(id, c3, goldUrl) {
  return `
    <path d="M0 -40 L32 -29 L32 6 Q32 30 0 44 Q-32 30 -32 6 L-32 -29 Z" fill="${c3}" stroke="${goldUrl}" stroke-width="4"/>
    <path d="M0 -33 L26 -24 L26 5 Q26 25 0 37 Q-26 25 -26 5 L-26 -24 Z" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>
    <path d="M-4.5 -32 l1.2 2.6 2.8.3 -2.1 1.9.6 2.8 -2.5 -1.5 -2.5 1.5.6 -2.8 -2.1 -1.9 2.8 -.3 Z" transform="translate(4.5 0)" fill="${goldUrl}"/>
    <g transform="translate(0 3) scale(.64)">${emblem({ dome: goldUrl, book: '#FFFFFF', line: c3, gold: goldUrl })}</g>
    ${ball(0, 30, 7.2)}`;
}

// Logo lengkap (lingkaran) — SVG 1000x1000
function fullLogo(FONT_CSS, opt = {}) {
  const G = opt.green || '#0B5D3B', G2 = opt.green2 || '#07402A';
  const leaves = [];
  const LEAF = 'M0 0 C7 -9 7 -22 0 -32 C-7 -22 -7 -9 0 0 Z';
  [[-1, 100, 158], [1, 80, 22]].forEach(([side, a0, a1]) => {
    const R = 286, pts = [];
    for (let k = 0; k <= 7; k++) pts.push(a0 + (a1 - a0) * k / 7);
    const P = (a) => [R * Math.cos(a * Math.PI / 180), R * Math.sin(a * Math.PI / 180)];
    const [sx, sy] = P(a0), [ex, ey] = P(a1);
    leaves.push(`<path d="M${sx.toFixed(1)} ${sy.toFixed(1)} A${R} ${R} 0 0 ${side < 0 ? 1 : 0} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${G}" stroke-width="5" stroke-linecap="round"/>`);
    pts.forEach((a, k) => {
      const [x, y] = P(a), r = a * Math.PI / 180;
      const dx = side < 0 ? -Math.sin(r) : Math.sin(r), dy = side < 0 ? Math.cos(r) : -Math.cos(r);
      const base = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      [-38, 38].forEach((t, j) => {
        if (k === 0 && j === 0) return;
        leaves.push(`<path d="${LEAF}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(base + t).toFixed(1)}) scale(${(1.15 + k * 0.03).toFixed(2)})" fill="${(k + j) % 2 ? G : '#1A8A5C'}"/>`);
      });
    });
    const [tx, ty] = P(a1 + (side < 0 ? 4 : -4));
    const tb = Math.atan2(side < 0 ? Math.cos(a1 * Math.PI / 180) : -Math.cos(a1 * Math.PI / 180), side < 0 ? -Math.sin(a1 * Math.PI / 180) : Math.sin(a1 * Math.PI / 180)) * 180 / Math.PI + 90;
    leaves.push(`<path d="${LEAF}" transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${tb.toFixed(1)})" fill="#1A8A5C"/>`);
  });
  const rays = [];
  for (let i = 0; i < 24; i++) {
    const a1 = (i * 15 - 3.5) * Math.PI / 180, a2 = (i * 15 + 3.5) * Math.PI / 180, R = 340;
    rays.push(`M0 0 L${(R * Math.cos(a1)).toFixed(1)} ${(R * Math.sin(a1)).toFixed(1)} L${(R * Math.cos(a2)).toFixed(1)} ${(R * Math.sin(a2)).toFixed(1)} Z`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000" width="100%" height="100%">
  <defs>
    <style>${FONT_CSS}</style>
    <linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE48A"/><stop offset=".45" stop-color="#E8B21A"/><stop offset="1" stop-color="#A97A06"/>
    </linearGradient>
    <radialGradient id="lg-disc" cx="0" cy="-.1" r=".75">
      <stop offset="0" stop-color="#FFFEF8"/><stop offset="1" stop-color="#F2E8CC"/>
    </radialGradient>
    <radialGradient id="lg-ring" cx="0" cy="-.2" r=".8"><stop offset="0" stop-color="#11804F"/><stop offset="1" stop-color="${G2}"/></radialGradient>
    <clipPath id="lg-clip"><circle r="344"/></clipPath>
    <path id="lg-top" d="M-388 0 A388 388 0 0 1 388 0"/>
    <path id="lg-bot" d="M-438 0 A438 438 0 0 0 438 0"/>
    <pattern id="lg-pat" width="60" height="60" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="${G}" stroke-opacity=".07" stroke-width="2">
        <rect x="17" y="17" width="26" height="26"/><rect x="17" y="17" width="26" height="26" transform="rotate(45 30 30)"/>
      </g>
    </pattern>
  </defs>
  <circle r="494" fill="url(#lg-gold)"/>
  <circle r="480" fill="url(#lg-ring)"/>
  <circle r="468" fill="none" stroke="url(#lg-gold)" stroke-width="3"/>
  <text font-family="Cinzel" font-weight="800" font-size="76" letter-spacing="9" fill="#FFF4D6" text-anchor="middle"><textPath href="#lg-top" startOffset="50%">TK ISLAM PLUS</textPath></text>
  <text font-family="Cinzel" font-weight="800" font-size="76" letter-spacing="9" fill="url(#lg-gold)" text-anchor="middle"><textPath href="#lg-bot" startOffset="50%">AL MUHAAJIR</textPath></text>
  ${[-412, 412].map((x) => `<path transform="translate(${x} 0)" d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z" fill="url(#lg-gold)"/>`).join('')}
  <circle r="352" fill="url(#lg-gold)"/>
  <circle r="344" fill="url(#lg-disc)"/>
  <g clip-path="url(#lg-clip)">
    <rect x="-350" y="-350" width="700" height="700" fill="url(#lg-pat)"/>
    <path d="${rays.join(' ')}" fill="#E8B21A" opacity=".13" transform="translate(0 60)"/>
  </g>
  <mask id="lg-cm"><rect x="-500" y="-500" width="1000" height="1000" fill="#fff"/><circle cx="0" cy="-58" r="246" fill="#000"/></mask>
  <circle cx="0" cy="-22" r="262" fill="url(#lg-gold)" mask="url(#lg-cm)"/>
  <path transform="translate(0 -292) scale(1.5)" d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z" fill="url(#lg-gold)"/>
  ${leaves.join('')}
  <g transform="translate(0 20) scale(6)">${emblem({ dome: G, book: '#FFFFFF', line: G, gold: 'url(#lg-gold)' })}</g>
  <circle cx="0" cy="268" r="50" fill="url(#lg-gold)"/>
  ${ball(0, 268, 43, '#0E1B14')}
</svg>`;
}

module.exports = { emblem, crestShield, fullLogo, ball };
