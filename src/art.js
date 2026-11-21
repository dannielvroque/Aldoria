/* ===== Arte vetorial (SVG): retratos de classe, monstros e arte do menu ===== */
const ART = (() => {
  let uid = 0;
  const svg = (inner, defs, vb) => `<svg class="art" viewBox="${vb || '0 0 64 64'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs ? '<defs>' + defs + '</defs>' : ''}${inner}</svg>`;
  const shade = (hex, k) => { // clareia (k>0) ou escurece (k<0) uma cor #rrggbb
    const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))));
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
  };
  const eyes = (x1, x2, y, r, c) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x1 + r * .3}" cy="${y - r * .3}" r="${r * .3}" fill="#fff" opacity=".85"/><circle cx="${x2 + r * .3}" cy="${y - r * .3}" r="${r * .3}" fill="#fff" opacity=".85"/>`;

  /* ---- classes ---- */
  const CLS = {
    vanguard: () => { const g = 'w' + (++uid);
      return svg(`
      <circle cx="32" cy="32" r="31" fill="url(#${g}b)"/>
      <path d="M10 52 L30 14 L34 18 L16 54Z" fill="#9aa3b5"/><path d="M54 52 L34 14 L30 18 L48 54Z" fill="#b9c1d0"/>
      <rect x="8" y="49" width="14" height="4" rx="2" transform="rotate(-27 15 51)" fill="#d9b45a"/><rect x="42" y="49" width="14" height="4" rx="2" transform="rotate(27 49 51)" fill="#d9b45a"/>
      <path d="M32 6 C24 6 17 12 17 22 L17 40 C17 47 23 52 32 56 C41 52 47 47 47 40 L47 22 C47 12 40 6 32 6Z" fill="url(#${g}h)" stroke="#2a2f3d" stroke-width="1.5"/>
      <path d="M32 6 L32 18" stroke="#2a2f3d" stroke-width="1.2" opacity=".5"/>
      <path d="M32 3 C27 3 25 9 25 13 C29 9 35 9 39 13 C39 9 37 3 32 3Z" fill="#c3302c"/>
      <path d="M19 26 L45 26 L43 34 L38 32 L32 36 L26 32 L21 34Z" fill="#0d0f16"/>
      <path d="M22 28 L30 29" stroke="#ff9a4a" stroke-width="1.4" opacity=".9"/><path d="M42 28 L34 29" stroke="#ff9a4a" stroke-width="1.4" opacity=".9"/>
      <path d="M28 38 H36 M28 42 H36 M28 46 H36" stroke="#2a2f3d" stroke-width="1.2" opacity=".6"/>
      <path d="M19 20 C19 14 25 9 32 9" fill="none" stroke="#fff" stroke-width="1.6" opacity=".35" stroke-linecap="round"/>`,
      `<radialGradient id="${g}b" cx=".35" cy=".3" r="1"><stop offset="0" stop-color="#5a4a78"/><stop offset="1" stop-color="#17121f"/></radialGradient>
       <linearGradient id="${g}h" x1="0" x2="1"><stop offset="0" stop-color="#7d889c"/><stop offset=".5" stop-color="#c7cfdc"/><stop offset="1" stop-color="#6a7488"/></linearGradient>`); },
    arcanist: () => { const g = 'm' + (++uid);
      return svg(`
      <circle cx="32" cy="32" r="31" fill="url(#${g}b)"/>
      <circle cx="32" cy="34" r="22" fill="none" stroke="#a78bff" stroke-width=".8" opacity=".4" stroke-dasharray="2 3"/>
      <path d="M32 2 C34 12 38 18 46 24 L52 34 C42 31 22 31 12 34 L18 24 C26 18 30 12 32 2Z" fill="url(#${g}h)"/>
      <path d="M13 34 C24 38 40 38 51 34 L52 38 C40 42 24 42 12 38Z" fill="#3a2a78"/>
      <rect x="22" y="31" width="20" height="3" fill="#d9b45a"/>
      <ellipse cx="32" cy="46" rx="12" ry="11" fill="#e8c9a8"/>
      <path d="M20 46 C20 56 28 60 32 60 C36 60 44 56 44 46 C42 52 38 54 32 54 C26 54 22 52 20 46Z" fill="#dcdcf0"/>
      <path d="M24 42 H30 M34 42 H40" stroke="#2a1d5a" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="27" cy="44.5" r="1.9" fill="#7ee1ff"/><circle cx="37" cy="44.5" r="1.9" fill="#7ee1ff"/>
      <circle cx="27" cy="44.5" r="3.6" fill="#7ee1ff" opacity=".25"/><circle cx="37" cy="44.5" r="3.6" fill="#7ee1ff" opacity=".25"/>
      <path d="M32 12 L33.2 15 L36.4 15.4 L34 17.5 L34.7 20.6 L32 19 L29.3 20.6 L30 17.5 L27.6 15.4 L30.8 15Z" fill="#ffe27a" opacity=".9"/>`,
      `<radialGradient id="${g}b" cx=".5" cy=".4" r="1"><stop offset="0" stop-color="#3b2d7a"/><stop offset="1" stop-color="#120d24"/></radialGradient>
       <linearGradient id="${g}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4de0"/><stop offset="1" stop-color="#3a2a9a"/></linearGradient>`); },
    huntress: () => { const g = 'h' + (++uid);
      return svg(`
      <circle cx="32" cy="32" r="31" fill="url(#${g}b)"/>
      <path d="M50 6 C60 20 60 44 50 58" fill="none" stroke="#8a5a2c" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 6 L50 58" stroke="#e8e0c8" stroke-width=".8"/>
      <path d="M14 58 C12 40 16 22 32 16 C48 22 52 40 50 58Z" fill="url(#${g}c)"/>
      <path d="M22 58 C22 46 26 40 32 40 C38 40 42 46 42 58Z" fill="#2c4a2e"/>
      <ellipse cx="32" cy="34" rx="10" ry="11" fill="#e3b690"/>
      <path d="M20 34 C20 22 26 16 32 16 C38 16 44 22 44 34 C41 28 38 26 32 26 C26 26 23 28 20 34Z" fill="url(#${g}c)"/>
      <path d="M21 30 C24 25 40 25 43 30 L42 33 C38 29 26 29 22 33Z" fill="#1d3320" opacity=".85"/>
      <circle cx="27.5" cy="35" r="1.7" fill="#2a1a0a"/><circle cx="36.5" cy="35" r="1.7" fill="#2a1a0a"/>
      <circle cx="28" cy="34.5" r=".6" fill="#fff"/><circle cx="37" cy="34.5" r=".6" fill="#fff"/>
      <path d="M29.5 41 Q32 43 34.5 41" fill="none" stroke="#9a4a3a" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M8 44 L46 30" stroke="#d8d2bc" stroke-width="1.4"/><path d="M8 44 L11 40 M8 44 L12 46" stroke="#c3302c" stroke-width="1.6" stroke-linecap="round"/>`,
      `<radialGradient id="${g}b" cx=".4" cy=".3" r="1"><stop offset="0" stop-color="#2c5a3c"/><stop offset="1" stop-color="#0e1a12"/></radialGradient>
       <linearGradient id="${g}c" x1="0" x2="1"><stop offset="0" stop-color="#3f7a45"/><stop offset="1" stop-color="#2a5230"/></linearGradient>`); },
    tamer: () => { const g = 't' + (++uid);
      return svg(`
      <circle cx="32" cy="32" r="31" fill="url(#${g}b)"/>
      <path d="M10 14 L20 26 L18 8Z" fill="#6e7480"/><path d="M54 14 L44 26 L46 8Z" fill="#6e7480"/>
      <path d="M13 12 L20 22 L19 12Z" fill="#c98f8f" opacity=".6"/><path d="M51 12 L44 22 L45 12Z" fill="#c98f8f" opacity=".6"/>
      <path d="M32 54 C18 54 10 42 10 30 C10 20 18 12 32 12 C46 12 54 20 54 30 C54 42 46 54 32 54Z" fill="url(#${g}f)"/>
      <path d="M32 54 C26 54 24 48 24 44 C28 47 36 47 40 44 C40 48 38 54 32 54Z" fill="#e9e6df"/>
      <path d="M22 28 C25 24 29 26 30 31 C26 33 22 32 22 28Z" fill="#ffe27a"/><path d="M42 28 C39 24 35 26 34 31 C38 33 42 32 42 28Z" fill="#ffe27a"/>
      <ellipse cx="26.5" cy="29" rx="1.3" ry="2.6" fill="#1a1208"/><ellipse cx="37.5" cy="29" rx="1.3" ry="2.6" fill="#1a1208"/>
      <path d="M32 33 L28.5 39 L35.5 39Z" fill="#2a2024"/>
      <path d="M27 46 L28.5 50 L30 46Z M34 46 L35.5 50 L37 46Z" fill="#fff"/>
      <path d="M14 46 C20 56 44 56 50 46" fill="none" stroke="#8a5a2c" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="55" r="3.2" fill="#d9b45a" stroke="#7a5a1c" stroke-width=".8"/>`,
      `<radialGradient id="${g}b" cx=".5" cy=".3" r="1"><stop offset="0" stop-color="#5a3f28"/><stop offset="1" stop-color="#1c120a"/></radialGradient>
       <linearGradient id="${g}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d949f"/><stop offset="1" stop-color="#5a606b"/></linearGradient>`); },
  };

  /* ---- monstros: arquétipo + cor ---- */
  const A = {
    blob: c => `<path d="M10 50 C8 30 20 14 32 14 C44 14 56 30 54 50 C48 56 16 56 10 50Z" fill="${c}"/><path d="M16 26 C20 18 28 16 34 17" stroke="#fff" stroke-width="3" opacity=".4" fill="none" stroke-linecap="round"/>${eyes(24, 40, 36, 4, '#10202a')}<path d="M26 45 Q32 49 38 45" stroke="#10202a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    wolf: c => `<path d="M8 10 L22 20 L18 4Z M56 10 L42 20 L46 4Z" fill="${shade(c, -.25)}"/><path d="M32 56 C20 56 10 46 10 34 C10 24 18 16 32 16 C46 16 54 24 54 34 C54 46 44 56 32 56Z" fill="${c}"/><path d="M32 56 C26 56 22 52 22 46 L42 46 C42 52 38 56 32 56Z" fill="${shade(c, .35)}"/><path d="M23 30 L29 33 L22 35Z M41 30 L35 33 L42 35Z" fill="#ffd34a"/><circle cx="32" cy="42" r="3.2" fill="#1a1414"/><path d="M27 48 L28.5 52 L30 48Z M34 48 L35.5 52 L37 48Z" fill="#fff"/>`,
    boar: c => `<path d="M10 22 L20 26 L14 12Z M54 22 L44 26 L50 12Z" fill="${shade(c, -.3)}"/><path d="M32 54 C18 54 10 44 10 34 C10 22 20 16 32 16 C44 16 54 22 54 34 C54 44 46 54 32 54Z" fill="${c}"/><ellipse cx="32" cy="44" rx="12" ry="8" fill="${shade(c, .25)}"/><circle cx="28" cy="44" r="2" fill="#2a1a14"/><circle cx="36" cy="44" r="2" fill="#2a1a14"/><path d="M20 48 C14 50 12 44 14 38 M44 48 C50 50 52 44 50 38" fill="none" stroke="#f4eed8" stroke-width="3.5" stroke-linecap="round"/>${eyes(23, 41, 30, 2.6, '#120a08')}`,
    rat: c => `<circle cx="14" cy="18" r="8" fill="${shade(c, -.2)}"/><circle cx="50" cy="18" r="8" fill="${shade(c, -.2)}"/><circle cx="14" cy="18" r="4.5" fill="#d99a9a"/><circle cx="50" cy="18" r="4.5" fill="#d99a9a"/><path d="M32 56 C18 56 12 46 14 34 C16 22 24 18 32 18 C40 18 48 22 50 34 C52 46 46 56 32 56Z" fill="${c}"/><path d="M32 40 L28 52 L36 52Z" fill="${shade(c, .3)}"/><circle cx="32" cy="42" r="2.6" fill="#d97a8a"/>${eyes(24, 40, 32, 2.6, '#140a0a')}<path d="M29 48 L30 52 M35 48 L34 52" stroke="#fff" stroke-width="2"/><path d="M6 44 L24 44 M6 49 L24 47 M58 44 L40 44 M58 49 L40 47" stroke="#e9e4d8" stroke-width=".8" opacity=".7"/>`,
    hood: c => `<path d="M10 58 C8 34 16 10 32 8 C48 10 56 34 54 58Z" fill="${c}"/><path d="M18 58 C16 38 22 22 32 22 C42 22 48 38 46 58Z" fill="#0c0a10"/><circle cx="26" cy="38" r="2.6" fill="#ff5a3a"/><circle cx="38" cy="38" r="2.6" fill="#ff5a3a"/><circle cx="26" cy="38" r="5.5" fill="#ff5a3a" opacity=".22"/><circle cx="38" cy="38" r="5.5" fill="#ff5a3a" opacity=".22"/><path d="M14 30 C16 18 22 12 32 10" fill="none" stroke="#fff" opacity=".25" stroke-width="2" stroke-linecap="round"/>`,
    gremlin: c => `<path d="M4 20 L22 26 L18 40Z M60 20 L42 26 L46 40Z" fill="${shade(c, -.1)}"/><path d="M8 24 L19 29 L17 36Z M56 24 L45 29 L47 36Z" fill="#e8a0a0" opacity=".7"/><ellipse cx="32" cy="36" rx="17" ry="19" fill="${c}"/><path d="M20 22 C24 16 40 16 44 22 C38 20 26 20 20 22Z" fill="${shade(c, -.3)}"/><ellipse cx="25" cy="32" rx="5.2" ry="6" fill="#fff6a0"/><ellipse cx="39" cy="32" rx="5.2" ry="6" fill="#fff6a0"/><ellipse cx="25.6" cy="33" rx="1.8" ry="4" fill="#1a1208"/><ellipse cx="38.4" cy="33" rx="1.8" ry="4" fill="#1a1208"/><path d="M22 46 Q32 54 42 46 Q32 49 22 46Z" fill="#2a1418"/><path d="M25 47 L26.5 51 L28 48 M36 48 L37.5 51 L39 47" fill="#fff"/><circle cx="32" cy="40" r="1.6" fill="${shade(c, -.35)}"/>`,
    lizard: c => `<path d="M6 46 C14 34 24 38 28 44 C34 50 46 46 58 38 C54 50 42 58 30 56 C18 58 10 54 6 46Z" fill="${shade(c, -.15)}"/><path d="M14 40 C14 28 24 22 34 24 C46 26 52 34 50 44 C44 50 24 52 14 40Z" fill="${c}"/><path d="M20 46 C28 50 40 50 46 44 C40 53 26 54 20 46Z" fill="${shade(c, .4)}"/><path d="M22 24 L25 17 L28 24 M30 22 L33 15 L36 22 M38 24 L41 18 L44 25" fill="${shade(c, -.3)}"/><ellipse cx="22" cy="32" rx="3.4" ry="4" fill="#ffd34a"/><ellipse cx="22.4" cy="32.4" rx="1.1" ry="3" fill="#1a1208"/><circle cx="12" cy="38" r="1.2" fill="#1a1208"/><path d="M12 43 Q18 45 22 42" stroke="#1a1208" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M14 43 L16 46 L18 43" fill="#fff"/>`,
    goblin: c => `<path d="M2 26 L18 24 L16 36Z M62 26 L46 24 L48 36Z" fill="${shade(c, -.1)}"/><ellipse cx="32" cy="34" rx="18" ry="20" fill="${c}"/><path d="M14 22 C20 14 44 14 50 22 C44 20 20 20 14 22Z" fill="${shade(c, -.3)}"/><path d="M20 30 L28 33 L20 36Z M44 30 L36 33 L44 36Z" fill="#fff36a"/><circle cx="24" cy="33" r="1.4" fill="#111"/><circle cx="40" cy="33" r="1.4" fill="#111"/><path d="M24 46 L28 42 L32 46 L36 42 L40 46 L36 50 L28 50Z" fill="#fff"/><path d="M30 36 L32 41 L34 36" fill="none" stroke="${shade(c, -.4)}" stroke-width="1.4"/>`,
    orc: c => `<path d="M10 10 L22 22 L12 30Z M54 10 L42 22 L52 30Z" fill="${shade(c, -.3)}"/><path d="M32 58 C16 58 8 46 8 34 C8 20 18 12 32 12 C46 12 56 20 56 34 C56 46 48 58 32 58Z" fill="${c}"/><path d="M12 24 C24 18 40 18 52 24 L52 28 C40 24 24 24 12 28Z" fill="#3a3330"/><path d="M20 32 L28 35 L20 38Z M44 32 L36 35 L44 38Z" fill="#ffb03a"/><path d="M19 52 L22 42 L26 50Z M45 52 L42 42 L38 50Z" fill="#f4eed8"/><path d="M22 52 Q32 46 42 52" fill="none" stroke="#2a1a14" stroke-width="2"/>`,
    spider: c => `<path d="M2 28 L14 36 M2 40 L14 40 M4 52 L16 44 M62 28 L50 36 M62 40 L50 40 M60 52 L48 44" stroke="${shade(c, -.2)}" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="32" cy="38" rx="17" ry="18" fill="${c}"/><path d="M32 22 L26 34 L32 52 L38 34Z" fill="${shade(c, -.45)}" opacity=".7"/><circle cx="25" cy="30" r="3.2" fill="#ff3a3a"/><circle cx="39" cy="30" r="3.2" fill="#ff3a3a"/><circle cx="29" cy="25" r="2" fill="#ff3a3a"/><circle cx="35" cy="25" r="2" fill="#ff3a3a"/><path d="M26 44 L24 52 M38 44 L40 52" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
    scorp: c => `<path d="M40 54 C58 50 58 24 44 14 C40 12 36 14 38 18" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M38 18 L34 8 L44 14Z" fill="#c3302c"/><path d="M12 22 C4 16 6 8 14 8 M52 22" stroke="${shade(c, -.2)}" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="26" cy="38" rx="16" ry="14" fill="${c}"/><path d="M14 32 C8 28 6 20 12 14 C14 20 18 22 22 24Z" fill="${shade(c, -.15)}"/><circle cx="21" cy="34" r="2.6" fill="#1a0e08"/><circle cx="31" cy="34" r="2.6" fill="#1a0e08"/><path d="M14 42 L8 50 M20 48 L16 56 M32 49 L34 57" stroke="${shade(c, -.25)}" stroke-width="3" stroke-linecap="round"/>`,
    skull: c => `<path d="M32 6 C16 6 10 18 12 30 C13 36 18 38 18 42 L18 50 L46 50 L46 42 C46 38 51 36 52 30 C54 18 48 6 32 6Z" fill="${c}"/><ellipse cx="23" cy="30" rx="6.5" ry="7.5" fill="#150f1c"/><ellipse cx="41" cy="30" rx="6.5" ry="7.5" fill="#150f1c"/><circle cx="23" cy="31" r="2.2" fill="#6fff9a"/><circle cx="41" cy="31" r="2.2" fill="#6fff9a"/><path d="M32 36 L28 44 L36 44Z" fill="#150f1c"/><path d="M24 50 V44 M29 50 V45 M35 50 V45 M40 50 V44" stroke="#150f1c" stroke-width="1.6"/>`,
    golem: c => `<path d="M8 22 L20 8 L44 8 L56 22 L56 50 L44 58 L20 58 L8 50Z" fill="${c}"/><path d="M20 8 L26 22 L8 22Z M44 8 L38 22 L56 22Z" fill="${shade(c, .2)}"/><path d="M14 40 L24 34 L30 44 L22 52Z M44 36 L52 42 L46 52Z" fill="${shade(c, -.2)}"/><path d="M26 22 L28 30 L24 36 M38 22 L36 32" stroke="${shade(c, -.5)}" stroke-width="1.6" fill="none"/><rect x="17" y="28" width="11" height="5" rx="1" fill="#ffb03a"/><rect x="36" y="28" width="11" height="5" rx="1" fill="#ffb03a"/><rect x="17" y="28" width="11" height="5" rx="1" fill="#ffb03a" opacity=".3" transform="scale(1.1) translate(-1.6 -2)"/>`,
    ghost: c => `<path d="M10 56 L10 30 C10 14 20 6 32 6 C44 6 54 14 54 30 L54 56 L47 49 L40 56 L32 49 L24 56 L17 49Z" fill="${c}" opacity=".92"/><ellipse cx="23" cy="28" rx="5" ry="7" fill="#0a0814"/><ellipse cx="41" cy="28" rx="5" ry="7" fill="#0a0814"/><circle cx="23" cy="29" r="1.8" fill="#9ff"/><circle cx="41" cy="29" r="1.8" fill="#9ff"/><ellipse cx="32" cy="42" rx="5" ry="6.5" fill="#0a0814"/><path d="M14 22 C16 14 22 10 28 9" stroke="#fff" opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    elem: c => `<path d="M32 4 C40 16 56 22 54 40 C52 54 42 60 32 60 C22 60 12 54 10 40 C8 22 24 16 32 4Z" fill="${c}"/><path d="M32 18 C37 26 46 30 44 42 C43 50 38 54 32 54 C26 54 21 50 20 42 C18 30 27 26 32 18Z" fill="${shade(c, .45)}" opacity=".75"/><circle cx="26" cy="40" r="2.6" fill="#fff"/><circle cx="38" cy="40" r="2.6" fill="#fff"/><path d="M26 48 Q32 52 38 48" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
    tree: c => `<path d="M32 4 C14 4 4 18 10 30 C6 38 14 44 22 42 L22 60 L42 60 L42 42 C50 44 58 38 54 30 C60 18 50 4 32 4Z" fill="${c}"/><path d="M22 60 L22 44 L42 44 L42 60Z" fill="#5b3b22"/><path d="M26 44 L26 60 M32 44 L32 60 M38 44 L38 60" stroke="#3a2412" stroke-width="1.3" opacity=".6"/><path d="M20 30 L28 33 L20 36Z M44 30 L36 33 L44 36Z" fill="#ffd34a"/><path d="M26 40 Q32 44 38 40" fill="none" stroke="#2a1a0a" stroke-width="2" stroke-linecap="round"/>`,
    yeti: c => `<path d="M32 58 C14 58 6 44 8 30 C10 14 20 6 32 6 C44 6 54 14 56 30 C58 44 50 58 32 58Z" fill="${c}"/><path d="M32 52 C22 52 18 44 18 36 C18 28 24 24 32 24 C40 24 46 28 46 36 C46 44 42 52 32 52Z" fill="#7fb4d8"/><path d="M22 32 L29 34 L22 37Z M42 32 L35 34 L42 37Z" fill="#fff"/><circle cx="25" cy="34.5" r="1.4" fill="#0a1a2a"/><circle cx="39" cy="34.5" r="1.4" fill="#0a1a2a"/><path d="M22 46 L25 40 L28 46 L32 40 L36 46 L39 40 L42 46Z" fill="#fff"/><path d="M12 18 C16 14 20 14 22 18 M42 18 C44 14 48 14 52 18" stroke="#fff" stroke-width="3" opacity=".6" fill="none" stroke-linecap="round"/>`,
    dragon: c => `<path d="M6 6 L22 20 L14 28Z M58 6 L42 20 L50 28Z" fill="${shade(c, -.3)}"/><path d="M2 40 L16 34 L14 46Z M62 40 L48 34 L50 46Z" fill="${shade(c, -.15)}"/><path d="M32 60 C16 60 10 46 12 32 C14 18 22 10 32 10 C42 10 50 18 52 32 C54 46 48 60 32 60Z" fill="${c}"/><path d="M32 12 L36 24 L28 24Z M32 24 L35 34 L29 34Z" fill="${shade(c, -.35)}"/><path d="M18 32 L28 35 L18 38Z M46 32 L36 35 L46 38Z" fill="#ffb02e"/><path d="M18 33 L28 35.4" stroke="#1a0a06" stroke-width="1.6"/><circle cx="27" cy="50" r="2" fill="#1a0a06"/><circle cx="37" cy="50" r="2" fill="#1a0a06"/><path d="M22 56 L25 52 L28 56 M36 56 L39 52 L42 56" fill="#fff"/>`,
    bat: c => `<path d="M2 14 C14 14 22 22 26 34 L20 30 L14 38 L10 30 L2 34Z M62 14 C50 14 42 22 38 34 L44 30 L50 38 L54 30 L62 34Z" fill="${shade(c, -.2)}"/><ellipse cx="32" cy="36" rx="12" ry="14" fill="${c}"/><path d="M22 22 L24 10 L30 20Z M42 22 L40 10 L34 20Z" fill="${c}"/><circle cx="27" cy="34" r="2.4" fill="#ff4a4a"/><circle cx="37" cy="34" r="2.4" fill="#ff4a4a"/><path d="M28 43 L30 47 L32 43 L34 47 L36 43" fill="#fff"/>`,
    generic: c => `<circle cx="32" cy="32" r="22" fill="${c}"/>${eyes(24, 40, 30, 4, '#111')}`,
  };
  /* id do monstro -> [arquétipo, cor] */
  const MOB = {
    boarelite: ['boar', '#5a4a4a'], shadowwolf: ['wolf', '#3a3048'], ancientent: ['tree', '#5a4022'], banditking: ['hood', '#8a2a1a'], pharaoh: ['skull', '#e8c050'], frostwyrm: ['dragon', '#8fd8ff'],
    gremlin: ['gremlin', '#7cc04a'], lizard: ['lizard', '#4aa86a'], slime: ['blob', '#5ec27a'], lavaslime: ['blob', '#e8662a'], boar: ['boar', '#8a6a4a'], wolfm: ['wolf', '#8d949f'], rat: ['rat', '#8b7a68'], bandit: ['hood', '#5a4a3a'],
    spider: ['spider', '#4a3a5a'], goblin: ['goblin', '#7aa84a'], ent: ['tree', '#3f7a3a'], orc: ['orc', '#6a8a4a'],
    skel: ['skull', '#e6dfc8'], golemm: ['golem', '#8a8f98'], wraith: ['ghost', '#8fb0d8'], necro: ['hood', '#3a2a5a'], banshee: ['ghost', '#c8b0e8'],
    scorpion: ['scorp', '#c89a4a'], jackal: ['wolf', '#b8934a'], mummy: ['skull', '#d8c9a0'], sandgolem: ['golem', '#c8a86a'],
    bear: ['boar', '#6a4a30'], polarbear: ['boar', '#e8eef5'], fox: ['wolf', '#d86a2a'], cobra: ['dragon', '#a89a3a'], salamander: ['dragon', '#d8501a'], gargoyle: ['golem', '#8a8a96'],
    yeti: ['yeti', '#e8eef5'], frostwolf: ['wolf', '#cfe3f2'], frostwraith: ['ghost', '#a8e4ff'], icegolem: ['golem', '#8fd0ee'], waterelem: ['elem', '#3a90e8'],
    imp: ['goblin', '#c0402a'], hellhound: ['wolf', '#a03020'], magmagolem: ['golem', '#6a3a30'], fireelem: ['elem', '#ff7a2a'],
    alphawolf: ['wolf', '#5a606b'], queenspider: ['spider', '#7a2a5a'], minotaur: ['boar', '#6a4a3a'], orcwar: ['orc', '#8a3a2a'], hydra: ['dragon', '#4a8a5a'], phoenix: ['elem', '#ffb02e'],
    guardian: ['tree', '#2f6a3a'], colossus: ['golem', '#b8a070'], scorpqueen: ['scorp', '#d8452a'], yetiking: ['yeti', '#bfe0f5'], ignar: ['dragon', '#b22a1a'], lich: ['skull', '#bfe8d8'], demon: ['dragon', '#6a1a3a'],
  };
  const frame = (inner, boss) => { const g = 'f' + (++uid);
    return svg(`<circle cx="32" cy="32" r="31" fill="url(#${g})"/><g transform="translate(6 6) scale(.81)">${inner}</g><circle cx="32" cy="32" r="30.5" fill="none" stroke="${boss ? '#ffd34a' : '#d9b45a'}" stroke-width="${boss ? 2.4 : 1.4}" opacity=".9"/>`,
      `<radialGradient id="${g}" cx=".4" cy=".3" r="1"><stop offset="0" stop-color="${boss ? '#6a4a1a' : '#3a3050'}"/><stop offset="1" stop-color="#120e1a"/></radialGradient>`); };

  const cache = {};
  return {
    cls(id) { const f = CLS[id]; return f ? (cache['c' + id] ||= f()) : ''; },
    mob(id, boss) { const k = 'm' + id + (boss ? 'b' : ''); if (cache[k]) return cache[k];
      const m = MOB[id] || ['generic', '#8a8fa0']; return (cache[k] = frame((A[m[0]] || A.generic)(m[1]), boss)); },
    menu() { /* panorama do menu inicial */
      const stars = Array.from({ length: 46 }, (_, i) => { const x = (i * 97.3) % 1000, y = (i * 53.7) % 260, r = .6 + (i % 4) * .35; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#fff" opacity="${(.35 + (i % 5) * .13).toFixed(2)}"/>`; }).join('');
      return `<svg class="menu-art" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
        <linearGradient id="ms" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0820"/><stop offset=".55" stop-color="#2a1d52"/><stop offset="1" stop-color="#7a4a6a"/></linearGradient>
        <radialGradient id="mm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d8"/><stop offset=".6" stop-color="#ffe9a8"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
        <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1230"/><stop offset="1" stop-color="#07050f"/></linearGradient></defs>
        <rect width="1000" height="600" fill="url(#ms)"/>${stars}
        <circle cx="720" cy="170" r="130" fill="url(#mm)" opacity=".5"/><circle cx="720" cy="170" r="52" fill="#fff4d0"/><circle cx="702" cy="158" r="9" fill="#e6d6a8" opacity=".6"/><circle cx="738" cy="186" r="6" fill="#e6d6a8" opacity=".5"/>
        <path d="M0 400 L90 300 L170 370 L270 250 L380 360 L470 290 L580 390 L690 280 L800 380 L900 310 L1000 370 L1000 600 L0 600Z" fill="#3a2a62" opacity=".75"/>
        <path d="M0 450 L120 360 L220 430 L340 330 L460 440 L560 380 L680 450 L800 360 L920 440 L1000 400 L1000 600 L0 600Z" fill="#241a44"/>
        <g fill="#120c24"><rect x="560" y="330" width="14" height="110"/><rect x="590" y="300" width="16" height="140"/><rect x="620" y="340" width="12" height="100"/><rect x="540" y="372" width="110" height="70"/>
        <path d="M555 330 L567 304 L579 330Z M584 300 L598 268 L612 300Z M615 340 L626 316 L637 340Z"/></g>
        <g fill="#ffd27a" opacity=".85"><rect x="563" y="352" width="3" height="6"/><rect x="596" y="322" width="3" height="7"/><rect x="624" y="360" width="3" height="6"/></g>
        <path d="M0 500 C140 470 260 520 400 495 C540 470 640 515 780 490 C880 472 950 490 1000 480 L1000 600 L0 600Z" fill="url(#mg)"/>
        <g fill="#0a0716"><path d="M60 520 L80 450 L100 520Z M92 530 L116 440 L140 530Z M860 520 L882 450 L904 520Z M900 530 L926 430 L952 530Z M24 540 L44 480 L64 540Z"/></g></svg>`;
    },
  };
})();
