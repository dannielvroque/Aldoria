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

/* ===== Ícones de armadura e acessórios (SVG): formato da peça por classe + textura do material por grau =====
   As texturas (pattern) e gradientes ficam num único <defs> global (ARMART.defs, injetado uma vez no body), então os ícones não repetem ids. */
const ARMART = (() => {
  const OL = '#1a120b';
  // material por classe e grau (mesma ordem de CLS_ARM_MAT): k = textura, b/d/l = base/escuro/claro, t = acabamento (faixas, cintos), m = metal/fio, g = brilho
  const MAT = {
    vanguard: [ // Ferro Velho, Ferro, Aço, Aço Rúnico, Ouro Real, Aço Celeste
      { k: 'rust', b: '#5f5a54', d: '#38332f', l: '#8d857b', t: '#6b4a2e', m: '#8a8076' },
      { k: 'brushed', b: '#7c8089', d: '#4c5058', l: '#b0b4bc', t: '#5a3d26', m: '#cfd4dc' },
      { k: 'brushed', b: '#aeb6c1', d: '#6a7280', l: '#eef2f7', t: '#34456a', m: '#f1f4f8' },
      { k: 'rune', b: '#46566a', d: '#26303c', l: '#8296ae', t: '#1d2836', m: '#86f2ff', g: '#5fe8ff' },
      { k: 'engrave', b: '#d9a93a', d: '#8f6312', l: '#ffe28e', t: '#8a1f22', m: '#fff1b8' },
      { k: 'stars', b: '#cddbef', d: '#8299bd', l: '#ffffff', t: '#4a6fb0', m: '#ffffff', g: '#9fd8ff' }],
    arcanist: [ // Linho, Lã Encantada, Seda, Seda Rúnica, Seda Real, Éter Celeste
      { k: 'weave', b: '#d6c7a1', d: '#9c8a64', l: '#f1e7cb', t: '#86663f', m: '#a9844c' },
      { k: 'knit', b: '#5f5aa8', d: '#37336e', l: '#918ce0', t: '#c9a24a', m: '#e0c07a' },
      { k: 'silk', b: '#3f3a9c', d: '#221e5c', l: '#9a94ff', t: '#d9b45a', m: '#f0d58a' },
      { k: 'silkrune', b: '#245f8a', d: '#133650', l: '#72bcea', t: '#9fe8ff', m: '#d4ecff', g: '#6ff0ff' },
      { k: 'brocade', b: '#efe2b8', d: '#b0924a', l: '#fffae6', t: '#7a1f3a', m: '#d0a030' },
      { k: 'stars', b: '#e0e6ff', d: '#9eabdc', l: '#ffffff', t: '#7584d8', m: '#ffffff', g: '#c8d6ff' }],
    huntress: [ // Couro Cru, Batido, Curtido, Rúnico, Real, Celeste
      { k: 'hide', b: '#b08a5e', d: '#80603a', l: '#d2b285', t: '#664626', m: '#9a958a' },
      { k: 'grain', b: '#8a5a32', d: '#583618', l: '#b07e4e', t: '#3f2a16', m: '#c4bdab' },
      { k: 'grain', b: '#5e3520', d: '#341b0d', l: '#8a5a3c', t: '#26150c', m: '#c9a24a' },
      { k: 'tooled', b: '#3e4a3a', d: '#222b1d', l: '#6c7c5c', t: '#1a2416', m: '#72f2d2', g: '#5fe8c8' },
      { k: 'tooledgold', b: '#7a4524', d: '#4a2810', l: '#aa6b3e', t: '#351a0a', m: '#ffd36a' },
      { k: 'stars', b: '#d6eee2', d: '#97c0ab', l: '#ffffff', t: '#4f9e80', m: '#ffffff', g: '#b8ffe6' }],
    tamer: [ // Peles, Presas, Escamas, Ossos Rúnicos, Peles Reais, Penas Celestes
      { k: 'fur', b: '#8a6a46', d: '#553e25', l: '#bc996c', t: '#4a3420', m: '#ece2c8' },
      { k: 'tusk', b: '#7a5a3a', d: '#4a341d', l: '#a37c54', t: '#3e2a16', m: '#f1e9d3' },
      { k: 'scale', b: '#52804c', d: '#2a4627', l: '#8cc07e', t: '#3a2a1a', m: '#dcd4b4' },
      { k: 'bone', b: '#ddd4bc', d: '#a4987c', l: '#f8f2e2', t: '#5a3a6a', m: '#b06ff0', g: '#c78bff' },
      { k: 'fur', b: '#d9b45a', d: '#94731f', l: '#ffeaa6', t: '#7a1f22', m: '#fff1b8' },
      { k: 'feather', b: '#e6eeff', d: '#97abd6', l: '#ffffff', t: '#6a8ad8', m: '#ffffff', g: '#bfe0ff' }],
  };
  const R = (w, h, f) => `<rect width="${w}" height="${h}" fill="${f}"/>`;
  const glyph = (c, o) => `<path d="M3 3v5l3-2M10 9l3 3-3 3M11 2h3" fill="none" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="${o || .9}"/>`;
  const brushed = c => `<path d="M0 1H16" stroke="${c.l}" stroke-width=".7" opacity=".4"/><path d="M0 3.5H10" stroke="${c.d}" stroke-width=".6" opacity=".45"/><path d="M6 5.2H16" stroke="${c.l}" stroke-width=".5" opacity=".35"/>`;
  const grain = c => `<circle cx="1.5" cy="2" r=".75" fill="${c.d}" opacity=".6"/><circle cx="5" cy="5.5" r=".85" fill="${c.d}" opacity=".5"/><circle cx="5.5" cy="1.5" r=".55" fill="${c.l}" opacity=".45"/><circle cx="2" cy="5.5" r=".45" fill="${c.l}" opacity=".45"/>`;
  const fur = c => `<path d="M1 9q1-4 0-7M4 10q1-5-1-8M7 9q1-4 0-6M9.5 10q-1-4 1-7" fill="none" stroke="${c.d}" stroke-width="1.1" stroke-linecap="round" opacity=".65"/><path d="M2.5 8q1-3 0-5M6 8.5q1-4-1-6" fill="none" stroke="${c.l}" stroke-width=".85" stroke-linecap="round" opacity=".65"/>`;
  // textura de cada material: [largura, altura, conteúdo]
  const TEX = {
    weave: c => [6, 6, R(6, 6, c.b) + `<path d="M0 1.5H6M0 4.5H6" stroke="${c.l}" stroke-width="1.5" opacity=".6"/><path d="M1.5 0V6M4.5 0V6" stroke="${c.d}" stroke-width=".7" opacity=".5"/><path d="M1.5 1V2M4.5 4V5" stroke="${c.l}" stroke-width=".8" opacity=".8"/><path d="M.3 4.5H2.6" stroke="#fff" stroke-width=".7" opacity=".3"/>`], // linho: trama fina de fios claros e escuros
    knit: c => [8, 7, R(8, 7, c.b) + `<path d="M0 0L4 6M8 0L4 6" stroke="${c.l}" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M0 1.2L4 7.2M8 1.2L4 7.2" stroke="${c.d}" stroke-width=".7" opacity=".6"/>`],
    silk: c => [20, 20, R(20, 20, c.b) + `<path d="M-5 25L25-5" stroke="${c.l}" stroke-width="6" opacity=".3"/><path d="M-5 15L15-5M5 25L25 5" stroke="${c.l}" stroke-width="1.2" opacity=".25"/>`],
    silkrune: c => [20, 20, TEX.silk(c)[2] + `<g transform="translate(2 2)">${glyph(c.g)}</g>`],
    brocade: c => [12, 12, R(12, 12, c.b) + `<path d="M6 1L11 6 6 11 1 6Z" fill="none" stroke="${c.m}" stroke-width=".9" opacity=".85"/><circle cx="6" cy="6" r="1.2" fill="${c.m}"/><path d="M-2 14L14-2" stroke="${c.l}" stroke-width="2" opacity=".3"/>`],
    stars: c => [18, 18, R(18, 18, c.b) + `<path d="M-4 22L22-4" stroke="${c.l}" stroke-width="5" opacity=".4"/><g fill="${c.g}"><circle cx="4" cy="5" r=".95"/><circle cx="13" cy="3" r=".6"/><circle cx="10" cy="12" r="1.05"/><circle cx="2" cy="15" r=".6"/><circle cx="16" cy="14" r=".7"/></g><circle cx="10" cy="12" r=".45" fill="#fff"/>`],
    rust: c => [20, 20, R(20, 20, c.b) + `<circle cx="5" cy="6" r="3.6" fill="#8a4a22" opacity=".6"/><circle cx="14" cy="15" r="4.2" fill="#7a3e1c" opacity=".55"/><circle cx="16" cy="4" r="1.7" fill="#a85a28" opacity=".65"/><circle cx="4" cy="16" r="1.3" fill="#a85a28" opacity=".5"/><path d="M2 13L9 10.5M11 7L18 9" stroke="${c.l}" stroke-width=".6" opacity=".5"/>`],
    brushed: c => [16, 6, R(16, 6, c.b) + brushed(c)],
    rune: c => [16, 16, R(16, 16, c.b) + `<path d="M0 4H16M0 11H9" stroke="${c.l}" stroke-width=".5" opacity=".35"/>` + glyph(c.g, .85)],
    engrave: c => [16, 16, R(16, 16, c.b) + `<path d="M1 9q3.5-6 7 0t7 0" fill="none" stroke="${c.d}" stroke-width="1" opacity=".65"/><path d="M1 8q3.5-6 7 0t7 0" fill="none" stroke="${c.l}" stroke-width=".6" opacity=".7"/><circle cx="8" cy="14" r=".9" fill="${c.d}" opacity=".6"/>`],
    hide: c => [22, 22, R(22, 22, c.b) + `<ellipse cx="6" cy="7" rx="5" ry="3.5" fill="${c.l}" opacity=".45"/><ellipse cx="16" cy="16" rx="6" ry="4" fill="${c.d}" opacity=".35"/><ellipse cx="17" cy="5" rx="2.5" ry="2" fill="${c.d}" opacity=".3"/><ellipse cx="5" cy="18" rx="3" ry="2" fill="${c.l}" opacity=".3"/>`],
    grain: c => [7, 7, R(7, 7, c.b) + grain(c)],
    tooled: c => [14, 14, R(14, 14, c.b) + grain(c) + `<path d="M7 1L13 7 7 13 1 7Z" fill="none" stroke="${c.g}" stroke-width=".8" opacity=".75"/>`],
    tooledgold: c => [14, 14, R(14, 14, c.b) + grain(c) + `<path d="M7 1L13 7 7 13 1 7Z" fill="none" stroke="${c.m}" stroke-width=".8" opacity=".8"/><circle cx="7" cy="7" r=".9" fill="${c.m}"/>`],
    fur: c => [10, 10, R(10, 10, c.b) + fur(c)],
    tusk: c => [14, 14, R(14, 14, c.b) + fur(c) + `<path d="M10 3q1.6 5 0 9q-1.3-4.5 0-9Z" fill="${c.m}" stroke="${c.d}" stroke-width=".4"/>`],
    scale: c => [10, 9, R(10, 9, c.d) + `<path d="M-5 4.5a5 5 0 0 1 10 0ZM5 4.5a5 5 0 0 1 10 0Z" fill="${c.b}" stroke="${c.d}" stroke-width=".6"/><path d="M0 9a5 5 0 0 1 10 0Z" fill="${c.b}" stroke="${c.d}" stroke-width=".6"/><path d="M2.4 7.6a3 3 0 0 1 2.8-2.2" fill="none" stroke="${c.l}" stroke-width=".7" opacity=".8"/>`],
    bone: c => [16, 12, R(16, 12, c.b) + `<path d="M0 6H16M8 0V6M3 6V12M13 6V12" stroke="${c.d}" stroke-width=".7" opacity=".7"/><path d="M10 8l2 1.6-2 1.6" fill="none" stroke="${c.g}" stroke-width=".8"/>`],
    feather: c => [12, 10, R(12, 10, c.d) + `<path d="M0-5Q6-1 0 5Q-6-1 0-5ZM12-5Q18-1 12 5Q6-1 12-5Z" fill="${c.b}"/><path d="M6 0Q12 4 6 10Q0 4 6 0Z" fill="${c.b}"/><path d="M6 1V9M0-4V4M12-4V4" stroke="${c.l}" stroke-width=".6"/>`],
  };
  let ready = false;
  function defs() {
    if (ready || typeof document === 'undefined' || !document.body) return; ready = true;
    let h = '';
    for (const cls in MAT) MAT[cls].forEach((c, g) => { const [w, hh, inner] = TEX[c.k](c); h += `<pattern id="am-${cls}-${g}" patternUnits="userSpaceOnUse" width="${w}" height="${hh}">${inner}</pattern>`; });
    const lg = (id, a, b, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
    h += `<linearGradient id="am-sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>`;
    h += lg('am-cu', '#f6b07a', '#b8622e', '#6b3418') + lg('am-ag', '#ffffff', '#b8c0cc', '#5d6571') + lg('am-au', '#fff1b8', '#d9a93a', '#7a4e0c') + lg('am-jade', '#c8f6d4', '#3aa060', '#174a2a') + lg('am-cel', '#ffffff', '#bfe0ff', '#6f98e0') + lg('am-ruby', '#ff9aa8', '#c8203a', '#5a0814') + lg('am-slate', '#6a7686', '#3a4452', '#1c222c');
    document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${h}</defs></svg>`);
  }
  // corpo da peça: textura + volume + contorno
  const B = (d, F) => `<path d="${d}" fill="${F}"/><path d="${d}" fill="url(#am-sh)"/><path d="${d}" fill="none" stroke="${OL}" stroke-width="1.6" stroke-linejoin="round"/>`;
  const S = (d, col, w, x) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${x || ''}/>`;
  const DOT = (pts, r, col) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${OL}" stroke-width=".5"/>`).join('');
  const SEW = (d, col) => S(d, col, .8, ' stroke-dasharray="1.6 1.4" opacity=".85"');
  const DARK = (d, o) => `<path d="${d}" fill="#000" opacity="${o || .28}"/>`;
  const HAND = 'M21 46L19 34Q18 28 21 25L21 13Q21 9 24 9Q27 9 27 13L27 21L28.5 9Q28.5 5 31.5 5Q34.5 5 34.5 9L34.5 21L36.5 10Q36.5 6 39.5 6Q42.5 6 42.5 10L42.5 23L44 15Q44 11 47 11Q50 11 50 15L49.5 34Q49 42 45 46Z';
  const THUMB = 'M22 36Q12 33 9 25Q8 21 12 21.5Q16 24 22 28Z';
  const BOOT = 'M21 5H40L41 34Q49 38 55 44Q59 49 57 54H19L20 34Z';
  const SOLE = `<path d="M18 53H58Q59 58 55 59H18Z" fill="#2a1d12" stroke="${OL}" stroke-width="1.2"/>`;
  const LEGS = 'M18 7H46L46 19L43 58H35L32 25L29 58H21L18 19Z';
  const BELT = (c, y0, y1, x0, x1) => `<path d="M${x0} ${y0}H${x1}V${y1}H${x0}Z" fill="${c.t}" stroke="${OL}" stroke-width="1.1"/>`;
  const CORD = '#ead9b0';
  const SH = {
    vanguard: {
      a: (F, c) => B('M19 13L26 10Q32 15 38 10L45 13L47 28L46 50Q32 58 18 50L17 28Z', F) + S('M32 16V53', c.l, 1.6, ' opacity=".8"') + S('M18 37Q32 43 46 37M18 45Q32 51 46 45', OL, 1.1, ' opacity=".75"') + S('M24 11Q32 19 40 11', c.m, 2)
        + B('M7 23Q8 11 22 11Q26 12 26 16L23 27Q14 30 7 23Z', F) + B('M57 23Q56 11 42 11Q38 12 38 16L41 27Q50 30 57 23Z', F) + DOT([[13, 20], [19, 16.5], [51, 20], [45, 16.5]], 1.3, c.m),
      h: (F, c) => B('M15 36Q14 9 32 7Q50 9 49 36L48 50Q32 59 16 50Z', F) + `<path d="M19 28H45L44 33H20Z" fill="#0d0907"/>` + S('M27 39V47M32 38V49M37 39V47', '#0d0907', 1.7) + S('M32 8V27', c.l, 1.5, ' opacity=".8"')
        + `<path d="M29 9Q31 0 41 3Q35 4 35 10Z" fill="${c.t}" stroke="${OL}" stroke-width="1"/>` + DOT([[18, 41], [46, 41]], 1.3, c.m),
      l: (F, c) => B('M17 7H47L48 19L45 58H35L32 25L29 58H19L16 19Z', F) + BELT(c, 7, 12, 17, 47) + `<rect x="29.5" y="7.5" width="5" height="4" fill="none" stroke="${c.m}" stroke-width="1.2"/>`
        + `<ellipse cx="24" cy="37" rx="5" ry="4.2" fill="${c.l}" opacity=".45" stroke="${OL}" stroke-width="1.1"/><ellipse cx="40" cy="37" rx="5" ry="4.2" fill="${c.l}" opacity=".45" stroke="${OL}" stroke-width="1.1"/>` + S('M20 47H29M35 47H44M18 24H29.5M34.5 24H46', OL, .8, ' opacity=".7"'),
      g: (F, c) => B(THUMB, F) + B(HAND, F) + S('M20.5 17H26.5M28.5 14H34.5M36.5 15H42.5M44.5 20H49.5M21 26H49', OL, .9, ' opacity=".8"') + B('M14 44H50L53 60H11Z', F) + S('M13 50H51', c.m, 1.6) + DOT([[18, 55], [32, 55], [46, 55]], 1.2, c.m),
      b: (F, c) => B(BOOT, F) + SOLE + S('M20 16H41M20 25H41', OL, .9, ' opacity=".75"') + S('M42 39Q45 44 44 53M48 42Q51 47 50 53', OL, .9, ' opacity=".75"') + B('M18 3H43V9H18Z', F) + DOT([[23, 31], [38, 31]], 1.2, c.m),
    },
    arcanist: {
      a: (F, c) => B('M24 8Q32 12 40 8L47 12L60 34L52 38L46 29L49 58H15L18 29L12 38L4 34L17 12Z', F) + `<path d="M23 8Q32 22 41 8Q32 13 23 8Z" fill="${c.d}" stroke="${OL}" stroke-width="1"/>` + S('M32 19V58', c.d, 1.3)
        + `<path d="M18 33Q32 38 46 33L46.5 38Q32 43 17.5 38Z" fill="${c.t}" stroke="${OL}" stroke-width="1"/>` + S('M15.5 54.5H48.5', c.t, 2.6) + S('M5.5 33L12 36.6M58.5 33L52 36.6', c.t, 2.8) + SEW('M22 44V54M42 44V54', c.d),
      h: (F, c) => B('M18 45Q21 31 29 19Q35 7 50 5Q41 12 39 22Q42 33 46 45Q32 48 18 45Z', F) + B('M3 46Q32 58 61 46Q32 38 3 46Z', F) + `<path d="M18.5 42Q32 46 45.5 42L46 45.5Q32 49.5 18 45.5Z" fill="${c.t}" stroke="${OL}" stroke-width="1"/>`
        + `<path d="M32 40.4l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.2-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z" fill="${c.m}" stroke="${OL}" stroke-width=".5"/>` + SEW('M27 38Q31 26 37 18', c.d),
      l: (F, c) => B('M16 6H48L52 56Q46 59 38 56L32 23L26 56Q18 59 12 56Z', F) + BELT(c, 6, 11, 15.6, 48.4) + S('M30 11L28 17M34 11L36 17', c.m, 1.1) + S('M22 20Q21 35 19 50M42 20Q43 35 45 50', c.d, .9, ' opacity=".7"') + S('M12.8 53.4Q19 56 25.6 53.4M38.4 53.4Q45 56 51.2 53.4', c.t, 2.4),
      g: (F, c) => B(THUMB, F) + B(HAND, F) + SEW('M24.5 11V23M31.5 7V22M39.5 8V23M47 13V30', c.d) + B('M18 43H49L50 58H17Z', F) + S('M17.5 47H49.5', c.t, 2.6) + S('M17.2 54H49.8', c.t, 1.4),
      b: (F, c) => B('M27 6H43L44 40H26Z', F) + S('M26.5 14L43.5 10M26.5 22L43.5 18M26.5 30L43.5 26M26.5 38L43.5 34', c.t, 1.6) + `<path d="M8 51Q34 45 59 49Q61 53 58 56Q34 60 9 57Q6 54 8 51Z" fill="#6a4a2e" stroke="${OL}" stroke-width="1.4"/>`
        + S('M14 50Q22 41 31 48M30 48Q38 38 46 46M24 41Q34 37 44 40', OL, 4.4) + S('M14 50Q22 41 31 48M30 48Q38 38 46 46M24 41Q34 37 44 40', F, 2.8),
    },
    huntress: {
      a: (F, c) => B('M20 10L27 8Q32 14 37 8L44 10L48 22L46 26L46 52Q32 56 18 52L18 26L16 22Z', F) + SEW('M21 13L19.5 25L20.5 49.5Q32 53 43.5 49.5L44.5 25L43 13', c.l) + S('M32 14V33', OL, .9)
        + S('M30 15L34 18L30 21L34 24L30 27L34 30', CORD, 1.1) + S('M41 10L24 39', OL, 4.2) + S('M41 10L24 39', c.t, 2.8) + BELT(c, 39, 45, 18, 46) + `<rect x="29" y="38.4" width="6" height="7.2" rx="1" fill="none" stroke="${c.m}" stroke-width="1.4"/>`,
      h: (F, c) => B('M32 3Q38 8 46 14Q54 26 52 44L51 50H13L12 44Q10 26 18 14Q26 8 32 3Z', F) + `<path d="M32 22Q42 24 42 35Q41 45 32 47Q23 45 22 35Q22 24 32 22Z" fill="#1e140d"/>` + S('M24 30Q32 23 40 30', '#000', 3, ' opacity=".45"')
        + S('M32 22Q42 24 42 35Q41 45 32 47Q23 45 22 35Q22 24 32 22Z', c.l, 1.2, ' opacity=".6"') + SEW('M32 5V21', c.l) + B('M9 50Q32 42 55 50L57 60H7Z', F) + DARK('M9 50Q32 42 55 50L57 60H7Z', .2) + SEW('M10 55Q32 48 56 55', c.l),
      l: (F, c) => B(LEGS, F) + BELT(c, 7, 12, 18, 46) + `<rect x="20.5" y="32" width="8" height="9" rx="2" fill="${c.d}" opacity=".6"/><rect x="35.5" y="32" width="8" height="9" rx="2" fill="${c.d}" opacity=".6"/>`
        + SEW('M21 33H28M21 40H28M36 33H43M36 40H43', c.l) + S('M18.5 21H29.5', c.t, 2.4) + SEW('M24.5 13V31M39.5 13V31', c.d),
      g: (F, c) => B(THUMB, F) + B(HAND, F) + SEW('M21.5 26Q35 29 49 26', c.l) + B('M17 41H49L50 60H16Z', F) + S('M27 45L37 49M37 45L27 49M27 51L37 55M37 51L27 55', CORD, 1.1) + DOT([[27, 45], [37, 45], [27, 51], [37, 51]], .9, c.m),
      b: (F, c) => B(BOOT, F) + SOLE + B('M18 3H43L42.5 12H18.5Z', F) + DARK('M18 3H43L42.5 12H18.5Z', .3) + S('M37 15L40.5 18L37 21L40.5 24L37 27L40.5 30', CORD, 1.1) + SEW('M22 13V52', c.l),
    },
    tamer: {
      a: (F, c) => B('M18 12L27 10L31 24L31 55H18Q16 40 18 27L12 22Z', F) + B('M46 12L37 10L33 24L33 55H46Q48 40 46 27L52 22Z', F)
        + B('M13 22L19 9L22 14L25 8L28 14L32 10L36 14L39 8L42 14L45 9L51 22L44 20L38 25L32 21L26 25L20 20Z', F) + DARK('M13 22L19 9L22 14L25 8L28 14L32 10L36 14L39 8L42 14L45 9L51 22L44 20L38 25L32 21L26 25L20 20Z', .22)
        + S('M24 27Q32 36 40 27', c.t, 1.2) + `<path d="M27 31l1 4.4 1-4.4ZM31.5 33l1 4.8 1-4.8ZM36 31l1 4.4 1-4.4Z" fill="${c.m}" stroke="${OL}" stroke-width=".5"/>` + S('M30 42L34 45M30 48L34 51', c.t, 1.4),
      h: (F, c) => [-60, -36, -12, 12, 36, 60].map(a => `<g transform="translate(32 46) rotate(${a})"><path d="M0 0Q-6-16 0-34Q6-16 0 0Z" fill="${F}" stroke="${OL}" stroke-width="1.1"/><path d="M0-2V-30" stroke="${c.d}" stroke-width=".8"/><path d="M0-25Q-4-29.5 0-34Q4-29.5 0-25Z" fill="${c.t}"/></g>`).join('')
        + B('M9 44Q32 52 55 44L55 52Q32 60 9 52Z', F) + DOT([[16, 49.6], [24, 51.6], [32, 52.4], [40, 51.6], [48, 49.6]], 1.6, c.m),
      l: (F, c) => B(LEGS, F) + BELT(c, 7, 12, 18, 46) + S('M19 30L29.5 34M19 36L29.5 40M34.5 34L45 30M34.5 40L45 36', c.t, 1.8)
        + B('M20.4 51l2-3 2 3 2-3 2 3 1.6-2.4L29.2 59H20.6Z', F) + B('M34.8 51l2-3 2 3 2-3 2 3 1.6-2.4L43.4 59H34.8Z', F),
      g: (F, c) => B('M18 10Q32 4 46 10L48 54Q32 60 16 54Z', F) + S('M17 22Q32 27 47 22M16.6 40Q32 45 47.4 40', OL, 4.4) + S('M17 22Q32 27 47 22M16.6 40Q32 45 47.4 40', c.t, 3)
        + `<path d="M46 15L57 11L48 22ZM47 28L59 26L48 34ZM47.5 43L58 45L48 48Z" fill="${c.m}" stroke="${OL}" stroke-width="1"/>`,
      b: (F, c) => B(BOOT, F) + SOLE + S('M20 27L41 31M20 34L41 38', c.t, 2) + B('M15 8Q30 0 46 8L46 19Q30 13 15 19Z', F) + DARK('M15 8Q30 0 46 8L46 19Q30 13 15 19Z', .18),
    },
  };
  // acessórios pelo grau (ACC_NAMES): anel de cobre, amuleto de prata, brinco de jade, colar rúnico, anel real, amuleto celeste
  const ACC = [
    () => `<ellipse cx="32" cy="38" rx="17" ry="14" fill="none" stroke="${OL}" stroke-width="8.6"/><ellipse cx="32" cy="38" rx="17" ry="14" fill="none" stroke="url(#am-cu)" stroke-width="6.4"/><path d="M19 32Q24 26 32 25" fill="none" stroke="#ffd2a8" stroke-width="1.4" opacity=".8"/>`,
    () => S('M13 4Q32 36 51 4', OL, 2.8) + S('M13 4Q32 36 51 4', '#d0d6de', 1.6, ' stroke-dasharray="2.2 1.2"') + `<ellipse cx="32" cy="43" rx="11.5" ry="13.5" fill="url(#am-ag)" stroke="${OL}" stroke-width="1.6"/><path d="M35 35a8 8 0 1 0 0 16a6 6 0 1 1 0-16Z" fill="#6d7581" opacity=".8"/>`,
    () => S('M32 4q9 0 7 9q-2 6-7 6', OL, 3.4) + S('M32 4q9 0 7 9q-2 6-7 6', '#e8c060', 2) + `<path d="M32 20Q45 38 32 59Q19 38 32 20Z" fill="url(#am-jade)" stroke="${OL}" stroke-width="1.6"/><path d="M28 32Q26 40 28 46" stroke="#e8fff0" stroke-width="1.6" fill="none" opacity=".75"/>`,
    () => S('M8 6Q32 40 56 6', OL, 2.8) + S('M8 6Q32 40 56 6', '#8a929e', 1.6) + [[18, 26, 6], [32, 38, 8.5], [46, 26, 6]].map(([x, y, r]) => `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" rx="${r * .4}" fill="url(#am-slate)" stroke="${OL}" stroke-width="1.3"/><path d="M${x - r * .35} ${y - r * .5}v${r}l${r * .5}-${r * .4}" fill="none" stroke="#7ff0ff" stroke-width="1.3" stroke-linecap="round"/>`).join(''),
    () => `<ellipse cx="32" cy="43" rx="15" ry="12" fill="none" stroke="${OL}" stroke-width="8"/><ellipse cx="32" cy="43" rx="15" ry="12" fill="none" stroke="url(#am-au)" stroke-width="5.8"/><path d="M24 28H40L37 34H27Z" fill="url(#am-au)" stroke="${OL}" stroke-width="1.2"/>`
      + `<path d="M32 9L43 18L38.5 29H25.5L21 18Z" fill="url(#am-ruby)" stroke="${OL}" stroke-width="1.4"/><path d="M21 18H43M32 9L27 18 32 29 37 18Z" fill="none" stroke="#ffc0c8" stroke-width=".8" opacity=".75"/>`,
    () => S('M12 4Q32 32 52 4', OL, 2.8) + S('M12 4Q32 32 52 4', '#e6f0ff', 1.6) + `<circle cx="32" cy="40" r="15" fill="#bfe0ff" opacity=".25"/><path d="M32 21L35 34L47 37L35 40L32 55L29 40L17 37L29 34Z" fill="url(#am-cel)" stroke="${OL}" stroke-width="1.4"/><circle cx="32" cy="37" r="2.6" fill="#fff"/>`,
  ];
  const cache = {};
  const svg = (inner, glow) => `<svg class="aic" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${glow ? ` style="filter:drop-shadow(0 0 2.5px ${glow})"` : ''}>${inner}</svg>`;
  /* ícone de um item de armadura/acessório ({ slot, cls, grade }); devolve '' para armas e espaços desconhecidos */
  function icon(it) {
    if (!it) return '';
    const g = Math.max(0, Math.min(5, it.grade | 0));
    if (it.slot === 'c') { defs(); return cache['c' + g] || (cache['c' + g] = svg(ACC[g](), g === 5 ? '#bfe0ff' : g === 3 ? '#5fe8ff' : '')); }
    if (!ARM_SHARE[it.slot]) return '';
    const cls = MAT[it.cls] ? it.cls : g === 0 ? 'arcanist' : g === 1 ? 'huntress' : 'vanguard'; // itens antigos sem classe: pano, couro, depois metal
    const key = cls + it.slot + g;
    defs();
    if (cache[key]) return cache[key];
    const c = MAT[cls][g];
    return (cache[key] = svg(SH[cls][it.slot](`url(#am-${cls}-${g})`, c), g >= 3 && c.g ? c.g : ''));
  }
  return { icon, defs, MAT };
})();
