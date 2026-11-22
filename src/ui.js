/* ===== Interface (HUD, menus, painéis, diálogos) — ver CONTRACT.md ===== */
const UI = (() => {
  let root, ctx, W = 1280, H = 720, lastHeavy = 0, mmDpr = 1;
  const E = {};                       // referências de DOM em cache
  const st = { menu: false, death: false, panel: null, npc: null, msg: null, confirmDel: false, hasSave: false };
  const MM = 150;                     // tamanho do minimapa (px CSS)
  const ZCOL = { town: '#8d7c52', field: '#4d7a3a', forest: '#2c5a44', ruins: '#5b4a70', oasis: '#a08a55', dunes: '#c49a52', frostv: '#8a97ab', tundra: '#b9cbe0', forge: '#5a4748', ashlands: '#3a2424' };
  const NPC_IC = { enc: '❗', quest: '🔮', shop: '💰', smith: '⚒️', jewel: '💎', portal: '🌀', story: '📖', trainer: '📚', bank: '🗝️', armor: '🧵', weapon: '🗡️', stable: '🐴' };
  const STORY_IDLE = { roderic: 'Mantenha a espada afiada. Aldoria conta com você.', selene: 'Os livros antigos guardam mais segredos do que as pessoas imaginam.', elric: 'Cuidado com as teias negras. A floresta não perdoa descuidos.' };
  const NPC_HI = {
    quest: 'Que os ventos de Aldoria guiem seus passos, viajante.',
    shop: 'Preços justos para aventureiros de bom gosto!',
    smith: 'Traga o metal, que eu trago o fogo.',
    jewel: 'Uma pedra bem engastada vale mais que mil golpes. Mas nem toda pedra aceita o metal.',
    portal: 'As runas do portal brilham. Para onde deseja ir?',
    trainer: 'Toda técnica começa com disciplina. O que deseja aprender?',
    bank: 'O que você guardar aqui, todos os heróis da sua conta podem retirar em qualquer vila.',
    armor: 'Roupas e armaduras simples, bem costuradas e a preço justo.',
    weapon: 'Lâminas, arcos e cajados. Nada encantado, mas tudo afiado.',
    stable: 'Montaria bem alimentada corre o dobro. Quantas rações vai querer?',
  };
  const WIC = { vanguard: '🗡️', arcanist: '🔮', huntress: '🏹', tamer: '🪄' };
  const SLOT_IC = cls => { const A = s => ARMART.icon({ slot: s, cls, grade: 0 }); return { w: WIC[cls] || '🗡️', h: A('h'), a: A('a'), l: A('l'), g: A('g'), b: A('b'), c: A('c') }; }; // espaço vazio: a peça da classe desenhada (esmaecida pelo .dim)
  const WT_IC = { sword: '🗡️', daggers: '🔪', axe: '🪓', staff: '🪄', wand: '✨', orb: '🔮', tome: '📕', bow: '🏹', longbow: '🏹', compbow: '🏹', crossbow: '🎯', scepter: '🔱', totem: '🗿' };
  const iconOf = (it, ic) => it.slot === 'w' && it.wt && WT_IC[it.wt] ? WT_IC[it.wt] : ARMART.icon(it) || ic[it.slot]; // armadura e acessório: desenho do material (art.js)
  const BAG = 24;

  const now = () => performance.now();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('pt-BR');
  const pc = v => (v * 100).toFixed(1).replace(/\.0$/, '') + '%';

  /* setters que só tocam o DOM quando o valor muda */
  const WX_IC = (() => {
    const s = (b) => '<svg class="wx" viewBox="0 0 24 24" width="15" height="15">' + b + '</svg>', cl = '<path d="M7 17h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.6A3.3 3.3 0 0 0 7 17z" fill="#cfd8e6"/>';
    return {
      sun: s('<circle cx="12" cy="12" r="4.6" fill="#ffd25a"/><g stroke="#ffd25a" stroke-width="2" stroke-linecap="round">' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return '<line x1="' + (12 + Math.cos(r) * 7.2).toFixed(1) + '" y1="' + (12 + Math.sin(r) * 7.2).toFixed(1) + '" x2="' + (12 + Math.cos(r) * 9.6).toFixed(1) + '" y2="' + (12 + Math.sin(r) * 9.6).toFixed(1) + '"/>'; }).join('') + '</g>'),
      moon: s('<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5z" fill="#f2e6b8"/>'),
      rain: s(cl.replace('M7 17', 'M7 14').replace('a4 4 0 0 0 0-8', 'a4 4 0 0 0 0-8').replace('A3.3 3.3 0 0 0 7 17z', 'A3.3 3.3 0 0 0 7 14z') + '<g stroke="#6fb4ff" stroke-width="1.8" stroke-linecap="round"><line x1="8" y1="17" x2="7" y2="21"/><line x1="12" y1="17" x2="11" y2="21"/><line x1="16" y1="17" x2="15" y2="21"/></g>'),
      storm: s(cl.replace('#cfd8e6', '#9aa6b8') + '<path d="M12.5 14l-3 5h2.5l-1.5 4 4.5-6h-2.6l1.6-3z" fill="#ffd84a"/>'),
      fog: s('<g stroke="#d4dbe6" stroke-width="2" stroke-linecap="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="2" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="22" y2="16"/><line x1="3" y1="20" x2="17" y2="20"/></g>'),
    };
  })();
  const setText = (e, v) => { v = String(v); if (e._t !== v) { e._t = v; e.textContent = v; } };
  const setW = (e, p) => { p = Math.max(0, Math.min(100, p)).toFixed(1) + '%'; if (e._w !== p) { e._w = p; e.style.width = p; } };
  const setH = (e, p) => { p = Math.max(0, Math.min(100, p)).toFixed(1) + '%'; if (e._hh !== p) { e._hh = p; e.style.height = p; } };
  const setCls = (e, c, on) => { on = !!on; const k = '_c' + c; if (e[k] !== on) { e[k] = on; e.classList.toggle(c, on); } };
  const setVis = (e, on) => setCls(e, 'off', !on);
  const setAttr = (e, a, v) => { const k = '_a' + a; if (e[k] !== v) { e[k] = v; e.setAttribute(a, v); } };
  const setBody = (e, html) => {      // reescreve só se mudou; preserva rolagem
    if (e._h === html) return;
    const s = e.scrollTop; e._h = html; e.innerHTML = html; e.scrollTop = s;
  };
  const shield = el => ['mousedown', 'mouseup', 'wheel', 'contextmenu', 'pointerdown'].forEach(t =>
    el.addEventListener(t, ev => ev.stopPropagation()));

  /* ---------- itens ---------- */
  function istats(it) {
    const o = []; // mesmos valores que o recalc soma (itemVal: % do refino + bônus fixo por "+")
    if (it.atk != null) o.push(['Ataque', 'Atq', Math.round(itemVal(it, 'atk'))]);
    if (it.def != null) o.push(['Defesa', 'Def', Math.round(itemVal(it, 'def'))]);
    if (it.hp != null) o.push(['Vida', 'Vida', Math.round(itemVal(it, 'hp'))]);
    if (it.spd != null) o.push(['Velocidade', 'Vel', +(it.spd * 100).toFixed(1), '%']);
    if (it.crit != null) o.push(['Crítico', 'Crít', +(it.crit * 100).toFixed(1), '%']);
    if (it.dodge != null) o.push(['Esquiva', 'Esq', +(it.dodge * 100).toFixed(1), '%']);
    if (it.mp != null) o.push(['Mana', 'Mana', Math.round(itemVal(it, 'mp'))]);
    return o;
  }
  const istr = it => istats(it).map(s => `${s[1]} ${s[2]}${s[3] || ''}`).join(' · ') + (it.adds && it.adds.length ? ' · ✦ ' + it.adds.map(addShort).join(' · ') : '');
  const rcol = it => RARITY[it.rar].c;
  function cmpDelta(it, eq) {          // diferença do 1º atributo em relação ao equipado
    if (!eq) return null;
    const a = istats(it), b = istats(eq);
    return a.length ? a[0][2] - ((b.find(x => x[0] === a[0][0]) || [0, 0, 0])[2]) : null;
  }
  const DLV = L => dispLv(L, G.player ? G.player.tier : 0), ELV = () => effLv(G.player.lvl, G.player.tier); // nível do conteúdo na escala da fase / nível efetivo do jogador
  const noUse = it => { const p = G.player; return !!p && ((it.cls && it.cls !== p.cls) || (it.tierReq | 0) > p.tier || effLv(p.lvl, p.tier) < itemReqLvl(it, p.tier)); }; // ainda não dá para equipar
  function itemTip(it, eq, equipped) {
    const L = [`${itemName(it)} (${RARITY[it.rar].n})`, `${SLOTS[it.slot]} · Nv ${dispLv(it.lvl, it.tierReq | 0)}`, `Fase: ${TIERS[it.tierReq | 0]}${(it.tierReq | 0) > ((G.player && G.player.tier) | 0) ? ' (não pode equipar)' : ''}`];
    if (it.cls && CLASSES[it.cls]) L.push(`Classe: ${CLASSES[it.cls].name}${G.player && it.cls !== G.player.cls ? ' (não pode equipar)' : ''}`);
    { const rq = itemReqLvl(it, G.player ? G.player.tier : 0); if (G.player && ELV() < rq) L.push(`Requer nível ${dispLv(rq, it.tierReq | 0)} (você: ${G.player.lvl}) (não pode equipar)`); }
    const e = eq ? istats(eq) : [];
    istats(it).forEach(s => {
      let line = `${s[0]} ${s[2]}${s[3] || ''}`;
      if (!equipped) {
        const o = e.find(x => x[0] === s[0]), d = +(s[2] - (o ? o[2] : 0)).toFixed(1);
        line += d ? `  (${d > 0 ? '+' : ''}${d}${s[3] || ''})` : '  (=)';
      }
      L.push(line);
    });
    if (it.adds && it.adds.length) { L.push(`Adicionais (${it.adds.length}/${ADD_MAX}):`); for (const a of it.adds) L.push('  ✦ ' + addTxt(a)); }
    if (!equipped && !eq) L.push('Nada equipado neste espaço.');
    if (!equipped && eq) L.push(`Comparado a: ${itemName(eq)}`);
    L.push(`Valor de venda: ${itemValue(it)} ouro`);
    L.push(equipped ? 'Clique para desequipar · botão direito: opções' : (st.side === 'smith' || st.side === 'jewel') ? 'Clique para escolher · botão direito: opções' : 'Clique para pegar e mover · Shift+clique: equipar · botão direito: opções');
    return L.join('\n');
  }

  /* ---------- construção do DOM ---------- */
  function build() {
    root.innerHTML = `
<div class="hud">
  <div class="evbar off"></div>
  <div class="pf glass">
    <div class="pf-ic"></div>
    <div class="pf-main">
      <div class="pf-top"><b class="pf-name"></b><span class="pf-tier"></span><span class="pf-lv"></span></div>
      <div class="bar hp"><i></i><span></span></div>
      <div class="bar mp"><i></i><span></span></div>
      <div class="bar xp" title="Experiência"><i></i></div>
      <div class="pf-gold"></div>
    </div>
  </div>
  <div class="tf glass off">
    <div class="tf-top"><span class="tf-ic"></span><b class="tf-name"></b><span class="tf-lv"></span></div>
    <div class="bar hp"><i></i><span></span></div>
  </div>
  <div class="tr">
    <div class="mm"${TX('', ' data-a="p-map" title="Abrir o mapa"')}><canvas width="${MM}" height="${MM}"></canvas></div>
    <div class="zone"></div>
    <div class="fabrow"><button data-a="obj" class="tobj" title="O que fazer agora">❗</button><button data-a="fab" class="fab" title="Menu">☰</button></div>
    <div class="btns">
      <button data-a="p-inv" title="Inventário [I]">🎒</button>
      <button data-a="p-quest" title="Missões [Q]">📜</button>
      <button data-a="p-char" title="Personagem [C]">👤</button>
      <button data-a="p-lv" title="Níveis e regiões [B]">📊</button>
      <button data-a="p-look" title="Montarias [H]">🐎</button>
      <button data-a="p-auto" title="Automático [T]">🤖</button>
      <button data-a="mute" title="Som [N]">🔊</button>
      <button data-a="pause" title="Menu / Pausa [Esc]">${TX('☰', '⏸')}</button>
    </div>
    <div class="qt glass off"><div class="qt-h">Missão</div><div class="qt-n"></div><div class="qt-p"></div></div>
  </div>
  <div class="objpop glass off"></div>
  <div class="auto-badge off" data-a="p-auto" title="Modo automático ativo [T] · Z liga/desliga o combate automático"></div>
  <div class="sb"></div>
  <div class="log"></div>
  <div class="qarrow off"><svg class="qa-ar" viewBox="-20 -20 40 40" width="44" height="44"><path d="M17 0L-9 -13L-3 0L-9 13Z"/></svg><b class="qa-d"></b></div>
  <div class="labels"></div>
  <div class="floats"></div>
  <div class="joy"><i></i></div>
  <div class="tacts">
    <button class="tact big" data-k="Space" title="Atacar">⚔️</button>
    <button class="tact" data-k="Tab" title="Trocar alvo">🎯</button>
    <button class="tact" data-k="KeyF" title="Falar">💬</button>
    <button class="tact" data-k="KeyZ" title="Automático">🤖</button>
    <button class="tact" data-k="KeyX" title="Montar">🏇</button>
  </div>
  <button class="tfs" title="Tela cheia">⛶</button>
</div>
<div class="toast"></div>
<div class="evtoast"><b></b><small></small></div>
<div class="banner"></div>
<div class="panel off" id="p-inv"><div class="ph"><h2>🎒 Inventário</h2><kbd>I</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div></div>
<div class="panel off" id="p-char"><div class="ph"><h2>👤 Personagem</h2><kbd>C</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div></div>
<div class="panel off" id="p-quest"><div class="ph"><h2>📜 Missões</h2><kbd>Q</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div></div>
<div class="panel off" id="p-look"><div class="ph"><h2>🐎 Montarias</h2><kbd>H</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div></div>
<div class="panel off" id="p-pause"><div class="ph"><h2>⏸ Pausa</h2><kbd>Esc</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div></div>
<div class="panel off" id="p-auto"><div class="ph"><h2>🤖 Automático</h2><kbd>T</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div></div>
<div class="panel lv off" id="p-lv"><div class="ph"><h2>📊 Níveis e Regiões</h2><kbd>B</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div></div>
<div class="panel tree off" id="p-tree"><div class="ph"><h2>🌳 Árvore de Habilidades</h2><kbd>V</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div></div>
<div class="panel map off" id="p-map"><div class="ph"><h2>🗺️ Mapa de Aldoria</h2><kbd>M</kbd><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"><div class="map-w"><div class="map-cw"><canvas class="map-c" width="1520" height="1040"></canvas><div class="map-zb"><button data-a="mapz" data-d="in" title="Aproximar">+</button><button data-a="mapz" data-d="out" title="Afastar">−</button><button data-a="mapme" title="Centralizar em mim">◎</button><button data-a="maplg" class="maplg" title="Legenda">?</button></div><div class="map-gps off"></div></div><div class="map-side"></div></div></div></div>
<div class="panel dlg off" id="p-dlg"><div class="ph"><div class="npc-ic"></div><div class="npc-id"><h2></h2><small></small></div><button class="x" data-a="close" title="Fechar [Esc]">✕</button></div><div class="pb"></div><div class="pf-foot"><button class="btn" data-a="close">Despedir-se</button></div></div>
<div class="death off"><div class="death-in"><h1>Você caiu</h1><p>Suas forças se esvaem... mas Aldoria ainda precisa de você.</p><button class="btn primary" data-a="respawn">Voltar à vila</button></div></div>
<div class="menu off"></div>
<div class="create off"></div>`;
    ['pf', 'tf', 'tr', 'sb', 'log', 'labels', 'floats', 'toast', 'banner', 'death', 'menu', 'create'].forEach(k => E[k] = root.querySelector('.' + k));
    ['inv', 'char', 'quest', 'auto', 'look', 'pause', 'dlg', 'map', 'tree', 'lv'].forEach(k => { E['p_' + k] = root.querySelector('#p-' + k); E['b_' + k] = E['p_' + k].querySelector('.pb'); });
    const q = (s, r) => (r || root).querySelector(s);
    E.pfIc = q('.pf-ic'); E.pfName = q('.pf-name'); E.pfTier = q('.pf-tier'); E.pfLv = q('.pf-lv'); E.pfGold = q('.pf-gold');
    E.mf = document.createElement('div'); E.mf.className = 'mf glass off'; q('.pf').after(E.mf);
    E.hp = q('.pf .bar.hp i'); E.hpT = q('.pf .bar.hp span'); E.mp = q('.pf .bar.mp i'); E.mpT = q('.pf .bar.mp span'); E.xp = q('.pf .bar.xp i'); E.evbar = q('.evbar'); E.evtoast = q('.evtoast'); E.hud = q('.hud');
    E.tfName = q('.tf-name'); E.tfIc = q('.tf-ic'); E.tfLv = q('.tf-lv'); E.tfHp = q('.tf .bar i'); E.tfHpT = q('.tf .bar span');
    E.zone = q('.zone'); E.qt = q('.qt'); E.qtN = q('.qt-n'); E.qtP = q('.qt-p'); E.mute = q('[data-a=mute]');
    E.btn = { lv: q('[data-a=p-lv]'), inv: q('[data-a=p-inv]'), quest: q('[data-a=p-quest]'), char: q('[data-a=p-char]'), auto: q('.btns [data-a=p-auto]'), look: q('.btns [data-a=p-look]'), obj: q('.fabrow [data-a=obj]') }; E.objPop = q('.objpop'); E.mm = q('.mm'); E.fab = q('.fab'); E.btns = q('.btns'); E.fabrow = q('.fabrow');
    E.badge = q('.auto-badge'); E.qa = q('.qarrow'); E.qaAr = q('.qa-ar'); E.qaD = q('.qa-d');
    E.npcIc = q('.npc-ic'); E.npcN = q('.npc-id h2'); E.npcR = q('.npc-id small');
    ctx = q('.mm canvas').getContext('2d');
    mmDpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = ctx.canvas; cv.width = cv.height = Math.round(MM * mmDpr);

    // barra de atalhos em dois grupos com moldura própria: habilidades [1-5, 8, 9] e poções [6, 7]
    const skS = (i, key) => `<div class="slot" data-a="skill" data-i="${i}"><b class="key">${key}</b><span class="ic"></span><i class="cdv"></i><em class="cdt"></em><s class="mpc"></s><u class="lk">🔒</u></div>`;
    let h = '<div class="sbg sk"><span class="sbt">Habilidades</span>';
    for (let i = 0; i < 5; i++) h += skS(i, i + 1);
    for (let i = 5; i < 7; i++) h += skS(i, i + 3);
    h += '</div><div class="sbg pt"><span class="sbt">Poções</span>';
    h += `<div class="slot pot hp" data-a="pot" data-k="hp" title="Poção de Vida [6]"><b class="key">6</b><span class="ic">❤️</span><s class="qty"></s></div>`;
    h += `<div class="slot pot mp" data-a="pot" data-k="mp" title="Poção de Mana [7]"><b class="key">7</b><span class="ic">💙</span><s class="qty"></s></div></div>`;
    E.sb.innerHTML = h;
    { const sk = [...E.sb.querySelectorAll('.slot[data-a=skill]')], pt = [...E.sb.querySelectorAll('.slot.pot')]; E.slots = sk.slice(0, 5).concat(pt, sk.slice(5)); } // mesma ordem de antes: 5 skills, 2 poções, 2 skills
    E.slots.forEach(s => { s.$cdv = s.querySelector('.cdv'); s.$cdt = s.querySelector('.cdt'); s.$mpc = s.querySelector('.mpc'); s.$ic = s.querySelector('.ic'); s.$qty = s.querySelector('.qty'); });

    buildMenu();
    [E.sb, E.btns, E.fabrow, E.mm, E.objPop, E.badge, q('.tacts'), q('.tfs'), q('.joy'), E.p_inv, E.p_char, E.p_quest, E.p_auto, E.p_look, E.p_tree, E.p_map, E.p_lv, E.p_pause, E.p_dlg, E.death, E.menu, E.create].forEach(shield);
    WIN_KEYS.forEach(k => { E['p_' + k].addEventListener('pointerdown', () => winFront(k), true); E['p_' + k].querySelector('.ph').addEventListener('pointerdown', ev => winDrag(k, ev)); });
  }

  function buildMenu() {
    E.menu.innerHTML = ART.menu() + `<div class="menu-in">
      <div class="menu-crest">⚜</div>
      <h1>Aldoria</h1><div class="sub">Uma saga de ação nas terras esquecidas</div>
      <div class="menu-act"></div>
      <div class="keys">${IS_TOUCH ? '<span>Toque no chão ou use o joystick para andar · botões à direita: atacar, falar, montar</span><span>Arraste para girar a câmera · pinça: zoom</span>' : '<span><kbd>Clique esq.</kbd> mover / atacar</span><span><kbd>Clique dir.</kbd> girar câmera</span><span><kbd>Roda</kbd> zoom</span><span><kbd>1–5</kbd> habilidades</span><span><kbd>6</kbd><kbd>7</kbd> poções</span><span><kbd>I</kbd><kbd>C</kbd><kbd>V</kbd><kbd>M</kbd><kbd>B</kbd> janelas (várias, arrastáveis)</span><span><kbd>X</kbd> montaria</span><span><kbd>F</kbd> falar</span>'}</div>
    </div>`;
    E.menuAct = E.menu.querySelector('.menu-act');
  }

  /* controles de aparência (compartilhados: criação 'cr' e painel do jogo 'look') */
  function lookHtml(L, a) {
    const on = (k, i) => L[k] === i && !(k === 'hc' && L.hcx);
    const chips = (k, arr) => '<div class="chips">' + arr.map((n, i) => `<button class="chip${on(k, i) ? ' on' : ''}" data-a="${a}" data-k="${k}" data-v="${i}">${n}</button>`).join('') + '</div>';
    const sws = (k, arr, names) => '<div class="sws">' + arr.map((c, i) => `<button class="swatch${on(k, i) ? ' on' : ''}" data-a="${a}" data-k="${k}" data-v="${i}" style="background:${rgbs(c)}" title="${names ? names[i] : i + 1}"></button>`).join('') + '';
    const hx = L.hcx || '#' + HAIR_COLORS[L.hc].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
    let h = '<h3>Gênero</h3><div class="cr-gen">' + GENDERS.map((n, i) => `<button class="chip big${L.g === i ? ' on' : ''}" data-a="${a}" data-k="g" data-v="${i}"><span>${i ? '♀' : '♂'}</span>${n}</button>`).join('') + '</div>';
    h += '<h3>Porte</h3>' + chips('b', BUILDS);
    const pick = (k, arr, idx) => '<div class="chips">' + idx.map(i => `<button class="chip${on(k, i) ? ' on' : ''}" data-a="${a}" data-k="${k}" data-v="${i}">${arr[i]}</button>`).join('') + '</div>';
    h += '<h3>Cabelo</h3>' + pick('hs', HAIR_STYLES, HAIR_BY_G[L.g ? 1 : 0]);
    h += '<h3>Cor do cabelo</h3>' + sws('hc', HAIR_COLORS, HAIR_COLOR_NAMES) + `<label class="swatch custom${L.hcx ? ' on' : ''}" title="Cor personalizada" style="background:${L.hcx || 'conic-gradient(#f55,#fd5,#5f8,#5af,#c5f,#f55)'}"><input type="color" data-ci="${a}" value="${hx}"></label></div>`;
    if (!L.g) h += '<h3>Barba</h3>' + chips('bd', BEARDS);
    h += '<h3>Rosto</h3>' + pick('fc', FACE_MARKS, FACE_BY_G[L.g ? 1 : 0]);
    h += '<h3>Olhos</h3>' + sws('ec', EYE_COLORS) + '</div><h3>Pele</h3>' + sws('sk', SKIN_TONES, SKIN_NAMES) + '</div>';
    return h;
  }

  /* ---------- criação de personagem ---------- */
  function buildCreate(c) {
    const cls = Object.keys(CLASSES).map(id => { const k = CLASSES[id]; return `<button class="ccard" data-a="cr-cls" data-c="${id}"><span class="ci">${ART.cls(id)}</span><b>${esc(k.name)}</b><small>${esc(k.role)}</small></button>`; }).join('');
    E.create.innerHTML = `<div class="cr-panel">
      <div class="cr-head"><h2>Criar personagem</h2><small>Dê forma ao seu herói — a aparência não poderá ser mudada depois</small></div>
      <div class="cr-scroll">
        <h3>Nome</h3><div class="cr-name"><input id="cr-name" maxlength="14" autocomplete="off" spellcheck="false" placeholder="Nome do herói"><button class="btn" data-a="cr-rname" title="Nome aleatório">🎲</button></div>
        <h3>Classe</h3><div class="cr-cls">${cls}</div><div class="cr-cdesc"></div>
        <div class="cr-look"></div>
      </div>
      <div class="cr-foot"><button class="btn ghost" data-a="cr-back">← Voltar</button><button class="btn" data-a="cr-rand">🎲 Aleatório</button><button class="btn primary" data-a="cr-go">⚔ Começar aventura</button></div>
    </div>
    <div class="cr-view"><div class="cr-plate"><b class="cr-pn"></b><small class="cr-pc"></small></div><div class="cr-hint">Arraste para girar · Roda para aproximar</div></div>`;
    E.create.querySelector('#cr-name').addEventListener('input', ev => Game.createName(ev.target.value));
    const v = E.create.querySelector('.cr-view');
    let drag = null;
    v.addEventListener('mousedown', ev => { drag = ev.clientX; ev.preventDefault(); });
    addEventListener('mousemove', ev => { if (drag != null) { Game.createRot(ev.clientX - drag); drag = ev.clientX; } });
    addEventListener('mouseup', () => { drag = null; });
    v.addEventListener('wheel', ev => { Game.createZoom(ev.deltaY); ev.preventDefault(); }, { passive: false });
    v.addEventListener('touchstart', ev => { drag = ev.touches[0].clientX; }, { passive: true });
    v.addEventListener('touchmove', ev => { if (drag != null) { Game.createRot(ev.touches[0].clientX - drag); drag = ev.touches[0].clientX; } }, { passive: true });
    v.addEventListener('touchend', () => { drag = null; });
  }
  function syncCreate(c, setName) {
    const el = E.create; if (!el || !c) return;
    const lk = el.querySelector('.cr-look'), nm = el.querySelector('#cr-name');
    const html = lookHtml(c.look, 'cr'); if (lk._h !== html) { lk._h = html; lk.innerHTML = html; }
    if (setName || nm.value === '' && !nm._t) { nm.value = c.name; nm._t = 1; }
    el.querySelectorAll('.ccard').forEach(b => b.classList.toggle('on', b.dataset.c === c.cls));
    const k = CLASSES[c.cls];
    el.querySelector('.cr-cdesc').innerHTML = `<b>${esc(k.name)}</b> · ${esc(k.role)}<p>${esc(k.desc)}</p><div class="sk">${k.skills.map(s => `<span title="${esc(s.n + ' — ' + s.d)}">${s.ic} ${esc(s.n)}</span>`).join('')}</div>`;
    el.querySelector('.cr-pn').textContent = c.name || 'Sem nome'; el.querySelector('.cr-pc').textContent = k.name + ' · ' + GENDERS[c.look.g];
  }
  function showCreate(c) {
    st.menu = true; showPanel(null); hideDeath(); setVis(E.menu, false);
    root.classList.add('in-menu'); setVis(E.create, true);
    buildCreate(c); syncCreate(c, true);
  }
  function hideCreate() { setVis(E.create, false); }

  function renderMenuActions() {
    const A = Game.account();
    let h = '';
    if (!A || !A.name) { // sem conta ativa: escolher uma conta existente ou criar outra
      const L = Game.accounts();
      h += `<div class="acc-new"><b>${L.length ? 'Escolha a conta' : 'Crie sua conta'}</b><small>Todos os personagens da conta ficam juntos e dividem o mesmo baú. Cada conta tem seus próprios personagens.</small>`;
      if (L.length) {
        h += '<div class="acc-list">';
        for (const a of L) h += `<div class="acc-c"><div class="acc-t"><b>${esc(a.name)}</b><small>${a.chars} personagem(ns)</small></div>` + (st.confirmAcc === a.name
          ? `<span class="confirm">Apagar conta e personagens? <button class="btn danger" data-a="accdel-yes" data-id="${esc(a.name)}">Sim</button><button class="btn" data-a="accdel-no">Não</button></span>`
          : `<button class="btn primary" data-a="acc-enter" data-id="${esc(a.name)}">Entrar</button><button class="btn ghost" data-a="accdel-ask" data-id="${esc(a.name)}" title="Apagar conta">🗑</button>`) + '</div>';
        h += '</div><small>Ou crie uma conta nova:</small>';
      }
      h += `<div class="cr-name"><input id="acc-name" maxlength="18" placeholder="Nome da conta"><button class="btn${L.length ? '' : ' primary'}" data-a="acc-create">Criar conta</button></div></div>`;
      setBody(E.menuAct, h); return;
    }
    h += `<div class="acc"><div class="acc-h"><span>Conta</span><b>${esc(A.name)}</b><small>${A.chars.length} personagem(ns) · baú: ${A.bank.items.length} itens, ${fmt(A.bank.gold)} ouro</small><button class="btn ghost" data-a="acc-out" title="Sair desta conta e escolher ou criar outra">⇄ Trocar conta</button></div><div class="acc-list">`;
    for (const c of A.chars) {
      const k = CLASSES[c.cls];
      h += `<div class="acc-c"><span class="ci">${ART.cls(c.cls)}</span><div class="acc-t"><b>${esc(c.name)}</b><small>${esc(k.name)} · ${esc(TIERS[c.tier] || '')} · Nível ${c.lvl}${c.ch ? ' · Capítulo ' + Math.min(5, c.ch + 1) : ''}</small></div>`;
      h += st.confirmDel === c.id ? `<span class="confirm">Apagar? <button class="btn danger" data-a="delyes" data-id="${c.id}">Sim</button><button class="btn" data-a="delno">Não</button></span>`
        : `<button class="btn primary" data-a="continue" data-id="${c.id}">▶ Jogar</button><button class="btn ghost" data-a="delask" data-id="${c.id}" title="Apagar personagem">🗑</button>`;
      h += '</div>';
    }
    if (!A.chars.length) h += '<div class="dim pad">Nenhum personagem ainda.</div>';
    h += `</div><button class="btn${A.chars.length ? '' : ' primary'} big" data-a="newchar"${A.chars.length >= 8 ? ' disabled' : ''}>✦ Novo personagem</button></div>`;
    setBody(E.menuAct, h);
  }

  /* ---------- painéis ---------- */
  /* janelas flutuantes: várias abertas ao mesmo tempo, arrastáveis pelo título. Modais (diálogo de NPC e pausa) ficam por cima.
     st.wins = janelas abertas (a última fica na frente); st.modal = 'dlg' | 'pause' | null; st.panel = o que está mais à frente (compatibilidade). */
  const WIN_KEYS = ['inv', 'char', 'quest', 'auto', 'look', 'tree', 'map', 'lv'], panelKeys = WIN_KEYS.concat(['pause', 'dlg']);
  const WIN_BTN = ['inv', 'quest', 'char', 'auto', 'look', 'lv'];
  st.wins = []; st.modal = null; st.wpos = {};
  const winSide = k => k === 'inv' && st.modal === 'dlg' && !!st.side; // Equipamento encaixado ao lado do diálogo (posição pelo CSS)
  function winPlace(k) { // posição em px (guardada); na primeira vez, cascata a partir do centro
    const el = E['p_' + k], R = root.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let P = st.wpos[k];
    if (!P) { const n = Math.max(0, st.wins.indexOf(k)); P = st.wpos[k] = { x: (R.width - w) / 2 + (n % 5) * 26 - 52, y: (R.height - h) / 2 + (n % 5) * 26 - 52 }; }
    P.x = Math.max(0, Math.min(R.width - w, P.x)); P.y = Math.max(0, Math.min(R.height - h, P.y)); // a janela inteira fica na tela
    el.style.left = P.x + 'px'; el.style.top = P.y + 'px';
  }
  function winSync() {
    panelKeys.forEach(k => {
      const w = WIN_KEYS.includes(k), on = w ? st.wins.includes(k) || winSide(k) : k === st.modal, el = E['p_' + k];
      setVis(el, on);
      const free = w && on && !winSide(k); setCls(el, 'win', free);
      if (free) { winPlace(k); el.style.zIndex = 14 + st.wins.indexOf(k); }
      else if (w) { el.style.left = ''; el.style.top = ''; el.style.zIndex = ''; }
    });
    setCls(root, 'side', st.modal === 'dlg' && !!st.side); setCls(root, 'sidebank', st.modal === 'dlg' && st.side === 'bank');
    st.panel = st.modal || st.wins[st.wins.length - 1] || null;
    WIN_BTN.forEach(k => setCls(E.btn[k], 'on', st.wins.includes(k)));
  }
  addEventListener('resize', () => { if (st.wins.length) winSync(); });
  // girar o aparelho: o navegador móvel informa o tamanho novo com atraso; recentra as janelas e refaz o tamanho do canvas
  let rotT = 0;
  const rotFix = () => { clearTimeout(rotT); rotT = setTimeout(() => { st.wpos = {}; winSync(); if (st.wins.length) winSync(); window.dispatchEvent(new Event('resize')); }, 350); };
  addEventListener('orientationchange', rotFix);
  if (screen.orientation) screen.orientation.addEventListener('change', rotFix);
  function winFront(k) { const i = st.wins.indexOf(k); if (i < 0 || i === st.wins.length - 1) return; st.wins.splice(i, 1); st.wins.push(k); st.wins.forEach((n, j) => { E['p_' + n].style.zIndex = 14 + j; }); st.panel = st.modal || k; }
  function winDrag(k, ev) {
    if (ev.button || ev.target.closest('button') || winSide(k)) return;
    const P = st.wpos[k]; if (!P) return; const x0 = ev.clientX, y0 = ev.clientY, px = P.x, py = P.y;
    const mv = e => { P.x = px + e.clientX - x0; P.y = py + e.clientY - y0; winPlace(k); }, up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); ev.preventDefault();
  }
  function modalClose() { carryCancel(); st.msg = null; st.npc = null; st.jw = null; st.sm = null; st.side = null; cmClose(); st.modal = null; }
  function showPanel(name) { // abre (traz à frente) ou, com null, fecha tudo
    const was = st.panel, fresh = WIN_KEYS.includes(name) && !st.wpos[name];
    if (name === null) { if (st.modal || st.wins.length) { carryCancel(); cmClose(); } st.wins = []; st.modal = null; st.side = null; }
    else if (name === 'dlg' || name === 'pause') { st.modal = name; if (name !== 'dlg') st.side = null; }
    else { const i = st.wins.indexOf(name); if (i >= 0) st.wins.splice(i, 1); st.wins.push(name); }
    if (st.cm && !st.wins.includes('inv') && !st.side) cmClose();
    winSync();
    if (st.panel) { refreshPanels(); if (fresh) delete st.wpos[name]; winSync(); } // 2ª passada: o conteúdo já está montado e a janela tem o tamanho final
    if (WIN_KEYS.includes(name) && Game.mainEv) Game.mainEv('open:' + name);
    if (st.panel !== was && Game.sound) Game.sound(st.panel ? 'open' : 'close', { force: true });
  }
  function winClose(k) {
    if (k === 'dlg' || k === 'pause') modalClose();
    else { st.wins = st.wins.filter(x => x !== k); if (k === 'inv') { carryCancel(); cmClose(); } }
    winSync(); if (Game.sound) Game.sound('close', { force: true }); refreshPanels();
  }
  const togglePanel = name => {
    if (st.menu || st.death) return;
    if (st.modal) { modalClose(); winSync(); }
    if (st.wins.includes(name)) winClose(name); else showPanel(name);
  };

  /* janela de Equipamento (estilo clássico): espaços em volta do retrato, mochila em grade, ouro na base.
     Com Guarda/Ferreiro/Joalheiro aberto (st.side) os cliques guardam no baú ou escolhem o item do serviço. */
  const SIL = '<svg class="sil" viewBox="0 0 100 160"><path d="M50 6c10 0 17 8 17 18s-7 19-17 19-17-9-17-19 7-18 17-18zM28 48h44c9 0 15 6 17 14l8 40c1 5-6 7-8 2l-9-30-2 28 4 48c0 6-9 7-10 1l-8-44h-6l-8 44c-1 6-10 5-10-1l4-48-2-28-9 30c-2 5-9 3-8-2l8-40c2-8 8-14 17-14z"/></svg>';
  const EQ_POS = { h: [0, 0], a: [0, 1], l: [0, 2], g: [0, 3], w: [2, 0], c: [2, 1], b: [2, 2] };
  function sideAct(it, eqSlot) { // ação do clique conforme o serviço aberto ao lado
    const sd = st.side;
    if (sd === 'smith') return ['sm-it', (st.sm && st.sm.it) === it.id];
    if (sd === 'jewel') return ['jw-it', (st.jw && st.jw.it) === it.id];
    if (sd === 'bank' && !eqSlot) return ['bank-put', false];
    return [eqSlot ? 'unequip' : 'equip', false];
  }
  const plusB = it => it.plus ? `<em class="pl${it.plus >= 10 ? ' anc' : ''}">+${it.plus}</em>` : '';
  function renderInv(G) {
    const p = G.player, eq = p.eq || {}, ic = SLOT_IC(p.cls), tab = st.invTab || 'bag';
    const flat = IS_TOUCH; // toque: sem o boneco, equipados numa grade 4×2 (arma, elmo, peitoral, calça / luvas, botas, acessório, montaria)
    let l = `<div class="eqbox${flat ? ' flat' : ''}">`;
    for (const s of SLOT_ORDER) {
      const it = eq[s], [cx, ry] = EQ_POS[s], pos = flat ? '' : `grid-column:${cx + 1};grid-row:${ry + 1}`;
      if (it) { const [a, sel] = sideAct(it, s);
        l += `<div class="es has${sel ? ' sel' : ''}" style="${pos};--rc:${rcol(it)}" data-a="${a}" data-s="${s}" data-id="${it.id}" data-cm="${it.id}" data-drag="eq" draggable="true" title="${esc(itemTip(it, null, true))}"><span class="ei">${iconOf(it, ic)}</span>${plusB(it)}<small>${SLOTS[s]}</small></div>`; }
      else l += `<div class="es" style="${pos}" data-drop="${s}"><span class="ei dim">${ic[s]}</span><small>${SLOTS[s]}</small></div>`;
    }
    if (!flat) l += `<div class="portrait" style="grid-column:2;grid-row:1/4"><canvas class="pv" width="420" height="560" title="Prévia do personagem equipado. Arraste para girar."></canvas><b>${esc(p.name || CLASSES[p.cls].name)}</b><small>${esc(TIERS[p.tier] || '')} · Nv ${p.lvl}</small></div>`;
    { const mid = p.lastMount, M_ = mid && MOUNTS[mid], lv = M_ ? Game.mountLv(mid) : 0, mp = flat ? '' : 'grid-column:2;grid-row:4';
      l += M_ ? `<div class="es has mnt" style="${mp}" data-a="p-look" title="${esc(M_.n + ' · Nível ' + lv + '\n' + mountBonusTxt(M_, lv) + '\nClique: abrir Montarias [H]')}"><span class="ei">${M_.ic}</span><em class="pl">Nv${lv}</em><small>Montaria</small></div>`
        : `<div class="es mnt" style="${mp}" data-a="p-look"><span class="ei dim">🐎</span><small>Montaria</small></div>`; }
    l += '</div>';
    let g = '';
    if (tab === 'bag') {
      const n = Math.max(BAG, p.inv.length), slots = fillPos(p.inv, n);
      for (let i = 0; i < n; i++) {
        const it = slots[i];
        if (!it) { g += `<div class="bi empty" data-zone="bag" data-slot="${i}"></div>`; continue; }
        const e = eq[it.slot], d = cmpDelta(it, e), [a, sel] = sideAct(it, null);
        const arrow = d == null ? '<i class="ar new">●</i>' : d > 0 ? '<i class="ar up">▲</i>' : d < 0 ? '<i class="ar dn">▼</i>' : '';
        g += `<div class="bi it r${it.rar}${sel ? ' sel' : ''}${noUse(it) ? ' nouse' : ''}${st.carry && st.carry.id === it.id ? ' carry' : ''}" data-zone="bag" data-slot="${i}" data-a="${a}" data-id="${it.id}" data-cm="${it.id}" data-drag="bag" draggable="true" title="${esc(itemTip(it, e, false))}" style="--rc:${rcol(it)}"><span class="ei">${iconOf(it, ic)}</span>${plusB(it)}${arrow}</div>`;
      }
      let c = `<div class="bi stk pot" title="Poção de Vida [6]"><span class="ei">❤️</span><s class="q">${p.pots.hp}</s></div><div class="bi stk pot" title="Poção de Mana [7]"><span class="ei">💙</span><s class="q">${p.pots.mp}</s></div><div class="bi stk" title="Ração de viagem (montaria)"><span class="ei">🌾</span><s class="q">${p.feed | 0}</s></div>`;
      const mb = {}; (p.mbox || []).forEach((id, i) => { (mb[id] = mb[id] || []).push(i); });
      for (const id in mb) c += `<div class="bi stk mbox" data-a="use-mount" data-i="${mb[id][0]}" title="${esc('Montaria: ' + MOUNTS[id].n + '\n' + MOUNTS[id].d + '\nClique para usar: ' + (p.mounts.includes(id) ? 'já possuída, dá um nível à sua ' + MOUNTS[id].n : 'adiciona à sua coleção'))}"><span class="ei">${MOUNTS[id].ic}</span><s class="q">${mb[id].length}</s><i class="ar new">★</i></div>`;
      g = `<div class="bag" data-drop="bag">${g}</div><div class="bag cons">${c}</div>`;
    } else {
      const M = p.mats || {};
      for (const k of STONE_IDS) g += `<div class="bi stk${M[k] ? '' : ' empty'}" title="${esc(STONES[k].n + '\n' + STONES[k].d)}"><span class="ei${M[k] ? '' : ' dim'}">${STONES[k].ic}</span><s class="q">${M[k] || 0}</s></div>`;
      g = `<div class="bag mats">${g}</div><div class="dim pad">Pedras de adicional caem de monstros. Leve-as ao Joalheiro.</div>`;
    }
    const tabs = `<div class="itabs"><button class="${tab === 'bag' ? 'on' : ''}" data-a="itab" data-k="bag">Mochila <small>${p.inv.length}/${BAG}</small></button><button class="${tab === 'mat' ? 'on' : ''}" data-a="itab" data-k="mat">Materiais</button></div>`;
    const hint = st.side === 'bank' ? TX('Clique num item da mochila para guardar no baú.', 'Toque num item da mochila e escolha "Guardar no baú".') : st.side === 'smith' ? 'Escolha um item equipado ou da mochila para refinar.' : st.side === 'jewel' ? 'Escolha um item equipado ou da mochila para o adicional.' : TX('Clique ou arraste para equipar · botão direito: opções.', 'Toque num item para ver os atributos e escolher: equipar, guardar, vender ou mover.');
    setBody(E.b_inv, `<div class="eqw">${l}${tabs}${g}<div class="foot-note">${hint}</div><div class="igold"><span>🪙</span><b>${fmt(p.gold)}</b><small>ouro</small></div></div>`);
    { const cv = E.b_inv.querySelector('canvas.pv'); if (cv && Game.portrait) { if (st.pvYaw == null) st.pvYaw = .6; Game.portrait(cv, st.pvYaw); } }
  }
  function renderChar(G) {
    const p = G.player, s = G.stats || {}, c = CLASSES[p.cls];
    const need = p.lvl >= lvCap(p.tier) ? 0 : xpPlayer(p.lvl, p.tier);
    const row = (k, v) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`;
    let h = `<div class="ch-head"><div class="ch-ic">${ART.cls(p.cls)}</div><div><h3>${esc(p.name || c.name)}</h3><div class="role">${esc(c.name)} · ${esc(TIERS[p.tier])} · Nível ${p.lvl}${p.lvl >= lvCap(p.tier) ? ' (máx.)' : ''}</div><div class="role">${esc(c.role)}</div></div></div>`;
    h += '<div class="stats">';
    h += row('Experiência', need ? `${fmt(p.xp)} / ${fmt(need)}` : 'Máximo');
    h += row('Classe', esc(TIERS[p.tier]) + ' · poder ×' + tmul(p.tier)) + row('Ataque', fmt(s.atk || 0)) + row('Defesa', fmt(s.def || 0)) + row('Crítico', pc(s.crit || 0)) + row('Esquiva', pc(s.dodge || 0)) + row('Vel. de ataque', '×' + (s.aspd || 1).toFixed(2));
    h += row('Vida', `${fmt(p.hp)} / ${fmt(s.maxHp || p.maxHp)}`) + row(resName(p.cls), `${fmt(p.mp)} / ${fmt(s.maxMp || p.maxMp)}`);
    h += row('Velocidade', (s.spd || 0).toFixed(1)) + row('Ouro', fmt(p.gold));
    h += '</div>';
    h += s.setBonus ? '<div class="setb on">✨ Bônus de conjunto ativo</div>' : '<div class="setb">Bônus de conjunto: inativo</div>';
    const hint = ATTR_HINT[p.cls] || [];
    h += `<h3>Atributos <small>${p.ap > 0 ? '<b class="gold">' + p.ap + ' pontos disponíveis</b>' : 'sem pontos · +' + AP_PER_LEVEL + ' por nível'}</small></h3><div class="attrs">`;
    for (const k of ATTR_KEYS) {
      const A = ATTRS[k];
      h += `<div class="attr"><span class="ai">${A.ic}</span><div class="at"><b>${A.n}${hint.includes(k) ? ' <i title="Recomendado para sua classe">★</i>' : ''}</b><small>${A.d}</small></div><span class="av">${p.attr[k]}</span><button class="btn mini" data-a="attr" data-k="${k}" data-n="1"${p.ap > 0 ? '' : ' disabled'}>+1</button><button class="btn mini" data-a="attr" data-k="${k}" data-n="5"${p.ap > 0 ? '' : ' disabled'}>+5</button></div>`;
    }
    h += `</div><button class="btn ghost mini" data-a="attr-reset" title="Devolve todos os pontos">↺ Redistribuir (💰 ${fmt(50 * Math.round(ELV()))})</button>`;
    h += `<div class="dim pad">${TX('Habilidades: tecla <kbd>V</kbd>', 'Habilidades: fale com o Mestre de Habilidades')}</div>`;
    setBody(E.b_char, h);
  }

  function renderAuto(G) {
    const A = G.auto || {}, out = G.autoOut || {};
    const row = (k, title, sub, extra) => `<div class="au-row${A[k] ? ' on' : ''}" data-a="auto" data-k="${k}" title="Clique para ${A[k] ? 'desligar' : 'ligar'}"><div class="au-t"><b>${title}</b><small>${sub}</small>${extra || ''}</div><span class="sw${A[k] ? ' on' : ''}"><i></i></span></div>`;
    const pct = (k, lab) => `<div class="au-pct"><span>${lab}</span><button class="btn" data-a="auto-pct" data-k="${k}" data-d="-10"${A[k] <= 10 ? ' disabled' : ''}>−</button><b>${A[k]}%</b><button class="btn" data-a="auto-pct" data-k="${k}" data-d="10"${A[k] >= 90 ? ' disabled' : ''}>+</button></div>`;
    const all = A.attack && A.skills && A.hp && A.mp;
    let h = '<div class="au-intro">Deixe o personagem lutar por você. Qualquer movimento manual pausa o ataque automático por 3 segundos.</div>';
    h += row('attack', '⚔️ Atacar sozinho', 'Escolhe o monstro mais próximo, persegue, ataca e recolhe o loot.');
    h += row('skills', '✨ Usar habilidades sozinho', 'Cura, escudo, bônus, invocação, área e dano, respeitando mana e recarga.');
    h += row('hp', `❤️ Poção de vida automática (HP &lt; ${A.hpPct}%)`, `Você tem ${G.player.pots.hp} poção(ões) de vida.`, (out.hp ? '<em class="au-warn">Sem poções de vida!</em>' : '') + pct('hpPct', 'Usar quando HP abaixo de'));
    h += row('mp', `💙 Poção de mana automática (MP &lt; ${A.mpPct}%)`, `Você tem ${G.player.pots.mp} poção(ões) de mana.`, (out.mp ? '<em class="au-warn">Sem poções de mana!</em>' : '') + pct('mpPct', 'Usar quando MP abaixo de'));
    h += `<div class="au-foot"><button class="btn primary" data-a="auto-all">${all ? 'Desligar tudo' : 'Ligar tudo'}</button><span class="dim"><kbd>Z</kbd> liga/desliga combate automático · <kbd>T</kbd> abre este painel</span></div>`;
    setBody(E.b_auto, h);
  }

  function renderPause(G) {
    const q = (typeof Game !== 'undefined' && Game._dbg && Game._dbg.R) ? Game._dbg.R.q.name : '';
    let h = '<div class="pause-b">';
    h += '<button class="btn primary" data-a="close">▶ Continuar jogando</button>';
    h += TX('', '<button class="btn" data-a="p-auto">🤖 Configurar automático</button>');
    h += TX('', `<button class="btn" data-a="eco">🔋 Economia de energia: <b>${Game.ecoOn() ? 'Ligada' : 'Desligada'}</b><i style="display:block;font:11px var(--sans);color:var(--mut)">40 FPS e menos calor; desligue para 60 FPS</i></button>`);
    h += `<button class="btn" data-a="gfx">🖼 Qualidade gráfica: <b>${q}</b>${TX(' <small>[G]</small>', '')}</button>`;
    h += `<button class="btn" data-a="mute">${G.mute ? '🔇 Som desligado' : '🔊 Som ligado'}${TX(' <small>[N]</small>', '')}</button>`;
    { const V = Game.getVol ? Game.getVol() : {}; h += '<div class="mixer">' + [['master', '🔊 Geral'], ['sfx', '⚔ Efeitos'], ['amb', '🌿 Ambiente'], ['music', '🎵 Música']].map(([k, n]) => `<label><span>${n}</span><input type="range" min="0" max="100" value="${Math.round((V[k] == null ? 1 : V[k]) * 100)}" data-vol="${k}"></label>`).join('') + '</div>'; }
    h += '<button class="btn" data-a="tomenu">🏠 Salvar e voltar ao menu inicial</button></div>';
    h += '<div class="au-intro">O progresso é salvo automaticamente a cada poucos segundos e ao voltar ao menu.</div>';
    setBody(E.b_pause, h);
  }
  const rgbs = c => `rgb(${c.map(v => Math.round(v * 255)).join(',')})`;
  function renderLook(G) {
    const p = G.player;
    let h = `<div class="au-intro">Montarias que caem entram aqui na hora: use <b>Equipar</b> para ganhar o bônus (inteiro montado, metade desmontado) e <kbd>X</kbd> para montar/desmontar (dá para atacar montado). Cada uma <b>evolui sozinha</b> com XP (barra abaixo); uma montaria repetida dá um nível.<br>Energia: <b>${Math.round(p.mst == null ? 100 : p.mst)}/${Game.mstMax()}</b> · Rações: <b>${p.feed || 0}</b> (compre com o Cavalariço)<br>Montarias caem de monstros (raro) e de chefes; ganham XP quando você vence lutas montado ou cavalga. Nível máx. ${MOUNT_MAXLV}: mais velocidade, energia e bônus.</div>`;
    h += '<div class="shop">';
    for (const id in MOUNTS) {
      const m = MOUNTS[id], own = p.mounts.includes(id), on = p.mount === id;
      const lv = Game.mountLv(id), rec = (p.mlv || {})[id] || { xp: 0 }, need = mountXpNeed(lv);
      h += `<div class="shop-r${own ? '' : ' lockd'}"><span class="it-ic">${m.ic}</span><div class="it-t"><b>${m.n}${own ? ` <span class="mlv">Nv ${lv}</span>` : ''}</b><small>${own ? m.d + ' · +' + Math.round(m.spd * mountLvSpd(lv) * 100) + '% vel. · ' + mountBonusTxt(m, lv) : '🔒 Cai de: ' + esc(mountSources(id).join(', ') || 'eventos')}</small>${own ? `<div class="bar mxp" title="Experiência da montaria"><i style="width:${lv >= MOUNT_MAXLV ? 100 : (rec.xp / need * 100).toFixed(1)}%"></i><span>${lv >= MOUNT_MAXLV ? 'Nível máximo' : Math.floor(rec.xp) + ' / ' + need + ' XP'}</span></div>` : ''}</div>`;
      h += own ? `<button class="btn${p.lastMount === id ? ' primary' : ''}" data-a="equipmount" data-id="${id}">${p.lastMount === id ? 'Equipada ✓' : 'Equipar'}</button><button class="btn${on ? '' : ' primary'}" data-a="mount" data-id="${id}">${on ? 'Desmontar' : 'Montar'}</button>` : '';
      h += '</div>';
    }
    setBody(E.b_look, h + '</div>');
  }

  const reward = r => `✨ ${fmt(r.xp)} XP &nbsp; 💰 ${fmt(r.gold)} &nbsp; 🧪 ${r.pots} poções`;
  const qTarget = q => q.kill || 1;
  const STATE_N = { locked: 'Bloqueada', available: 'Disponível', active: 'Em andamento', ready: 'Pronta para entregar', done: 'Concluída' };
  const npcName = id => (NPCS.find(n => n.id === id) || { n: id }).n;
  const npcWhere = id => { const n = NPCS.find(x => x.id === id); if (!n) return ''; const v = n.vil ? VILLAGES.find(v => v.id === n.vil) : VILLAGES.find(v => v.reg === n.reg && Math.hypot(n.x - v.cx, n.z - v.cz) < v.r + 2); return v ? v.n : ''; };
  function stepLine(s) {
    if (s.k === 'talk') return `Fale com ${npcName(s.npc)}${npcWhere(s.npc) ? ' (' + npcWhere(s.npc) + ')' : ''}`;
    if (s.k === 'boss') return 'Derrote ' + BOSSES[s.boss].n;
    if (s.k === 'explore') return 'Vá até: ' + s.place;
    return s.t;
  }
  function mainBlock(G, compact) {
    const M = G.main; if (!M) return '';
    const s = MAIN[M.i];
    if (!s) return '<div class="qc done"><div class="qc-h"><b>Crônicas de Aldoria</b><span class="badge done">Concluída</span></div><div class="qc-t">Você completou toda a história principal. Aldoria agradece, herói.</div></div>';
    const c = CHAP[s.ch], tg = stepGoal(s), pr = Math.min(M.prog, tg), open = ELV() >= s.lvl;
    const steps = MAIN.filter(x => x.ch === s.ch), k = steps.indexOf(s);
    let h = `<div class="qc main ${open ? 'active' : 'locked'}"><div class="qc-h"><b>${esc(c.n)}</b><span class="badge ${open ? 'active' : 'locked'}">Nv ${DLV(c.lv[0])}–${DLV(c.lv[1])}</span></div>`;
    if (!compact && k === 0 && M.prog === 0) h += `<div class="qc-t story">${esc(c.intro)}</div>`;
    h += `<div class="qc-step">Etapa ${k + 1} de ${steps.length}: <b>${esc(stepTitle(s))}</b></div><div class="qc-t">${esc(s.t)}</div>`;
    if (!open) h += `<div class="qc-go">Disponível no nível ${DLV(s.lvl)}.</div>`;
    else if (tg > 1) h += `<div class="bar xp q"><i style="width:${(pr / tg * 100).toFixed(0)}%"></i><span>${pr} / ${tg}${s.item ? ' ' + esc(s.item) : ''}</span></div>`;
    if (open && s.k === 'talk') h += `<div class="qc-go">${esc(stepLine(s))}.</div>`;
    const r = stepReward(s); h += `<div class="qc-r">Recompensa: ✨ ${fmt(r.xp)} XP &nbsp; 💰 ${fmt(r.gold)}${k === steps.length - 1 ? ` &nbsp; + bônus do capítulo (💰 ${fmt(c.rew.gold)} e item ${RARITY[c.rew.item].n})` : ''}</div>`;
    if (!compact) { h += '<div class="steps">'; steps.forEach((x, j) => h += `<i class="${j < k ? 'ok' : j === k ? 'cur' : ''}" title="${esc(stepTitle(x))}"></i>`); h += '</div>'; }
    return h + '</div>';
  }
  function renderQuest(G) {
    const tab = st.qtab || 'main', T = (id, l) => `<button class="tab${tab === id ? ' on' : ''}" data-a="qtab" data-id="${id}">${l}</button>`;
    let h = `<div class="tabs">${T('main', '📖 História')}${T('side', '📜 Secundárias')}${T('daily', '📅 Diários')}${T('ach', '🏆 Conquistas')}</div>`;
    if (tab === 'main') {
      h += mainBlock(G, false);
      const done = (G.main && G.main.chaps) || [];
      h += '<h3>Capítulos</h3>';
      for (const c of CHAPTERS) h += `<div class="chap${done.includes(c.id) ? ' ok' : ''}"><b>${esc(c.n)}</b><small>Níveis ${DLV(c.lv[0])}–${DLV(c.lv[1])}${done.includes(c.id) ? ' · ✔ concluído' : ''}</small></div>`;
    } else if (tab === 'side') {
      h += '<div class="au-intro">Missões dos Anciões. A evolução de classe (nível 50 + ouro) fica no fim desta janela.</div>';
      QUESTS.forEach((q, i) => {
        const s = G.quests[q.id] || { state: 'locked', prog: 0 }, tg = qTarget(q);
        const pr = s.state === 'ready' || s.state === 'done' ? tg : Math.min(s.prog || 0, tg);
        h += `<div class="qc ${s.state}"><div class="qc-h"><b>${i + 1}. ${esc(q.n)}</b><span class="badge ${s.state}">${STATE_N[s.state] || s.state}</span></div>`;
        if (s.state === 'locked') h += `<div class="qc-t dim">Requer nível ${DLV(q.lvl)}${i ? ' e a missão anterior concluída' : ''}.</div>`;
        else {
          h += `<div class="qc-t">${esc(q.t)}</div>`;
          if (s.state === 'active' || s.state === 'ready') h += `<div class="bar xp q"><i style="width:${(pr / tg * 100).toFixed(0)}%"></i><span>${pr} / ${tg}</span></div>`;
          h += `<div class="qc-r">Recompensa: ${reward(q.rew)}</div>`;
          if (s.state === 'ready') h += '<div class="qc-go">Entregue a missão a um Ancião.</div>';
          if (s.state === 'available') h += '<div class="qc-go">Fale com um Ancião para aceitar.</div>';
        }
        h += '</div>';
      });
    } else if (tab === 'daily') {
      const D = G.daily, r = Game.dailyReward();
      h += `<div class="au-intro">Três desafios novos todo dia. Cada um vale ✨ ${fmt(r.xp)} XP, 💰 ${fmt(r.gold)} e 🧪 ${r.pots} poções de cada.</div>`;
      if (D) D.list.forEach((d, k) => {
        const P = DAILY_POOL[d.pi];
        h += `<div class="qc ${d.claimed ? 'done' : d.done ? 'ready' : 'active'}"><div class="qc-h"><b>${esc(P.t)}</b><span class="badge ${d.claimed ? 'done' : d.done ? 'ready' : 'active'}">${d.claimed ? 'Resgatado' : d.done ? 'Pronto' : 'Em andamento'}</span></div>`;
        h += `<div class="bar xp q"><i style="width:${(d.prog / P.n * 100).toFixed(0)}%"></i><span>${fmt(d.prog)} / ${fmt(P.n)}</span></div>`;
        if (d.done && !d.claimed) h += `<button class="btn primary" data-a="daily" data-id="${k}">Resgatar recompensa</button>`;
        h += '</div>';
      });
      h += '<div class="dim pad">Os desafios renovam à meia-noite.</div>';
    } else {
      const R = G.rec || { ach: [] };
      h += `<div class="au-intro">${R.ach.length} de ${ACHIEVEMENTS.length} conquistas desbloqueadas.</div><div class="achs">`;
      for (const a of ACHIEVEMENTS) {
        const ok = R.ach.includes(a.id), tg = a.k === 'lvl' ? DLV(a.n_) : a.n_, v = a.k === 'lvl' ? G.player.lvl : a.k === 'chap' ? (G.main ? G.main.chaps.filter(k => k !== 'c0').length : 0) : a.k === 'bossU' ? R.bossU.length : a.k === 'regions' ? R.regions.length : (R[a.k] || 0);
        h += `<div class="ach${ok ? ' ok' : ''}"><span>${ok ? '🏆' : '🔒'}</span><div><b>${esc(a.n)}</b><small>${esc(a.k === 'lvl' ? 'Alcance o nível ' + tg : a.t)}${a.rew ? ' · 💰 ' + fmt(a.rew) : ''}</small>${ok ? '' : `<div class="bar xp q"><i style="width:${Math.min(100, v / tg * 100).toFixed(0)}%"></i><span>${fmt(Math.min(v, tg))} / ${fmt(tg)}</span></div>`}</div></div>`;
      }
      h += '</div>';
    }
    setBody(E.b_quest, h);
  }



  /* ---------- níveis e regiões (B): uma aba por fase, com a faixa de nível de cada lugar na escala daquela fase ---------- */
  function renderLv(G) {
    const p = G.player, cur = st.lvTab != null ? st.lvTab : (p.tier | 0), cap = lvCap(cur), mine = cur === (p.tier | 0);
    const D = L => dispLv(L, cur), gr = L => 'grau ' + gradeOfLvl(L, cur);
    let h = '<div class="tabs">' + TIERS.map((n, i) => `<button class="tab${i === cur ? ' on' : ''}" data-a="lvtab" data-id="${i}">${esc(n)}${i === (p.tier | 0) ? ' ●' : ''}</button>`).join('') + '</div>';
    h += `<div class="lv-intro">Fase <b class="gold">${esc(TIERS[cur])}</b>: níveis 1 a ${cap}.${mine ? ' Você está no nível <b class="gold">' + p.lvl + '</b>.' : ''} A cada nova fase você volta ao nível 1, mas o mundo é o mesmo: só muda a escala dos níveis.</div>`;
    const rows = [];
    if (cur === 0) CAMP.lv.forEach((L, i) => rows.push({ lo: i ? D(CAMP.lv[i - 1]) + 1 : 1, hi: i < 2 ? D(CAMP.lv[i + 1]) - 1 : D(CAMP.endLv), n: ZN.camp.name + ' · nível ' + (i + 1), sub: ['Perto do portão (tutorial)', 'Meio da ilha', 'Fundo da ilha'][i] + ' · monstros de nível ' + D(L), mobs: MOBS.camp.map(m => m.n).join(', '), g: 'grau 0' }));
    for (const z of ZONES) if (z.lv && z.id !== 'camp') rows.push({ lo: D(z.lv[0]), hi: D(z.lv[1]), n: z.name, sub: REG[z.reg].n, mobs: (MOBS[z.id] || []).map(m => m.n).join(', ') + (ELITES[z.id] ? ' · ★ ' + ELITES[z.id].map(m => m.n).join(', ') : ''), g: gr(z.lv[0]) + (gradeOfLvl(z.lv[1], cur) !== gradeOfLvl(z.lv[0], cur) ? '–' + gradeOfLvl(z.lv[1], cur) : '') });
    rows.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
    const here = (r) => mine && p.lvl >= r.lo && p.lvl <= r.hi;
    h += '<h3>Onde treinar</h3><div class="lv-t">';
    for (const r of rows) h += `<div class="lv-r${here(r) ? ' on' : ''}"><b class="lv-n">${r.lo}–${r.hi}</b><div><b>${esc(r.n)}</b><small>${esc(r.sub)} · equipamento ${r.g}</small><small class="mobs">${esc(r.mobs)}</small></div></div>`;
    h += '</div>';
    const bs = Object.values(BOSSES).slice().sort((a, b) => a.lvl - b.lvl);
    h += '<h3>Chefes</h3><div class="lv-t">' + bs.map(b => `<div class="lv-r"><b class="lv-n">${D(b.lvl)}</b><div><b>${esc(b.n)}</b><small>${esc(ZN[b.zone].name)}</small></div></div>`).join('') + '</div>';
    const vs = VILLAGES.filter(v => v.lvl > 1).slice().sort((a, b) => a.lvl - b.lvl);
    h += '<h3>Cidades e postos</h3><div class="lv-t">' + vs.map(v => `<div class="lv-r"><b class="lv-n">${D(v.lvl)}+</b><div><b>${esc(v.n)}</b><small>${esc(REG[v.reg].n)}${isTown(v) ? ' · cidade' : ' · posto'}</small></div></div>`).join('') + '</div>';
    setBody(E.b_lv, h);
  }

  /* ---------- árvore de habilidades (V) ---------- */
  function renderTree(G) {
    const p = G.player, c = CLASSES[p.cls], S = c.skills;
    const cols = [['Básicas', 'Nível 1', [0, 1]], ['Aprendiz', 'Níveis 3 e 6', [2, 3]], ['Veterano', 'Nível 15', [5]], ['Mestre', 'Nível 20', [4]], ['Lendária', 'Nível 40 · ' + TIERS[1], [6]]];
    const node = i => {
      const k = S[i], L = p.sk[i] || 0, req = SK_LEARN[i], can = (k.tier || 0) <= p.tier && ELV() >= Math.max(req.lvl, k.lvl || 0);
      const stt = L ? (L >= SK_MAX ? 'max' : 'on') : can ? 'can' : 'lk'; // 'off' esconderia o nó (#ui .off)
      const e = skEff(k, L || 1), kn = i < 5 ? i + 1 : i + 3;
      return `<div class="tn ${stt}" title="${esc(k.n + ' [' + kn + '] — ' + k.d + '\n' + e.mp + ' ' + resName(p.cls).toLowerCase() + ' · recarga ' + k.cd + ' s')}"><span class="tn-ic">${L ? k.ic : can ? k.ic : '🔒'}</span><b>${esc(k.n)}</b><small class="tn-d">${esc(k.d)}</small><small>${L ? 'Nível ' + L + '/' + SK_MAX : can ? 'Disponível no Mestre · ✨ ' + req.pts + ' pts' : (k.tier || 0) > p.tier ? 'Requer ' + TIERS[k.tier] : 'Requer nível ' + Math.max(req.lvl, k.lvl || 0)}</small><div class="tn-bar"><i style="width:${L / SK_MAX * 100}%"></i></div>${L && L < SK_MAX && p.sp > 0 ? `<button class="btn mini" data-a="sklv" data-i="${i}">+1</button>` : ''}</div>`;
    };
    let h = `<div class="au-intro">${esc(c.name)} · <b class="gold">${p.sp || 0} pontos de habilidade</b> (~${(SK_PTS_LEVEL * (MAXLV - 1) / Math.max(1, lvCap(p.tier) - 1)).toFixed(1).replace('.', ',')} por nível). Cada nível da habilidade dá +${Math.round(SK_STEP * 100)}% de efeito e um pouco mais de custo de mana. Habilidades são aprendidas com um <b>Mestre de Habilidades</b> (nas vilas) e o nível delas fica limitado pelo seu nível (nível da habilidade ≤ ${skCap(ELV())} agora).</div><div class="tree-w">`;
    cols.forEach(([n, sub, ids], j) => { h += `<div class="tc"><div class="tc-h"><b>${n}</b><small>${sub}</small></div>${ids.map(node).join('')}</div>`; if (j < cols.length - 1) h += '<div class="tarrow">➜</div>'; });
    h += '</div>';
    h += `<button class="btn ghost mini" data-a="sk-reset" title="Devolve os pontos de habilidade">↺ Redistribuir habilidades (💰 ${fmt(40 * Math.round(ELV()))})</button>`;
    setBody(E.p_tree.querySelector('.pb'), h);
  }

  /* ---------- mapa do mundo (M) ---------- */
  const ZLV = { camp: 'Nv 1–29 · treino', town: 'Seguro', oasis: 'Seguro', frostv: 'Seguro', forge: 'Seguro' };
  const zlv = z => ZLV[z.id] || (z.lv ? 'Nv ' + DLV(z.lv[0]) + '–' + DLV(z.lv[1]) : '');
  const REG_LV = { aldoria: 'Níveis 1–50 (treino, campos, floresta e ruínas)', desert: 'Níveis 26–40', snow: 'Níveis 37–50', volcano: 'Níveis 48–60' };
  function objectivePos(G) {
    if (G.gps) return [G.gps.x, G.gps.z, G.gps.n]; // o destino do GPS (escolha do jogador) vale mais que o objetivo da história
    const s = G.main && MAIN[G.main.i];
    if (!s || ELV() < s.lvl) { // sem passo da história: missão ativa (monstro mais próximo da zona dela)
      const q = QUESTS.find(q => G.quests[q.id] && G.quests[q.id].state === 'active' && q.zone); if (!q) return null;
      const p = G.player; let best = null, bd = 1e9;
      for (const m of G.mobs) if (!m.dead && !m.boss && m.zone === q.zone) { const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < bd) { bd = d; best = m; } }
      return best ? [best.x, best.z, q.n] : null;
    }
    if (s.k === 'do') return null;
    if (s.k === 'explore') return [s.x, s.z, s.place];
    if (s.k === 'talk') { const n = NPCS.find(x => x.id === s.npc); return n ? [n.x, n.z, n.n] : null; }
    if (s.k === 'boss') { const b = BOSS_SPOT[s.boss]; return b ? [b[0], b[1], BOSSES[s.boss].n] : null; }
    if (s.k === 'elite') { const l = SITES.find(q => q.k === 'lair' && q.zone === s.zone); if (l && G.mobs.some(m => m.lair === l.id && !m.dead)) return [l.x, l.z, l.n]; }
    const ms = G.mobs.filter(m => !m.boss && (s.k === 'elite' ? m.elite && m.zone === s.zone : s.zone ? m.zone === s.zone : s.mobs.includes(m.id)));
    if (!ms.length) return null;
    const p = G.player; ms.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    return [ms[0].x, ms[0].z, s.item || ms[0].name];
  }
  /* celular: botões da direita ficam recolhidos no botão ☰ e se abrem como um balão; escolher uma opção (ou tocar fora) recolhe de novo */
  function fabSync() { setCls(E.btns, 'open', !!st.fabOpen); setCls(E.fab, 'on', !!st.fabOpen); setText(E.fab, st.fabOpen ? '✕' : '☰'); }
  function mapToggle() { if (!st.wins.includes('map') && typeof G !== 'undefined' && G.player && !st.mapK) mapViewSet('world'); togglePanel('map'); }
  /* celular: botão ❗ "o que fazer agora". Mostra a etapa da história, o destino (já marcado no minimapa) e atalhos para o mapa e as missões */
  const objKey = G => G.main ? G.main.i + ':' + G.main.prog : '';
  function renderObj(G) {
    const M = G.main, s = M && MAIN[M.i], ob = st.obj; let h = '<small class="op-k">📖 História</small>';
    if (s && ELV() >= s.lvl) { const tg = stepGoal(s), pr = Math.min(M.prog, tg); h += `<b>${esc(stepTitle(s))}</b><p>${esc(s.t)}</p>${tg > 1 ? `<small>Progresso: ${pr}/${tg}</small>` : ''}`; }
    else if (s) h += `<b>Próxima etapa da história</b><p>Disponível no nível ${DLV(s.lvl)}. Enquanto isso, faça missões e suba de nível.</p>`;
    else h += '<b>História concluída</b><p>Você completou as Crônicas de Aldoria.</p>';
    const aq = QUESTS.filter(q => G.quests[q.id] && (G.quests[q.id].state === 'active' || G.quests[q.id].state === 'ready'));
    if (aq.length) h += '<small class="op-k">📜 Missões secundárias</small><ul>' + aq.slice(0, 3).map(q => { const qs = G.quests[q.id], tg = qTarget(q), rd = qs.state === 'ready';
      return `<li${rd ? ' class="ok"' : ''}>${esc(q.n)} · ${rd ? '✔ ' + tg + '/' + tg + ', pronta para entregar' : Math.min(qs.prog || 0, tg) + '/' + tg + (q.zone && ZN[q.zone] ? ' (' + ZN[q.zone].name + ')' : '')}</li>`; }).join('') + '</ul>';
    if (ob && G.player) { const d = Math.hypot(ob[0] - G.player.x, ob[1] - G.player.z); h += `<p class="where">📍 ${esc(ob[2] || 'Objetivo')} · ${d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m'} <small>(marcado no minimapa)</small></p>`; }
    const rq = QUESTS.filter(q => G.quests[q.id] && G.quests[q.id].state === 'ready'), rd = G.daily ? G.daily.list.filter(d => d.done && !d.claimed).length : 0;
    let btns = rq.map(q => `<button class="btn primary" data-a="qturn" data-id="${q.id}">✅ Entregar: ${esc(q.n)}</button>`).join('');
    if (rd) btns += `<button class="btn primary" data-a="dailyall">🎁 Resgatar ${rd} diário(s)</button>`;
    if (G.gps || (s && ELV() >= s.lvl && s.k !== 'do')) btns += `<button class="btn ${btns ? '' : 'primary'}" data-a="go">🧭 ${G.gps ? 'Seguir o GPS' : 'Ir até lá'}</button>`;
    if (G.gps) btns += '<button class="btn" data-a="gpscancel">✕ Cancelar GPS</button>';
    h += `<div class="op-b col">${btns}</div><div class="op-b"><button class="btn" data-a="p-map">🗺️ Mapa</button><button class="btn" data-a="p-quest">📜 Missões</button></div>`;
    if (E.objPop._h !== h) { E.objPop._h = h; E.objPop.innerHTML = h; }
  }
  function objSync(G) {
    if (!IS_TOUCH || !E.objPop) return;
    const open = st.objOpen && G.state === 'play' && !st.modal && !G.dead;
    if (open) { st.objSeen = objKey(G); renderObj(G); }
    setVis(E.objPop, open);
    setCls(E.btn.obj, 'pulse', !open && !!st.obj && st.objSeen !== objKey(G));
  }
  /* ---------- terreno do mapa (M e minimapa): a grade de 4 m do world.js é amostrada com interpolação bilinear
     direto na resolução da tela, então a costa e as fronteiras ficam lisas em qualquer zoom (nada de bitmap ampliado) ---------- */
  const ZCOL2 = { town: [200, 182, 132], field: [142, 186, 96], forest: [64, 132, 84], ruins: [158, 146, 170], oasis: [218, 194, 130], dunes: [230, 196, 124],
    frostv: [200, 212, 226], tundra: [226, 234, 245], forge: [146, 108, 100], ashlands: [118, 80, 74] };
  const ZRUG = { field: .55, forest: .8, ruins: 1, dunes: 1.1, tundra: 1.6, ashlands: 1.4 }; // quanto relevo cada bioma tem
  let TG = null;
  function terrGrid() {
    if (TG) return TG;
    const g = zgrid(), nx = g.nx, nz = g.nz, N = nx * nz, ids = g.ids, C = g.C, cols = ids.map(id => ZCOL2[id] || [128, 128, 128]);
    const R = new Float32Array(N), Gg = new Float32Array(N), Bb = new Float32Array(N), T = new Float32Array(N), Hh = new Float32Array(N), Sh = new Float32Array(N), A = new Uint8Array(N);
    const cen = {};
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = WB.x0 + (i + .5) * g.S, z = WB.z0 + (j + .5) * g.S;
      let a, b, t;
      if (C[k] >= 2) { a = g.A[k]; b = g.B[k]; t = g.T[k]; const q = cen[ids[a]] || (cen[ids[a]] = [0, 0, 0]); q[0] += x; q[1] += z; q[2]++; }
      else if (C[k] > -14) { const q = zoneScore(x, z); a = ids.indexOf(q.a); b = ids.indexOf(q.b); t = q.t; } // perto da costa: cor certa dos dois lados
      else { a = b = 0; t = 99; }
      const ca = cols[a], cb = cols[b], w = t < 8 ? .5 * (1 - t / 8) : 0; A[k] = a;
      R[k] = ca[0] + (cb[0] - ca[0]) * w; Gg[k] = ca[1] + (cb[1] - ca[1]) * w; Bb[k] = ca[2] + (cb[2] - ca[2]) * w; T[k] = t;
      const rug = (ZRUG[ids[a]] || .6) * (1 - w) + (ZRUG[ids[b]] || .6) * w;
      Hh[k] = (vnoise(x / 70 + 4.1, z / 70 - 2.3) * .65 + vnoise(x / 24 - 1.7, z / 24 + 6.6) * .35) * 9 * rug + Math.min(Math.max(C[k], 0), 50) * .06;
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { // luz vindo do noroeste
      const k = j * nx + i, l = i > 0 ? k - 1 : k, r = i < nx - 1 ? k + 1 : k, u = j > 0 ? k - nx : k, d = j < nz - 1 ? k + nx : k;
      Sh[k] = Math.max(.8, Math.min(1.16, 1 + ((Hh[l] - Hh[r]) + (Hh[u] - Hh[d])) * .045));
    }
    for (const id in cen) cen[id] = [cen[id][0] / cen[id][2], cen[id][1] / cen[id][2]];
    cen.field = [62, 78]; cen.forest = [-175, -30]; // anéis: o centro cairia em cima da vila
    return (TG = { g, R, G: Gg, B: Bb, T, S: Sh, A, cen });
  }
  /* pinta o terreno numa ImageData: (X0, Z0) = ponto do mundo no canto do pixel (0,0); mpp = metros por pixel */
  function paintTerrain(im, w, h, X0, Z0, mpp) {
    const t = terrGrid(), g = t.g, nx = g.nx, nz = g.nz, S = g.S, C = g.C, Rr = t.R, Gg = t.G, Bb = t.B, T = t.T, Sh = t.S, d = im.data;
    const aa = Math.max(mpp, .35), line = Math.max(1.1 * mpp, .5);
    const IX = new Int32Array(w), TX = new Float32Array(w);
    for (let px = 0; px < w; px++) { const f = (X0 + (px + .5) * mpp - WB.x0) / S - .5; let i = Math.floor(f), tx = f - i; if (i < 0) { i = 0; tx = 0; } if (i > nx - 2) { i = nx - 2; tx = 1; } IX[px] = i; TX[px] = tx; }
    for (let py = 0; py < h; py++) {
      const fz = (Z0 + (py + .5) * mpp - WB.z0) / S - .5; let j = Math.floor(fz), tz = fz - j; if (j < 0) { j = 0; tz = 0; } if (j > nz - 2) { j = nz - 2; tz = 1; }
      for (let px = 0, o = py * w * 4; px < w; px++, o += 4) {
        const tx = TX[px], k = j * nx + IX[px], k1 = k + 1, k2 = k + nx, k3 = k2 + 1, w0 = (1 - tx) * (1 - tz), w1 = tx * (1 - tz), w2 = (1 - tx) * tz, w3 = tx * tz;
        const cc = C[k] * w0 + C[k1] * w1 + C[k2] * w2 + C[k3] * w3;
        let r, gg, b;
        // mar: raso perto da costa, fundo longe; espuma clara junto da praia
        { const dp = Math.max(0, Math.min(1, -cc / 70)); r = 96 - 70 * dp; gg = 176 - 112 * dp; b = 196 - 88 * dp; if (cc < 0 && cc > -7) { const f = (1 + cc / 7) * .35; r += (210 - r) * f; gg += (236 - gg) * f; b += (240 - b) * f; } }
        const land = Math.max(0, Math.min(1, cc / aa + .5));
        if (land > 0) {
          const sh = Sh[k] * w0 + Sh[k1] * w1 + Sh[k2] * w2 + Sh[k3] * w3;
          let lr = (Rr[k] * w0 + Rr[k1] * w1 + Rr[k2] * w2 + Rr[k3] * w3), lg = (Gg[k] * w0 + Gg[k1] * w1 + Gg[k2] * w2 + Gg[k3] * w3), lb = (Bb[k] * w0 + Bb[k1] * w1 + Bb[k2] * w2 + Bb[k3] * w3);
          if (cc < 9) { const f = Math.max(0, Math.min(1, (9 - cc) / 7)) * .75; lr += (232 - lr) * f; lg += (214 - lg) * f; lb += (160 - lb) * f; } // praia
          const tt = T[k] * w0 + T[k1] * w1 + T[k2] * w2 + T[k3] * w3; // fronteira entre biomas: linha fina tracejada pelo próprio campo de distância
          const bd = cc > 6 && tt < line + .6 ? .82 : 1;
          lr *= sh * bd; lg *= sh * bd; lb *= sh * bd;
          r += (lr - r) * land; gg += (lg - gg) * land; b += (lb - b) * land;
        }
        const cl_ = Math.max(0, 1 - Math.abs(cc) / (1.4 * line)) * .8; // contorno da costa
        if (cl_ > 0) { r += (34 - r) * cl_; gg += (44 - gg) * cl_; b += (52 - b) * cl_; }
        d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
      }
    }
  }
  /* símbolos de bioma (árvores, tufos, dunas, picos, colunas, fendas) numa grade fixa do mundo: dão textura sem pixelar */
  function biomeSymbols(c, toS, mpp, Wc, Hc, X0, Z0, u) {
    const want = 30 * u * mpp; let cs = 8; while (cs < want && cs < 256) cs *= 2;
    const s = u * Math.max(.75, Math.min(1.25, cs / mpp / (30 * u))) * 1.0;
    const i0 = Math.floor(X0 / cs) - 1, i1 = Math.ceil((X0 + Wc * mpp) / cs) + 1, j0 = Math.floor(Z0 / cs) - 1, j1 = Math.ceil((Z0 + Hc * mpp) / cs) + 1;
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const hx = hash2(i * 7 + 3, j * 13 - 5), hz = hash2(i * 11 - 9, j * 5 + 1), x = (i + .15 + hx * .7) * cs, z = (j + .15 + hz * .7) * cs;
      if (coastD(x, z) < 10 || inTownSq(x, z, 8) || roadDist(x, z) < 7) continue;
      const id = zoneScore(x, z).a, [px, py] = toS(x, z), v = hash2(i - 31, j + 17);
      if (id === 'forest') { c.fillStyle = 'rgba(28,70,44,.62)'; c.beginPath(); c.moveTo(px, py - 7 * s); c.lineTo(px + 4.5 * s, py + 2 * s); c.lineTo(px - 4.5 * s, py + 2 * s); c.closePath(); c.fill(); c.fillRect(px - .8 * s, py + 2 * s, 1.6 * s, 2.5 * s);
        if (v > .45) { c.beginPath(); c.moveTo(px + 6 * s, py - 4 * s); c.lineTo(px + 9.5 * s, py + 3 * s); c.lineTo(px + 2.5 * s, py + 3 * s); c.closePath(); c.fill(); } }
      else if (id === 'field') { c.strokeStyle = 'rgba(60,110,40,.55)'; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(px - 3 * s, py); c.lineTo(px - 4 * s, py - 4 * s); c.moveTo(px, py); c.lineTo(px, py - 5 * s); c.moveTo(px + 3 * s, py); c.lineTo(px + 4 * s, py - 4 * s); c.stroke(); }
      else if (id === 'ruins') { c.fillStyle = 'rgba(70,60,84,.55)'; c.fillRect(px - 4 * s, py - 6 * s, 2.2 * s, 7 * s); c.fillRect(px + 1.5 * s, py - (v > .5 ? 4 : 7) * s, 2.2 * s, (v > .5 ? 5 : 8) * s); c.fillRect(px - 5 * s, py + 1 * s, 9.5 * s, 1.6 * s); }
      else if (id === 'dunes') { c.strokeStyle = 'rgba(150,104,48,.55)'; c.lineWidth = 1.3 * s; c.beginPath(); c.arc(px, py + 4 * s, 6 * s, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
      else if (id === 'tundra') { c.fillStyle = 'rgba(96,112,138,.6)'; c.beginPath(); c.moveTo(px - 6 * s, py + 3 * s); c.lineTo(px, py - 6 * s); c.lineTo(px + 6 * s, py + 3 * s); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.moveTo(px - 2.2 * s, py - 2.7 * s); c.lineTo(px, py - 6 * s); c.lineTo(px + 2.2 * s, py - 2.7 * s); c.closePath(); c.fill(); }
      else if (id === 'ashlands') { c.strokeStyle = v > .5 ? 'rgba(255,120,40,.6)' : 'rgba(40,20,20,.55)'; c.lineWidth = 1.3 * s; c.beginPath(); c.moveTo(px - 5 * s, py - 2 * s); c.lineTo(px - 1 * s, py + 1 * s); c.lineTo(px + 1.5 * s, py - 2.5 * s); c.lineTo(px + 5 * s, py + 1.5 * s); c.stroke(); }
    }
  }
  /* zoom e arrasto do mapa M: abas = atalhos de zoom; roda do mouse aproxima, arrastar move */
  const mapCv = () => E.p_map.querySelector('.map-c');
  const MAP_FIT = () => { const cv = mapCv(); return Math.min(cv.width / (WB.x1 - WB.x0), cv.height / (WB.z1 - WB.z0)) * .97; };
  const MAP_ZMAX = 14; // zoom máximo em relação ao continente inteiro (vê as casas das vilas)
  function mapClamp() { // não deixa o centro sair do continente
    st.mapK = Math.max(MAP_FIT(), Math.min(MAP_FIT() * MAP_ZMAX, st.mapK));
    st.mapC = [Math.max(WB.x0, Math.min(WB.x1, st.mapC[0])), Math.max(WB.z0, Math.min(WB.z1, st.mapC[1]))];
  }
  function mapViewSet(id) {
    st.mapView = id; const g = REG[id];
    if (!g) { st.mapK = MAP_FIT(); st.mapC = [(WB.x0 + WB.x1) / 2, (WB.z0 + WB.z1) / 2]; }
    else { st.mapK = MAP_FIT() * 2.6; st.mapC = [g.cx, g.cz]; }
  }
  /* zoom mantendo fixo o ponto (mx, my) do canvas (padrão: centro) */
  function mapZoom(f, mx, my) {
    const cv = mapCv(); if (!st.mapK) mapViewSet('world'); if (mx == null) { mx = cv.width / 2; my = cv.height / 2; }
    const wx = st.mapC[0] + (mx - cv.width / 2) / st.mapK, wz = st.mapC[1] + (my - cv.height / 2) / st.mapK, k2 = Math.max(MAP_FIT(), Math.min(MAP_FIT() * MAP_ZMAX, st.mapK * f));
    st.mapC = [wx - (mx - cv.width / 2) / k2, wz - (my - cv.height / 2) / k2]; st.mapK = k2; st.mapView = 'free'; mapClamp();
  }
  function mapCenterMe() {
    if (typeof G === 'undefined' || !G.player) return; if (!st.mapK) mapViewSet('world');
    st.mapC = [G.player.x, G.player.z]; if (st.mapK < MAP_FIT() * 4) st.mapK = MAP_FIT() * 4; st.mapView = 'free'; mapClamp();
  }
  let mapRaf = 0;
  const mapReq = () => { if (mapRaf) return; mapRaf = requestAnimationFrame(() => { mapRaf = 0; if (typeof G !== 'undefined' && st.wins.includes('map')) renderMap(G); }); };
  function mapEvents(cv) {
    if (cv._ev) return; cv._ev = 1; let drag = null;
    const sc = () => cv.width / cv.getBoundingClientRect().width;
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), s = sc();
      mapZoom(e.deltaY < 0 ? 1.25 : .8, (e.clientX - r.left) * s, (e.clientY - r.top) * s); if (typeof G !== 'undefined') renderMap(G); }, { passive: false });
    cv.addEventListener('mousedown', e => { drag = [e.clientX, e.clientY]; });
    window.addEventListener('mouseup', () => { drag = null; });
    window.addEventListener('mousemove', e => { if (!drag || !st.mapK) return; const s = sc(); st.mapC = [st.mapC[0] - (e.clientX - drag[0]) * s / st.mapK, st.mapC[1] - (e.clientY - drag[1]) * s / st.mapK]; drag = [e.clientX, e.clientY]; st.mapView = 'free'; mapClamp(); mapReq(); });
    /* toque: um dedo arrasta, dois dedos fazem pinça (zoom), toque curto marca o destino do GPS.
       Dedos "fantasma" (soltar perdido, aba trocada) são descartados: sem isso qualquer toque virava pinça e o mapa pulava de lugar. */
    const pts = new Map(); let tap = null, pinch = 0;
    const drop = id => { pts.delete(id); if (pts.size < 2) pinch = 0; if (!pts.size) tap = null; };
    const fresh = () => { const t = performance.now(); for (const [id, q] of pts) if (t - q.t > 1500) drop(id); };
    cv.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return; e.preventDefault(); fresh(); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
      if (pts.size === 1) tap = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false };
      else { tap = null; const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerType !== 'touch' || !pts.has(e.pointerId) || !st.mapK) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }); const s = sc();
      if (pts.size === 1) { if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8) tap.moved = true; if (!tap || tap.moved) { st.mapC = [st.mapC[0] - (e.clientX - prev.x) * s / st.mapK, st.mapC[1] - (e.clientY - prev.y) * s / st.mapK]; st.mapView = 'free'; mapClamp(); mapReq(); } }
      else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = cv.getBoundingClientRect(); if (pinch > 4 && d > 4) { mapZoom(Math.max(.6, Math.min(1.6, d / pinch)), ((a.x + b.x) / 2 - r.left) * s, ((a.y + b.y) / 2 - r.top) * s); mapReq(); } pinch = d; }
    });
    const up = e => { if (e.pointerType !== 'touch' || !pts.has(e.pointerId)) return; const t0 = tap; const n = pts.size; drop(e.pointerId); if (t0 && !t0.moved && n === 1 && e.timeStamp - t0.t < 600) mapTap(t0.x, t0.y); }; // tempo pelo carimbo do evento: quadro lento não atrasa a conta
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => drop(e.pointerId)); cv.addEventListener('lostpointercapture', e => drop(e.pointerId));
    window.addEventListener('pointerup', e => { if (pts.has(e.pointerId)) drop(e.pointerId); }); window.addEventListener('pointercancel', e => drop(e.pointerId)); window.addEventListener('blur', () => { pts.clear(); tap = null; pinch = 0; });
  }
  function mapTap(cx, cy) { const w = mapToWorld(cx, cy);  if (!w) return; st.mapPin = w; mapGpsSync(); mapReq(); }
  const fmDist = d => d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m';
  function mapGpsSync() { // barra do mapa: confirma o destino tocado, ou mostra o GPS ativo
    const el = E.p_map && E.p_map.querySelector('.map-gps'); if (!el || !G.player) return; const pin = st.mapPin, g = G.gps, p = G.player; let h = '';
    if (pin) h = `<span>📍 ${fmDist(Math.hypot(pin[0] - p.x, pin[1] - p.z))}${coastD(pin[0], pin[1]) < 2 ? ' · água: vou até a margem' : ''}</span><button class="btn primary" data-a="gpsgo">Ir até aqui</button><button class="btn" data-a="gpsx">✕</button>`;
    else if (g) h = `<span>🧭 ${esc(g.n)} · ${fmDist(Math.hypot(g.x - p.x, g.z - p.z))}</span><button class="btn" data-a="gpscancel">Cancelar GPS</button>`;
    if (el._h !== h) { el._h = h; el.innerHTML = h; } setVis(el, !!h);
  }
  /* ponto do mundo sob (clientX, clientY) no mapa M aberto, ou null (usado pelo teleporte do painel do administrador) */
  function mapToWorld(cx, cy) {
    if (!st.wins.includes('map') || !st.mapK) return null;
    const cv = E.p_map.querySelector('.map-c'), r = cv.getBoundingClientRect(); if (!r.width) return null;
    const s = cv.width / r.width, mx = (cx - r.left) * s, my = (cy - r.top) * s;
    if (mx < 0 || my < 0 || mx > cv.width || my > cv.height) return null;
    return [st.mapC[0] + (mx - cv.width / 2) / st.mapK, st.mapC[1] + (my - cv.height / 2) / st.mapK];
  }
  /* ícones do mapa: desenhados em px do canvas; u = px do canvas por px CSS (os mesmos no mapa M, na legenda e no minimapa) */
  const MI = {
    enc(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.arc(0, 0, 9.5, 0, 7); c.fillStyle = '#ffb02e'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#4a2a05'; c.stroke(); c.fillStyle = '#3a1d02'; c.fillRect(-1.6, -6, 3.2, 7.5); c.beginPath(); c.arc(0, 4.6, 1.9, 0, 7); c.fill(); c.restore(); },
        town(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fillStyle = '#f4dc94'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#3a2508'; c.stroke();
      c.fillStyle = '#4a3010'; c.fillRect(-6.5, -2, 13, 7.5); c.fillRect(-6.5, -6.5, 3.4, 4.6); c.fillRect(-1.7, -6.5, 3.4, 4.6); c.fillRect(3.1, -6.5, 3.4, 4.6); c.fillStyle = '#f4dc94'; c.fillRect(-1.6, 1.2, 3.2, 4.3); c.restore(); },
    post(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.arc(0, 0, 8.5, 0, 7); c.fillStyle = '#e8c48a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#3a2508'; c.stroke();
      c.beginPath(); c.moveTo(-5.5, 4); c.lineTo(0, -5.5); c.lineTo(5.5, 4); c.closePath(); c.fillStyle = '#5a3612'; c.fill(); c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -1); c.strokeStyle = '#e8c48a'; c.lineWidth = 1.4; c.stroke(); c.restore(); },
    portal(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fillStyle = 'rgba(190,150,255,.45)'; c.fill(); c.lineWidth = 2.6; c.strokeStyle = '#b48cff'; c.stroke(); c.beginPath(); c.arc(0, 0, 6, 0, 7); c.lineWidth = 1; c.strokeStyle = '#2a1650'; c.stroke(); c.restore(); },
    boss(c, x, y, u, dead) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.arc(0, 0, 10.5, 0, 7); c.fillStyle = dead ? '#5a5a5a' : '#c2271c'; c.fill(); c.lineWidth = 2; c.strokeStyle = dead ? '#999' : '#ffcf6a'; c.stroke();
      c.fillStyle = '#fff4e8'; c.beginPath(); c.arc(0, -1.5, 5, 0, 7); c.fill(); c.fillRect(-3, 2, 6, 3.5); c.fillStyle = dead ? '#5a5a5a' : '#7a0d08'; c.beginPath(); c.arc(-2, -1.5, 1.5, 0, 7); c.arc(2, -1.5, 1.5, 0, 7); c.fill(); c.fillRect(-.5, 2.6, 1, 2.9); c.restore(); },
    dungeon(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.moveTo(0, -10); c.lineTo(9.5, 0); c.lineTo(0, 10); c.lineTo(-9.5, 0); c.closePath(); c.fillStyle = '#74d8ef'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#0d2a33'; c.stroke();
      c.beginPath(); c.moveTo(-3.2, 4.5); c.lineTo(-3.2, -.5); c.arc(0, -.5, 3.2, Math.PI, 0); c.lineTo(3.2, 4.5); c.closePath(); c.fillStyle = '#0d2a33'; c.fill(); c.restore(); },
    lair(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.3 : 10; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = '#ffcf4a'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#3a2508'; c.stroke(); c.restore(); },
    mark(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.moveTo(0, -5.5); c.lineTo(5, 0); c.lineTo(0, 5.5); c.lineTo(-5, 0); c.closePath(); c.fillStyle = '#e6d2a0'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#3a2a10'; c.stroke(); c.restore(); },
    lake(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.ellipse(0, 0, 8, 5.5, 0, 0, 7); c.fillStyle = '#5fb0d8'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#1f4c66'; c.stroke(); c.restore(); },
    obj(c, x, y, u, pu) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.arc(0, 0, 14 * (pu || 1), 0, 7); c.lineWidth = 3; c.strokeStyle = 'rgba(255,216,74,.9)'; c.stroke();
      c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#3a2508'; c.stroke(); c.fillStyle = '#3a2508'; c.fillRect(-1.3, -5, 2.6, 6); c.fillRect(-1.3, 2.4, 2.6, 2.4); c.restore(); },
    me(c, x, y, u, a) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.arc(0, 0, 15, 0, 7); c.fillStyle = 'rgba(79,209,255,.22)'; c.fill(); c.rotate(-(a || 0) + Math.PI);
      c.beginPath(); c.moveTo(0, -13); c.lineTo(8.5, 9); c.lineTo(0, 4); c.lineTo(-8.5, 9); c.closePath(); c.fillStyle = '#4fd1ff'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#fff'; c.stroke(); c.restore(); },
    pin(c, x, y, u) { c.save(); c.translate(x, y); c.scale(u * 1.2, u * 1.2); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-11, -14, -9, -26, 0, -26); c.bezierCurveTo(9, -26, 11, -14, 0, 0); c.fillStyle = '#e53935'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); c.beginPath(); c.arc(0, -17, 3.6, 0, 7); c.fillStyle = '#fff'; c.fill(); c.restore(); },
    mob(c, x, y, u, el) { c.beginPath(); c.arc(x, y, (el ? 3.6 : 2.6) * u, 0, 7); c.fillStyle = el ? '#ffcf4a' : '#ff5a4a'; c.fill(); c.lineWidth = u; c.strokeStyle = 'rgba(30,10,5,.85)'; c.stroke(); },
    road(c, x, y, u) { c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 9 * u, y + 3 * u); c.quadraticCurveTo(x, y - 5 * u, x + 9 * u, y + 1 * u); c.lineWidth = 5 * u; c.strokeStyle = 'rgba(70,44,18,.75)'; c.stroke(); c.lineWidth = 3 * u; c.strokeStyle = '#e3c890'; c.stroke(); },
  };
  const MAP_LEG = [['town', 'Vila'], ['post', 'Posto'], ['portal', 'Portal'], ['road', 'Estrada'], ['boss', 'Chefe (nível)'], ['dungeon', 'Masmorra'], ['lair', 'Covil de elite'], ['obj', 'Objetivo'], ['me', 'Você'], ['mob', 'Monstro próximo']];
  const rrect = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
  /* rótulos com tamanho fixo em px de tela; os de maior prioridade entram primeiro e os que colidirem somem */
  function placeLabels(c, L, occ, Wc, Hc, u) {
    L.sort((a, b) => b.pr - a.pr);
    const hit = q => occ.some(o => q[0] < o[2] && q[2] > o[0] && q[1] < o[3] && q[3] > o[1]);
    for (const l of L) {
      const fs = l.fs * u, sfs = 11.5 * u; c.font = l.font.replace('#', fs.toFixed(1) + 'px');
      let w = c.measureText(l.t).width; if (l.sub) { c.font = '600 ' + sfs.toFixed(1) + 'px system-ui, sans-serif'; w = Math.max(w, c.measureText(l.sub).width); }
      const px = l.bg ? 6 * u : 2 * u, h = fs * 1.2 + (l.sub ? sfs * 1.15 : 0) + (l.bg ? 4 * u : 0), bw = w + px * 2, r = (l.r || 0) * u;
      const cands = l.r == null ? [[0, 0], [0, -h], [0, h], [-bw * .6, 0], [bw * .6, 0], [0, -2 * h], [0, 2 * h]] : [[0, r + 3 * u + h / 2], [0, -r - 3 * u - h / 2], [r + 4 * u + bw / 2, 0], [-r - 4 * u - bw / 2, 0]];
      for (const [dx, dy] of cands) {
        const cx = l.x + dx, cy = l.y + dy, q = [cx - bw / 2, cy - h / 2, cx + bw / 2, cy + h / 2];
        if (q[0] < 2 || q[1] < 2 || q[2] > Wc - 2 || q[3] > Hc - 2 || hit(q)) continue;
        occ.push([q[0] - 2 * u, q[1] - 1 * u, q[2] + 2 * u, q[3] + 1 * u]);
        if (l.bg) { rrect(c, q[0], q[1], bw, h, 5 * u); c.fillStyle = 'rgba(18,14,24,.8)'; c.fill(); c.lineWidth = u; c.strokeStyle = l.edge || 'rgba(255,226,160,.3)'; c.stroke(); }
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        const ty = cy - (l.sub ? sfs * 1.15 / 2 : 0);
        c.font = l.font.replace('#', fs.toFixed(1) + 'px');
        if (!l.bg) { c.lineWidth = 4 * u; c.strokeStyle = 'rgba(20,14,8,.85)'; c.strokeText(l.t, cx, ty); }
        c.fillStyle = l.col; c.fillText(l.t, cx, ty);
        if (l.sub) { c.font = '600 ' + sfs.toFixed(1) + 'px system-ui, sans-serif'; const sy = ty + fs * .6 + sfs * .6; if (!l.bg) { c.lineWidth = 3.5 * u; c.strokeText(l.sub, cx, sy); } c.fillStyle = l.subc || '#ffd57a'; c.fillText(l.sub, cx, sy); }
        break;
      }
    }
    c.textBaseline = 'alphabetic';
  }
  const TOWN_FILL = { aldoria: '#d2bd8c', desert: '#e6d09a', snow: '#dfe5ee', volcano: '#8f6d62' };
  /* camada fixa (terreno, símbolos, lagos, estradas, plantas das vilas): só é refeita quando a vista muda */
  function mapBase(cv, Wc, Hc, K, C0, u) {
    const key = [Wc, Hc, K.toFixed(6), C0[0].toFixed(2), C0[1].toFixed(2)].join('|');
    if (cv._bk && cv._bkKey === key) return cv._bk;
    const bk = cv._bk && cv._bk.width === Wc && cv._bk.height === Hc ? cv._bk : document.createElement('canvas'); bk.width = Wc; bk.height = Hc;
    const c = bk.getContext('2d'), mpp = 1 / K, X0 = C0[0] - Wc / 2 * mpp, Z0 = C0[1] - Hc / 2 * mpp, toS = (x, z) => [(x - X0) * K, (z - Z0) * K];
    const im = c.createImageData(Wc, Hc); paintTerrain(im, Wc, Hc, X0, Z0, mpp); c.putImageData(im, 0, 0);
    biomeSymbols(c, toS, mpp, Wc, Hc, X0, Z0, u);
    // lagoa do campo
    { const [x, y] = toS(LM.pond[0], LM.pond[1]), r = Math.max(5.4 * K, 4 * u); c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#5fb0d8'; c.fill(); c.lineWidth = 1.5 * u; c.strokeStyle = '#1f4c66'; c.stroke(); }
    // estradas: contorno escuro + miolo claro, largura mínima em px de tela
    c.lineJoin = 'round'; c.lineCap = 'round';
    const rw = Math.max(2.6 * u, ROAD_W * 2 * K);
    for (const pass of [0, 1]) { c.lineWidth = pass ? rw : rw + 2.4 * u; c.strokeStyle = pass ? '#e3c890' : 'rgba(70,44,18,.7)';
      for (const r of ROADS) { c.beginPath(); r.forEach((q, i) => { const [x, y] = toS(q[0], q[1]); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); } }
    // ligações entre portais vizinhos
    { const V = {}; for (const v of VILLAGES) V[v.id] = v; c.setLineDash([7 * u, 7 * u]); c.lineWidth = 1.6 * u; c.strokeStyle = 'rgba(200,170,255,.75)';
      for (const v of VILLAGES) for (const l of v.links) if (v.id < l) { const a = toS(v.portal[0], v.portal[1]), b = toS(V[l].portal[0], V[l].portal[1]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      c.setLineDash([]); }
    // plantas das vilas (muralha, casas) e dos postos quando há espaço na tela
    for (const v of VILLAGES) {
      const [x, y] = toS(v.cx, v.cz);
      if (isTown(v)) { const h = v.hs * K; if (h < 9 * u) continue;
        c.fillStyle = TOWN_FILL[v.id] || '#d2bd8c'; c.fillRect(x - h, y - h, h * 2, h * 2); c.lineWidth = Math.max(2 * u, 1.2 * K); c.strokeStyle = '#4a3618'; c.strokeRect(x - h, y - h, h * 2, h * 2);
        if (h > 45 * u) { // casas
          for (const sl of townSlots(v)) { const [, lx, lz, rot, w, d] = sl, [sx, sy] = toS(v.cx + lx, v.cz + lz); c.save(); c.translate(sx, sy); c.rotate(-rot);
            c.fillStyle = v.id === 'snow' ? '#7d8796' : v.id === 'desert' ? '#c58f5a' : v.id === 'volcano' ? '#4a3a3a' : '#9a4e34'; c.fillRect(-w / 2 * K, -d / 2 * K, w * K, d * K); c.lineWidth = u; c.strokeStyle = 'rgba(30,20,10,.8)'; c.strokeRect(-w / 2 * K, -d / 2 * K, w * K, d * K); c.restore(); }
          if (v.id === 'desert') { c.beginPath(); c.arc(x, y, 7.9 * K, 0, 7); c.fillStyle = '#5fb0d8'; c.fill(); }
          if (v.id === 'volcano') { c.beginPath(); c.arc(x, y, 5.4 * K, 0, 7); c.fillStyle = '#ff7a2a'; c.fill(); }
        } }
      else if (v.r * K > 5 * u) { c.beginPath(); c.arc(x, y, v.r * K, 0, 7); c.fillStyle = 'rgba(220,196,140,.9)'; c.fill(); c.lineWidth = 1.5 * u; c.strokeStyle = '#4a3618'; c.stroke(); }
    }
    cv._bkKey = key; return (cv._bk = bk);
  }
  function renderMap(G) {
    const cv = mapCv(), c = cv.getContext('2d'), p = G.player, rc = cv.getBoundingClientRect();
    if (rc.width > 10) { // canvas na resolução real da tela (texto nítido e com tamanho fixo)
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(rc.width * dpr), h = Math.round(rc.height * dpr);
      if (w !== cv.width || h !== cv.height) { if (st.mapK) st.mapK *= w / cv.width; cv.width = w; cv.height = h; }
    }
    mapEvents(cv); if (!st.mapK) mapViewSet(st.mapView || 'world'); mapClamp();
    const Wc = cv.width, Hc = cv.height, K = st.mapK, C0 = st.mapC, view = st.mapView, zoom = K / MAP_FIT(), u = rc.width > 10 ? Wc / rc.width : 1, ue = u * (IS_TOUCH ? .62 : 1), showLg = !IS_TOUCH || !!st.mapLeg, tg = terrGrid(); // ue: ícones menores no celular
    const toS = (x, z) => [Wc / 2 + (x - C0[0]) * K, Hc / 2 + (z - C0[1]) * K];
    const inView = (x, z, m) => { const q = toS(x, z), e = (m || 40) * u; return q[0] > -e && q[1] > -e && q[0] < Wc + e && q[1] < Hc + e; };
    c.drawImage(mapBase(cv, Wc, Hc, K, C0, u), 0, 0);
    const occ = [], L = [], ic = [];
    // legenda (canto inferior esquerdo) e área dos botões de zoom (canto superior direito) não recebem rótulos
    const lgR = 17 * u, lgW = 122 * u, lgP = 8 * u, lgRows = Math.ceil(MAP_LEG.length / 2), lgBox = [8 * u, Hc - 8 * u - lgRows * lgR - lgP * 2 - 14 * u, 8 * u + lgW * 2 + lgP * 2, Hc - 8 * u];
    occ.push([Wc - 52 * u, 0, Wc, 132 * u]); if (showLg) occ.push(lgBox);
    // monstros só de perto (de longe viram ruído; a zona e a faixa de nível já dizem o que há ali)
    if (zoom >= 6) for (const m of G.mobs) { if (m.dead || m.boss || !inView(m.x, m.z, 4) || Math.hypot(m.x - p.x, m.z - p.z) > 140) continue; const [x, y] = toS(m.x, m.z); MI.mob(c, x, y, ue, m.elite || m.champ); }
    const add = (kind, x, z, r, lab, arg) => { if (!inView(x, z)) return; const [sx, sy] = toS(x, z); ic.push([kind, sx, sy, arg]); occ.push([sx - r * ue, sy - r * ue, sx + r * ue, sy + r * ue]); if (lab) L.push(Object.assign({ x: sx, y: sy, r }, lab)); };
    const POI = '600 # system-ui, sans-serif', SERIF = '700 # Georgia, serif';
    for (const l of LANDMARKS) { if (/Lagoa/.test(l.n)) add('lake', l.x, l.z, 7, { t: l.n, pr: 45, fs: 12, font: POI, col: '#cfeeff', bg: 1 }); else add('mark', l.x, l.z, 5, { t: l.n, pr: 40, fs: 12, font: POI, col: '#f1e2bd', bg: 1 }); }
    for (const s of SITES) { const lair = s.k === 'lair'; add(lair ? 'lair' : 'dungeon', s.x, s.z, 10, { t: s.n, pr: lair ? 66 : 70, fs: 12.5, font: POI, col: lair ? '#ffe7a0' : '#c4f3ff', bg: 1 }); }
    for (const n of G.npcs || []) if (n.kind === 'enc') add('enc', n.x, n.z, 10, { t: n.n, sub: n.role, subc: '#ffd27a', pr: 80, fs: 12, font: POI, col: '#ffe7b0', bg: 1 });
    if (G.encSpot) add('enc', G.encSpot.x, G.encSpot.z, 9, { t: (G.encSpot.n || 'Tesouro') + '?', pr: 78, fs: 12, font: POI, col: '#ffe7b0', bg: 1 });
    for (const id in BOSS_SPOT) { const b = BOSSES[id], dead = G.mobs.some(m => m.id === id && m.dead); add('boss', BOSS_SPOT[id][0], BOSS_SPOT[id][1], 11, { t: b.n, sub: 'Nv ' + DLV(b.lvl) + (dead ? ' · derrotado' : ''), subc: dead ? '#aaa' : '#ff9d8a', pr: 75, fs: 12.5, font: POI, col: dead ? '#bbb' : '#ffc4b8', bg: 1, edge: 'rgba(255,120,100,.4)' }, dead); }
    for (const v of VILLAGES) { const big = isTown(v), pv = zoom >= 5; // de perto o portal aparece no lugar certo
      if (pv) add('portal', v.portal[0], v.portal[1], 6);
      add(big ? 'town' : 'post', v.cx, v.cz, big ? 12 : 9, { t: v.n, pr: big ? 92 : 86, fs: big ? 14 : 12.5, font: SERIF, col: '#fff1cc', bg: 1 }); }
    // zonas: nome + faixa de nível; de longe 1 rótulo por zona, de perto 1 por núcleo do bioma
    { const pts = []; for (const id in tg.cen) if (ZN[id] && ZN[id].lv) pts.push([id, tg.cen[id][0], tg.cen[id][1], zoom < 2 ? 72 : 58]);
      if (zoom >= 1.8) for (const q of ZSEED) { const x = q[1] * CK, z = q[2] * CK; if (coastD(x, z) > 25 && zoneScore(x, z).a === q[0] && !pts.some(o => o[0] === q[0] && Math.hypot(o[1] - x, o[2] - z) < 160)) pts.push([q[0], x, z, 54]); }
      for (const [id, x, z, pr] of pts) { if (!inView(x, z, 0) || (zoom >= 3 && inTownSq(x, z, 12))) continue; const [sx, sy] = toS(x, z), zn = ZN[id]; L.push({ x: sx, y: sy, t: zn.name, sub: zlv(zn), pr, fs: 15, font: '600 italic # Georgia, serif', col: '#fff6e0' }); } }
    // objetivo e jogador por cima de tudo
    const ob = objectivePos(G), pu = 1 + .12 * Math.sin(performance.now() / 200);
    if (ob && inView(ob[0], ob[1])) { const [x, y] = toS(ob[0], ob[1]); occ.push([x - 15 * ue, y - 15 * ue, x + 15 * ue, y + 15 * ue]); L.push({ x, y, r: 16, t: ob[2], pr: 100, fs: 13, font: '700 # system-ui, sans-serif', col: '#ffe066', bg: 1, edge: 'rgba(255,216,74,.6)' }); }
    if (inView(p.x, p.z)) { const [x, y] = toS(p.x, p.z); occ.push([x - 14 * ue, y - 14 * ue, x + 14 * ue, y + 14 * ue]); }
    if (G.gps) { const rt = [[p.x, p.z]].concat(G.gps.wp.slice(G.gps.i)); c.save(); c.setLineDash([7 * u, 6 * u]); c.lineWidth = 3 * u; c.lineJoin = 'round'; c.strokeStyle = 'rgba(79,209,255,.95)'; c.beginPath(); rt.forEach((q, i) => { const [x, y] = toS(q[0], q[1]); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); c.restore(); }
    for (const [k, x, y, a] of ic) MI[k](c, x, y, ue, a);
    placeLabels(c, L, occ, Wc, Hc, u * (IS_TOUCH ? .85 : 1));
    if (ob && inView(ob[0], ob[1])) { const [x, y] = toS(ob[0], ob[1]); MI.obj(c, x, y, ue, pu); }
    if (st.mapPin) { const [x, y] = toS(st.mapPin[0], st.mapPin[1]); MI.pin(c, x, y, ue); }
    mapGpsSync();
    if (inView(p.x, p.z)) { const [x, y] = toS(p.x, p.z); MI.me(c, x, y, ue, p.rot); }
    else { // jogador fora da vista: seta na borda apontando para ele
      const [x, y] = toS(p.x, p.z), a = Math.atan2(y - Hc / 2, x - Wc / 2), m = 18 * u, ex = Math.max(m, Math.min(Wc - m, Wc / 2 + Math.cos(a) * Wc)), ey = Math.max(m, Math.min(Hc - m, Hc / 2 + Math.sin(a) * Hc));
      c.save(); c.translate(ex, ey); c.rotate(a); c.beginPath(); c.moveTo(11 * u, 0); c.lineTo(-6 * u, 7 * u); c.lineTo(-6 * u, -7 * u); c.closePath(); c.fillStyle = '#4fd1ff'; c.fill(); c.lineWidth = 2 * u; c.strokeStyle = '#fff'; c.stroke(); c.restore(); }
    // legenda (no celular só quando o botão ? está ligado)
    if (showLg) { rrect(c, lgBox[0], lgBox[1], lgBox[2] - lgBox[0], lgBox[3] - lgBox[1], 7 * u); c.fillStyle = 'rgba(16,12,22,.82)'; c.fill(); c.lineWidth = u; c.strokeStyle = 'rgba(255,226,160,.3)'; c.stroke();
    c.font = '700 ' + (10 * u) + 'px system-ui, sans-serif'; c.fillStyle = '#e9c97a'; c.textAlign = 'left'; c.fillText('LEGENDA', lgBox[0] + lgP, lgBox[1] + lgP + 8 * u);
    MAP_LEG.forEach(([k, n], i) => { const col = i % 2, row = i >> 1, x = lgBox[0] + lgP + col * lgW, y = lgBox[1] + lgP + 14 * u + row * lgR + lgR / 2;
      c.save(); c.translate(x + 9 * u, y); c.scale(.62, .62); c.translate(-(x + 9 * u), -y); MI[k](c, x + 9 * u, y, u, k === 'me' ? Math.PI : undefined); c.restore();
      c.font = '600 ' + (11.5 * u) + 'px system-ui, sans-serif'; c.fillStyle = '#efe4cc'; c.textBaseline = 'middle'; c.fillText(n, x + 22 * u, y); c.textBaseline = 'alphabetic'; }); }
    // escala + dica
    { let m = 10; for (const s of [10, 20, 50, 100, 200, 500]) if (s * K <= 120 * u) m = s; const bw = m * K, x1 = Wc - 12 * u, x0 = x1 - bw, y = Hc - 14 * u;
      rrect(c, x0 - 10 * u, y - 30 * u, bw + 20 * u, 40 * u, 6 * u); c.fillStyle = 'rgba(16,12,22,.72)'; c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 2 * u; c.beginPath(); c.moveTo(x0, y - 4 * u); c.lineTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y - 4 * u); c.stroke();
      c.font = '600 ' + (11 * u) + 'px system-ui, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(m + ' m', (x0 + x1) / 2, y - 6 * u);
      c.font = (10.5 * u) + 'px system-ui, sans-serif'; c.fillStyle = 'rgba(255,240,210,.8)'; c.fillText('zoom ' + zoom.toFixed(1) + '×', (x0 + x1) / 2, y - 19 * u); }
    // painel lateral
    const here = regionAt(p.x, p.z), zn = G.zone, one = REG[view] || null;
    let h = '<div class="tabs map-tabs">' + [['world', '🌍 Continente']].concat(REGIONS.map(g => [g.id, g.n.replace(/^(Reino|Deserto|Cratera) d[eo] /, '')])).map(([id, l]) => `<button class="tab${view === id ? ' on' : ''}" data-a="mapv" data-id="${id}">${esc(l)}</button>`).join('') + '</div>';
    h += `<div class="ms-h">Você está em</div><div class="ms-b">${esc(zn ? zn.name : '')}<small>${esc(here.n)}${zn ? ' · ' + zlv(zn) : ''}</small></div>`;
    if (ob && G.gps) h += `<div class="ms-h">Destino do GPS</div><div class="ms-b obj">🧭 ${esc(ob[2])}<small>${fmDist(Math.hypot(ob[0] - G.player.x, ob[1] - G.player.z))} · o personagem anda sozinho; mexer no joystick pausa</small></div>`;
    else if (ob) h += `<div class="ms-h">Objetivo da história</div><div class="ms-b obj">❗ ${esc(ob[2])}<small>${esc(stepLine(MAIN[G.main.i]))}</small></div>`;
    h += `<div class="ms-h">${one ? 'Zonas e monstros' : 'Biomas'}</div>`;
    if (one) for (const z of one.zones) h += `<div class="ms-r"><b>${esc(z.name)}</b><small>${zlv(z)}</small>${MOBS[z.id] ? `<small class="mobs">${MOBS[z.id].map(m => esc(m.n)).join(', ')}${ELITES[z.id] ? '<br>★ Elites: ' + ELITES[z.id].map(m => esc(m.n)).join(', ') : ''}</small>` : '<small class="mobs">Vila segura</small>'}</div>`;
    for (const g of (one ? [] : REGIONS)) {
      const v = VILLAGES.filter(v => v.reg === g.id);
      h += `<div class="ms-r"><b>${esc(g.n)}</b><small>${REG_LV[g.id]} · ${v.map(x => esc(x.n)).join(', ')}</small><small class="mobs">${g.zones.filter(z => MOBS[z.id]).map(z => esc(z.name) + ': ' + MOBS[z.id].map(m => m.n).join(', ')).join('<br>')}</small></div>`;
    }
    h += '<div class="ms-h">Locais de missão</div>' + SITES.map(s => `<div class="ms-r"><b>${s.k === 'lair' ? '★' : '❖'} ${esc(s.n)}</b><small>${s.k === 'lair' ? 'Covil de elite · ' + esc(ZN[s.zone].name) : 'Masmorra · ' + esc(zoneAt(s.x, s.z).name)}</small></div>`).join('');
    h += '<small class="dim">Roda do mouse: zoom no cursor · arrastar: mover · norte para cima. Portais levam só às vilas vizinhas (linhas roxas tracejadas).</small>';
    const side = E.p_map.querySelector('.map-side'); if (side._h !== h) { side._h = h; side.innerHTML = h; }
  }

  /* diálogos de NPC */
  function dlgMsg() {
    if (!st.msg) return '';
    return `<div class="fb ${st.msg.ok ? 'ok' : 'bad'}">${esc(st.msg.text)}</div>`;
  }
  function renderDlg(G) {
    const p = G.player, nid = st.npc, pv = String(nid).startsWith('portal:') && VILLAGES.find(v => 'portal:' + v.id === nid), n = pv ? { n: 'Portal · ' + pv.n, role: 'Portal de teletransporte', kind: 'portal', vil: pv.id } : (NPCS.find(x => x.id === nid) || { n: nid, role: '', kind: nid }), id = n.kind;
    setText(E.npcN, n.n); setText(E.npcR, n.role); setText(E.npcIc, NPC_IC[id] || '🙂');
    let h = '';
    { const s = G.main && MAIN[G.main.i];
      if (s && s.k === 'talk' && s.npc === nid && ELV() >= s.lvl) h += `<div class="story-d"><div class="sd-t">📖 ${esc(CHAP[s.ch].n)}</div><div class="say">“${esc(s.say)}”</div><button class="btn primary" data-a="story" data-id="${nid}">Continuar a história ▸</button></div>`;
      else if (id === 'story') h += `<div class="say">“${esc(STORY_IDLE[nid] || 'Volte quando precisar de mim.')}”</div>`; }
    if (id !== 'story' && id !== 'enc') h += `<div class="say">“${esc(NPC_HI[id] || '')}”</div>`;
    if (id === 'quest') {
      h += '<h3>Missões</h3>';
      let any = false, nextLocked = null, done = 0;
      QUESTS.forEach(q => {
        const s = G.quests[q.id] || { state: 'locked', prog: 0 }, tg = qTarget(q);
        if (s.state === 'done') { done++; return; }
        if (s.state === 'locked') { if (!nextLocked) nextLocked = q; return; }
        any = true;
        h += `<div class="qc ${s.state}"><div class="qc-h"><b>${esc(q.n)}</b><span class="badge ${s.state}">${STATE_N[s.state]}</span></div><div class="qc-t">${esc(q.t)}</div>`;
        if (s.state === 'active') h += `<div class="bar xp q"><i style="width:${(Math.min(s.prog || 0, tg) / tg * 100).toFixed(0)}%"></i><span>${Math.min(s.prog || 0, tg)} / ${tg}</span></div>`;
        h += `<div class="qc-r">${reward(q.rew)}</div>`;
        if (s.state === 'available') h += `<button class="btn primary" data-a="accept" data-id="${q.id}">Aceitar</button>`;
        if (s.state === 'ready') h += `<button class="btn primary" data-a="turnin" data-id="${q.id}">Entregar</button>`;
        h += '</div>';
      });
      if (!any) h += `<div class="dim pad">${nextLocked ? `Volte quando alcançar o nível ${DLV(nextLocked.lvl)} para a missão “${esc(nextLocked.n)}”.` : 'Você cumpriu todas as minhas missões, herói.'}</div>`;
      else if (nextLocked) h += `<div class="dim pad">Próxima: “${esc(nextLocked.n)}” (nível ${DLV(nextLocked.lvl)}).</div>`;
      if (done) h += `<div class="dim pad">${done} de ${QUESTS.length} missões concluídas.</div>`;
      const ev = (Game.canEvolve && Game.canEvolve()) || {};
      h += '<h3>Evolução</h3>';
      if (ev.nextTier == null || !TIERS[ev.nextTier]) h += `<div class="dim pad">${esc(ev.reason || 'Você alcançou o ápice da evolução.')}</div>`;
      else {
        const lab = 'Evoluir para ' + TIERS[ev.nextTier];
        h += `<div class="dim pad">Evolução em 4 etapas: ${TIERS.map((t, i) => esc(t) + ' (×' + TMUL[i] + ')').join(' → ')}. Requer nível ${lvCap(p.tier)} e ouro. Ao evoluir você volta ao nível 1 e a fase muda; os pontos de atributo e de habilidade voltam ao início (habilidades aprendidas voltam ao nível 1). Você mantém ouro, itens (equipados e na mochila), montarias, história e conquistas. Não recebe equipamento nem presentes: dropar, farmar e comprar são com você.</div>`;
        const cost = ev.cost ? (typeof ev.cost === 'number' ? ` · 💰 ${fmt(ev.cost)}` : ` · ${esc(ev.cost)}`) : '';
        h += `<div class="evo"><div>${esc(TIERS[p.tier])} → <b class="gold">${esc(TIERS[ev.nextTier])}</b>${cost}</div>`;
        if (!ev.ok && ev.reason) h += `<div class="dim">${esc(ev.reason)}</div>`;
        h += `<button class="btn primary" data-a="evolve"${ev.ok ? '' : ' disabled'}>${lab}</button></div>`;
      }
    } else if (id === 'enc') {
      const d = Game.encDialog(nid) || { say: 'O viajante já seguiu o seu caminho.', opts: [] };
      h += `<div class="say">“${esc(d.say)}”</div><div class="enc-o">` + d.opts.map(o => `<button class="btn${o.pri ? ' primary' : ''}" data-a="enc" data-id="${nid}" data-k="${o.k}"${o.dis ? ' disabled' : ''}>${esc(o.t)}</button>`).join('') + '</div>';
    } else if (id === 'trainer') {
      const c = CLASSES[p.cls];
      h += `<h3>Habilidades de ${esc(c.name)} <small>✨ ${p.sp || 0} pontos de habilidade</small></h3><div class="shop">`;
      c.skills.forEach((k, i) => {
        const L = p.sk[i] || 0, req = SK_LEARN[i], need = Math.max(req.lvl, k.lvl || 0), tierOk = (k.tier || 0) <= p.tier, ok = tierOk && ELV() >= need, sp = p.sp || 0;
        h += `<div class="shop-r"><span class="it-ic">${k.ic}</span><div class="it-t"><b>${esc(k.n)}</b><small>${esc(k.d)}${L ? ' · Nível ' + L + '/' + SK_MAX : ''}</small></div>`;
        if (!L) h += !tierOk ? `<span class="dim">Requer ${TIERS[k.tier]}</span>` : !ok ? `<span class="dim">Nível ${DLV(need)}</span>` : `<button class="btn primary" data-a="learn" data-i="${i}"${sp < req.pts ? ' disabled' : ''}>Aprender<small>✨ ${req.pts}</small></button>`;
        else if (L >= SK_MAX) h += '<span class="dim">Nível máximo</span>';
        else if (L >= skCap(ELV())) h += `<span class="dim" title="A habilidade já pode ser usada; este é o nível do personagem para subi-la de nível">Próximo nível da habilidade:<br>personagem nv ${DLV(L * 5)}</span>`;
        else h += `<button class="btn" data-a="sklv" data-i="${i}"${sp < skRaiseCost(L) ? ' disabled' : ''}>Subir para Nv ${L + 1}<small>✨ ${skRaiseCost(L)}</small></button>`;
        h += '</div>';
      });
      h += `</div><div class="dim pad">Você ganha ${SK_PTS_LEVEL} pontos por nível. Aprender gasta pontos (${SK_LEARN.map(q => q.pts).join('/')}); subir de nível custa 1 ponto até o Nv 4, 2 até o Nv 7 e 3 depois. O nível da habilidade não passa de 1 + (seu nível ÷ 5).</div>`;
    } else if (id === 'armor' || id === 'weapon') {
      const list = Game.shopStock(id), ic = SLOT_IC(p.cls);
      h += `<h3>${id === 'weapon' ? 'Armas' : 'Roupas e armaduras'} <small>💰 ${fmt(p.gold)} · comuns, sem refino</small></h3><div class="shop">`;
      for (const { it, price } of list) {
        const e = p.eq[it.slot], d = cmpDelta(it, e);
        h += `<div class="shop-r"><span class="it-ic">${iconOf(it, ic)}</span><div class="it-t"><b>${esc(itemName(it))}</b><small>${SLOTS[it.slot]} · ${istr(it)}${d == null ? ' · <i class="ar new">●</i> espaço vazio' : d > 0 ? ' · <i class="ar up">▲ melhor</i>' : d < 0 ? ' · <i class="ar dn">▼ pior</i>' : ''}</small></div><button class="btn" data-a="buyitem" data-s="${it.slot}" data-w="${it.wt || ''}" data-g="${it.grade}"${p.gold < price ? ' disabled' : ''}>Comprar<small>💰 ${fmt(price)}</small></button></div>`;
      }
      h += '</div><div class="dim pad">O estoque acompanha o seu nível: grau atual e o anterior.</div>';
    } else if (id === 'stable') {
      const mx = Game.mstMax(), mst = Math.round(p.mst == null ? mx : p.mst);
      h += `<h3>Ração <small>💰 ${fmt(p.gold)}</small></h3><div class="stat"><span>Energia da montaria</span><b>${mst}/${mx}</b></div><div class="stat"><span>Rações na bolsa</span><b>${p.feed || 0}</b></div><div class="shop"><div class="shop-r"><span class="it-ic">🌾</span><div class="it-t"><b>Ração de viagem</b><small>Recupera 60% do fôlego. A montaria come sozinha abaixo de 30%.</small></div>`;
      [1, 10, 50].forEach(n => h += `<button class="btn" data-a="buyfeed" data-n="${n}"${p.gold < 15 * n ? ' disabled' : ''}>×${n}<small>💰 ${fmt(15 * n)}</small></button>`);
      h += `</div><div class="shop-r"><span class="it-ic">🩺</span><div class="it-t"><b>Tratar a montaria</b><small>Escova, água e descanso: energia cheia na hora.</small></div><button class="btn" data-a="mst-rest"${p.gold < 30 || mst >= mx ? ' disabled' : ''}>Tratar<small>💰 30</small></button></div></div><div class="dim pad">A energia cai enquanto você cavalga e se recupera devagar quando você desmonta. Montarias não são vendidas: caem de monstros e chefes.</div>`;
    } else if (id === 'bank') {
      const A = Game.account(), B = A ? A.bank : { items: [], gold: 0 }, ic = SLOT_IC(p.cls), PG = 40;
      const mx = Math.max(120, B.max | 0, B.items.length), np = Math.max(1, Math.ceil(mx / PG)), pg = Math.min(st.bp | 0, np - 1);
      let g = ''; const slots = fillPos(B.items, mx);
      for (let i = pg * PG; i < (pg + 1) * PG; i++) {
        const it = slots[i];
        if (i >= mx) g += '<div class="bi lock"></div>';
        else if (!it) g += `<div class="bi empty" data-zone="bank" data-slot="${i}"></div>`;
        else g += `<div class="bi it r${it.rar}${noUse(it) ? ' nouse' : ''}${st.carry && st.carry.id === it.id ? ' carry' : ''}" data-zone="bank" data-slot="${i}" data-a="bank-take" data-id="${it.id}" data-drag="bank" draggable="true" title="${esc(itemTip(it, p.eq[it.slot], false).split('\n').slice(0, -1).join('\n') + '\nClique para pegar e mover · Shift+clique: retirar')}" style="--rc:${rcol(it)}"><span class="ei">${iconOf(it, ic)}</span>${plusB(it)}</div>`;
      }
      h += `<div class="bankw"><div class="bpages">${Array.from({ length: np }, (_, i) => `<button class="${i === pg ? 'on' : ''}" data-a="bank-page" data-n="${i}">${i + 1}</button>`).join('')}<small>${B.items.length}/${mx} · ${TX('clique para pegar e mover', 'toque num item: retirar ou mover')}</small></div><div class="bag bankg" data-drop="bank">${g}</div>`;
      const Bt = (n, lab, dis) => `<button class="btn" data-a="bank-gold" data-n="${n}"${dis ? ' disabled' : ''}>${lab}</button>`;
      h += `<div class="bgold"><div class="igold"><span>💰</span><b>${fmt(B.gold)}</b><small>ouro no baú</small></div><div class="bg-r"><span>Guardar</span>${Bt(100, '100', p.gold < 100)}${Bt(1000, '1.000', p.gold < 1000)}${Bt(p.gold, 'Tudo', p.gold <= 0)}</div><div class="bg-r"><span>Retirar</span>${Bt(-100, '100', B.gold < 100)}${Bt(-1000, '1.000', B.gold < 1000)}${Bt(-B.gold, 'Tudo', B.gold <= 0)}</div></div></div>`;
    } else if (id === 'shop') {
      h += '<h3>Poções</h3><div class="shop">';
      for (const k of ['hp', 'mp']) {
        const pr = potPrice(k);
        h += `<div class="shop-r"><span class="it-ic">${k === 'hp' ? '❤️' : '💙'}</span><div class="it-t"><b>${POT[k].n}</b><small>${pr} ouro cada · você tem ${p.pots[k]}</small></div>`;
        [1, 10].forEach(n => h += `<button class="btn" data-a="buy" data-k="${k}" data-n="${n}"${p.gold < pr * n ? ' disabled' : ''}>×${n}<small>💰 ${fmt(pr * n)}</small></button>`);
        h += '</div>';
      }
      h += `</div><h3>Vender itens <small>💰 ${fmt(p.gold)}</small></h3><div class="shop">`;
      if (!p.inv.length) h += '<div class="dim pad">Sua mochila está vazia.</div>';
      const ic = SLOT_IC(p.cls);
      p.inv.forEach(it => {
        const d = cmpDelta(it, p.eq[it.slot]), cm = d == null ? '<i class="ar new">●</i> espaço vazio' : d > 0 ? '<i class="ar up">▲ melhor que o equipado</i>' : d < 0 ? '<i class="ar dn">▼ pior que o equipado</i>' : '<i class="ar eq">＝ igual ao equipado</i>';
        h += `<div class="shop-r" title="${esc(itemTip(it, (p.eq || {})[it.slot], false).split('\n').slice(0, -1).join('\n'))}"><span class="it-ic">${iconOf(it, ic)}</span><div class="it-t"><b style="color:${rcol(it)}">${esc(itemName(it))}</b><small>${istr(it)}<br>${cm}</small></div><button class="btn" data-a="sell" data-id="${it.id}">Vender<small>💰 ${fmt(itemValue(it))}</small></button></div>`;
      });
      h += '</div>';
    } else if (nid === 'selene') { // Refinador: fundir peças iguais em Ancient
      const ic = SLOT_IC(p.cls), groups = {};
      for (const it of p.inv) if ((it.plus | 0) >= PLUS_MAX && (it.plus | 0) < ANCIENT_MAX) (groups[fuseKey(it)] = groups[fuseKey(it)] || []).push(it);
      h += `<h3>Fundir em Ancient <small>💰 ${fmt(p.gold)}</small></h3><div class="dim pad">Junte <b>2 peças iguais</b> (mesmo item e mesmo refino) <b>na mochila</b>: <b>2× +9 → +10 Ancient</b> (grátis) e <b>2× +10 → +11 Ancient</b> (💰 ${fmt(FUSE_GOLD)}). As duas viram uma só.</div><div class="shop">`;
      let any = 0;
      for (const k in groups) { const gl = groups[k]; if (gl.length < 2) continue; any = 1; gl.sort((a, b) => b.rar - a.rar || ((b.adds || []).length - (a.adds || []).length)); const A = gl[0], B = gl[1], cost = A.plus >= 10 ? FUSE_GOLD : 0;
        h += `<div class="shop-r"><span class="it-ic">${iconOf(A, ic)}</span><div class="it-t"><b>${esc(itemName(A))}</b><small>2 peças iguais → +${A.plus + 1} Ancient${cost ? ' · 💰 ' + fmt(cost) : ' · grátis'}</small></div><button class="btn primary" data-a="fuse" data-ia="${A.id}" data-ib="${B.id}"${p.gold < cost ? ' disabled' : ''}>Fundir<small>+${A.plus} → +${A.plus + 1}</small></button></div>`; }
      const solo = p.inv.filter(it => (it.plus | 0) >= PLUS_MAX && (it.plus | 0) < ANCIENT_MAX && groups[fuseKey(it)].length < 2);
      if (!any) h += `<div class="dim pad">Nenhum par disponível.${solo.length ? ' Você tem ' + solo.length + ' peça(s) +9/+10 sem par igual: ' + solo.map(it => esc(itemName(it))).join(', ') + '.' : ' Refine peças até +9 com o Ferreiro e junte duas iguais.'}</div>`;
      h += '</div>';
    } else if (id === 'smith') {
      const ic = SLOT_IC(p.cls), f = st.sm && st.sm.it != null ? Game.findItem(st.sm.it) : null, it = f && f.it;
      h += `<h3>Refino de equipamentos <small>💰 ${fmt(p.gold)} · até +9 · Ancient (+10/+11) com o Refinador</small></h3>`;
      if (!it) h += '<div class="dim pad">◂ Escolha um item <b>equipado</b> ou da <b>mochila</b> na janela de Equipamento ao lado.</div>';
      else {
        h += `<div class="jw-box sm-box"><div class="sm-h"><span class="es has" style="--rc:${rcol(it)}"><span class="ei">${iconOf(it, ic)}</span>${plusB(it)}</span><div><b style="color:${rcol(it)}">${esc(itemName(it))}</b><small>${f.eq ? 'Equipado · ' : 'Mochila · '}${SLOTS[it.slot]} · ${istr(it)}</small></div></div>`;
        if (it.plus >= PLUS_MAX) h += `<small class="gold">${it.plus >= 10 ? 'Ancient: não refina mais' : 'Refino máximo no Ferreiro (+9). Para +10 Ancient, junte 2 peças +9 iguais com o Refinador.'}</small></div>`;
        else { const cost = enhCost(it); h += `<small>Chance de sucesso: <b>${Math.round(enhChance(it.plus) * 100)}%</b> · Custo: 💰 ${fmt(cost)}<br>Se falhar, só o ouro é perdido.</small></div><button class="btn primary" data-a="enh" data-id="${it.id}"${p.gold < cost ? ' disabled' : ''}>Refinar<small>+${it.plus} → +${it.plus + 1}</small></button>`; }
      }
    } else if (id === 'jewel') {
      const ic = SLOT_IC(p.cls), J = st.jw || (st.jw = { it: null, st: null }), M = p.mats || {};
      const pool = SLOT_ORDER.map(s => p.eq[s]).filter(Boolean).concat(p.inv), sel = pool.find(x => x.id === J.it) || null;
      h += `<h3>1. Escolha o item <small>💰 ${fmt(p.gold)}</small></h3><div class="dim pad">${sel ? 'Selecionado: <b style="color:' + rcol(sel) + '">' + esc(itemName(sel)) + '</b>' : '◂ Escolha um item <b>equipado</b> ou da <b>mochila</b> na janela de Equipamento ao lado.'}</div>`;
      h += '<h3>2. Escolha a pedra</h3><div class="mats jw-st">';
      for (const k of STONE_IDS) { const q = M[k] || 0; h += `<button class="btn mat${J.st === k ? ' sel' : ''}" data-a="jw-st" data-k="${k}"${q ? '' : ' disabled'} title="${esc(STONES[k].d)}">${STONES[k].ic} ${STONES[k].n} <small>×${q}</small></button>`; }
      h += '</div>';
      if (sel) {
        const n = (sel.adds || []).length, cost = jewelCost(sel), full = n >= ADD_MAX, stn = J.st && STONES[J.st];
        h += `<div class="jw-box"><b style="color:${rcol(sel)}">${esc(itemName(sel))}</b><small>${(sel.adds || []).map(a => '✦ ' + esc(addTxt(a))).join('<br>') || 'Sem adicionais'}</small>`;
        if (full) h += '<small>Este item já tem o máximo de adicionais.</small></div>';
        else {
          h += `<small>${stn ? 'Resultado: ✦ ' + esc(addTxt({ k: stn.k, v: addVal(stn.k, pgOf(sel)) })) + '<br>' : ''}Chance de sucesso: <b>${Math.round(jewelChance(sel) * 100)}%</b> · Custo: 💰 ${fmt(cost)}<br>A pedra é consumida mesmo se falhar.</small></div>`;
          h += `<button class="btn primary" data-a="jw-go"${!stn || !(M[J.st] > 0) || p.gold < cost ? ' disabled' : ''}>Engastar pedra</button>`;
        }
      }
    } else if (id === 'portal') {
      h += '<h3>Destinos <small>💰 ' + fmt(p.gold) + '</small></h3><div class="shop">';
      for (const v of portalDests(n.vil || 'aldoria')) {
        const lock = ELV() < v.lvl, poor = p.gold < v.price;
        h += `<div class="shop-r"><span class="it-ic">🌀</span><div class="it-t"><b>${esc(v.n)}</b><small>${esc(REG[v.reg].n)} · Nível ${DLV(v.lvl)}+</small></div><button class="btn${lock || poor ? '' : ' primary'}" data-a="tp" data-id="${v.id}"${lock || poor ? ' disabled' : ''}>${lock ? 'Nv ' + DLV(v.lvl) : v.price ? 'Viajar<small>💰 ' + fmt(v.price) + '</small>' : 'Viajar<small>grátis</small>'}</button></div>`;
      }
      h += '</div>';

    }
    h += dlgMsg();
    setBody(E.b_dlg, h);
  }

  function refreshPanels() {
    if (typeof G === 'undefined' || !G.player || !st.panel) return;
    const on = k => st.wins.includes(k);
    if (on('inv') || (st.modal === 'dlg' && st.side)) renderInv(G);
    if (st.card) cardRender();
    if (on('char')) renderChar(G);
    if (on('quest')) renderQuest(G);
    if (on('map')) renderMap(G);
    if (on('tree')) renderTree(G);
    if (on('auto')) renderAuto(G);
    if (on('look')) renderLook(G);
    if (on('lv')) renderLv(G);
    if (st.modal === 'pause') renderPause(G);
    else if (st.modal === 'dlg') renderDlg(G);
  }

  /* ---------- ações (cliques delegados) ---------- */
  function act(a, d) {
    let r;
    if (a.startsWith('card-')) { cardAct(a, d); return; }
    switch (a) {
      case 'close': if (d && d._k) winClose(d._k); else closeAll(); return;
      case 'p-inv': togglePanel('inv'); return;
      case 'p-char': togglePanel('char'); return;
      case 'p-quest': togglePanel('quest'); return;
      case 'p-auto': togglePanel('auto'); return;
      case 'p-look': togglePanel('look'); return;
      case 'p-map': mapToggle(); return;
      case 'go': { if (!Game.goObjective()) UI.toast('Não há para onde ir agora.'); return; }
      case 'qturn': Game.turnInQuest(d.id); refreshPanels(); return;
      case 'dailyall': if (G.daily) G.daily.list.forEach((x, k) => { if (x.done && !x.claimed) Game.claimDaily(k); }); refreshPanels(); return;
      case 'maplg': st.mapLeg = !st.mapLeg; renderMap(G); return;
      case 'gpsgo': { const pin = st.mapPin; if (pin) { const v = VILLAGES.find(q => Math.hypot(q.cx - pin[0], q.cz - pin[1]) < 40); st.mapPin = null; if (Game.gpsGo(pin[0], pin[1], v ? v.n : 'Destino')) winClose('map'); else renderMap(G); } return; }
      case 'gpsx': st.mapPin = null; renderMap(G); return;
      case 'gpscancel': Game.gpsCancel(); st.mapPin = null; renderMap(G); objSync(G); return;
      case 'obj': st.objOpen = !st.objOpen; objSync(G); return;
      case 'fab': st.fabOpen = !st.fabOpen; fabSync(); return;
      case 'p-lv': togglePanel('lv'); return;
      case 'lvtab': st.lvTab = +d.id; refreshPanels(); return;
      case 'pause': showPanel('pause'); return;
      case 'gfx': Game.cycleQuality(); refreshPanels(); return;
      case 'eco': Game.toggleEco(); refreshPanels(); return;
      case 'tomenu': Game.toMenu(); return;
      case 'look': Game.setLook(d.k, +d.v); return;
      case 'mount': Game.toggleMount(d.id); return;
      case 'equipmount': Game.equipMount(d.id); return;
      case 'buymount': Game.buyMount(d.id); refreshPanels(); return;
      case 'auto': Game.setAuto(d.k, !G.auto[d.k]); refreshPanels(); return;
      case 'auto-pct': Game.setAuto(d.k, G.auto[d.k] + (+d.d)); refreshPanels(); return;
      case 'auto-all': { const on = !(G.auto.attack && G.auto.skills && G.auto.hp && G.auto.mp); ['attack', 'skills', 'hp', 'mp'].forEach(k => Game.setAuto(k, on)); refreshPanels(); return; }
      case 'mute': Game.toggleMute(); refreshPanels(); return;
      case 'skill': Game.useSkill(+d.i); return;
      case 'pot': Game.usePotion(d.k); return;
      case 'attr': Game.addAttr(d.k, +d.n); return;
      case 'attr-reset': Game.resetAttr(); return;
      case 'newchar': Game.createOpen(); return;
      case 'cr': Game.createSet(d.k, +d.v); return;
      case 'cr-cls': Game.createCls(d.c); return;
      case 'cr-rname': Game.createRandomName(); return;
      case 'cr-rand': Game.createRandom(); return;
      case 'cr-3d': Game.createToggle3d(); return;
      case 'cr-back': Game.createBack(); return;
      case 'cr-go': Game.createGo(); return;
      case 'continue': hideMenu(); Game.continueGame(d.id); return;
      case 'delask': st.confirmDel = d.id; renderMenuActions(); return;
      case 'delno': st.confirmDel = false; renderMenuActions(); return;
      case 'delyes': Game.deleteSave(d.id); st.confirmDel = false; showMenu(Game.hasSave()); return;
      case 'acc-enter': Game.switchAccount(d.id); st.confirmDel = false; showMenu(Game.hasSave()); return;
      case 'acc-out': Game.logoutAccount(); st.confirmAcc = null; showMenu(Game.hasSave()); return;
      case 'accdel-ask': st.confirmAcc = d.id; renderMenuActions(); return;
      case 'accdel-no': st.confirmAcc = null; renderMenuActions(); return;
      case 'accdel-yes': Game.deleteAccount(d.id); st.confirmAcc = null; renderMenuActions(); return;
      case 'acc-create': { const v = root.querySelector('#acc-name'); if (v && Game.createAccount(v.value)) showMenu(Game.hasSave()); else if (v) v.focus(); return; }
      case 'bank-put': Game.bankPut(+d.id); return;
      case 'bank-take': Game.bankTake(+d.id); return;
      case 'bank-gold': Game.bankGold(+d.n); return;
      case 'itab': st.invTab = d.k; refreshPanels(); return;
      case 'sm-it': (st.sm = st.sm || {}).it = +d.id; st.msg = null; refreshPanels(); return;
      case 'use-mount': Game.useMountItem(+d.i); return;
      case 'bank-page': st.bp = +d.n; refreshPanels(); return;
      case 'mst-rest': r = Game.restMount(); break;
      case 'jw-it': (st.jw = st.jw || {}).it = +d.id; st.msg = null; refreshPanels(); return;
      case 'jw-st': (st.jw = st.jw || {}).st = d.k; st.msg = null; refreshPanels(); return;
      case 'jw-go': r = Game.jewel(st.jw && st.jw.it, st.jw && st.jw.st); break;
      case 'cm-equip': cmClose(); { const f = Game.findItem(d.id); if (f && f.eq) Game.unequip(f.eq); else Game.equip(+d.id); } return;
      case 'cm-sell': cmClose(); Game.sellItem(+d.id); return;
      case 'cm-del': st.cm.ask = true; cmRender(); return;
      case 'cm-yes': cmClose(); { const res = Game.deleteItem(+d.id); if (res && !res.ok) toast(res.msg); } return;
      case 'cm-no': cmClose(); return;
      case 'buyitem': r = Game.buyItem(d.s, d.w || null, +d.g); break;
      case 'buyfeed': r = Game.buyFeed(+d.n); break;
      case 'respawn': Game.respawn(); hideDeath(); return;
      case 'equip': r = Game.equip(+d.id); break;
      case 'unequip': r = Game.unequip(d.s); break;
      case 'sell': r = Game.sellItem(+d.id); break;
      case 'tp': r = Game.teleport(d.id); break;
      case 'buy': r = Game.buy(d.k, +d.n); break;
      case 'enh': r = Game.enhance(d.id ? +d.id : d.s); break;
      case 'fuse': r = Game.fuseItems(d.ia, d.ib); break;
      case 'accept': r = Game.acceptQuest(d.id); break;
      case 'story': Game.storyTalk(d.id); refreshPanels(); return;
      case 'enc': Game.encAct(d.id, d.k); refreshPanels(); return;
      case 'daily': Game.claimDaily(d.id); refreshPanels(); return;
      case 'qtab': st.qtab = d.id; refreshPanels(); return;
      case 'sklv': Game.raiseSkill(+d.i); return;
      case 'sk-reset': Game.resetSkills(); return;
      case 'learn': Game.learnSkill(+d.i); return;
      case 'mapv': mapViewSet(d.id); refreshPanels(); return;
      case 'mapz': mapZoom(d.d === 'in' ? 1.5 : 1 / 1.5); refreshPanels(); return;
      case 'mapme': mapCenterMe(); refreshPanels(); return;
      case 'turnin': r = Game.turnInQuest(d.id); break;
      case 'evolve': r = Game.evolve(); break;
      default: return;
    }
    // feedback dentro do diálogo (refino devolve {ok,msg})
    st.msg = r && typeof r === 'object' && r.msg ? { ok: r.ok !== false, text: r.msg } : (a === 'enh' ? st.msg : null);
    refreshPanels();
  }

  /* ---------- menu / morte ---------- */
  function showMenu(hasSave) {
    st.menu = true; st.hasSave = !!hasSave; st.confirmDel = false;
    showPanel(null); hideDeath();
    root.classList.add('in-menu'); setVis(E.menu, true);
    renderMenuActions();
  }
  function hideMenu() { st.menu = false; root.classList.remove('in-menu'); setVis(E.menu, false); }
  function showDeath() { st.death = true; showPanel(null); setVis(E.death, true); }
  function hideDeath() { st.death = false; setVis(E.death, false); }
  /* item "na mão" (mover itens): o fantasma segue o cursor */
  const carryItem = () => { const c = st.carry; if (!c) return null; const A = Game.account(); return G.player.inv.find(x => x.id === c.id) || (A && A.bank.items.find(x => x.id === c.id)) || null; };
  function carryRender(ev) {
    let g = root.querySelector('.carry-ghost'); const it = carryItem();
    if (!it) { if (g) g.remove(); st.carry = null; return; }
    if (!g) { g = document.createElement('div'); root.appendChild(g); }
    g.className = 'bi it carry-ghost r' + it.rar; g.style.setProperty('--rc', rcol(it)); g.innerHTML = `<span class="ei">${iconOf(it, SLOT_IC(G.player.cls))}</span>${plusB(it)}`;
    if (ev) { g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px'; }
  }
  function carryCancel() { if (!st.carry) return; st.carry = null; carryRender(); refreshPanels(); }
  function closeAll() { modalClose(); showPanel(null); }
  /* menu de contexto dos itens (botão direito no inventário) */
  const shopNear = () => { const p = G.player; return NPCS.some(n => n.kind === 'shop' && Math.hypot(n.x - p.x, n.z - p.z) < 8); };
  function cmRender() {
    let m = root.querySelector('.ctxm'); const c = st.cm;
    if (!c) { if (m) m.remove(); return; }
    if (!m) { m = document.createElement('div'); m.className = 'ctxm glass'; root.appendChild(m); shield(m); m.addEventListener('contextmenu', e => e.preventDefault()); }
    const f = Game.findItem(c.id); if (!f) { cmClose(); return; }
    const it = f.it;
    let h = `<div class="cm-t" style="color:${rcol(it)}">${esc(itemName(it))}</div>`;
    if (c.ask) h += '<div class="cm-q">Excluir para sempre?</div><div class="cm-yn"><button class="btn bad" data-a="cm-yes" data-id="' + it.id + '">Sim</button><button class="btn" data-a="cm-no">Não</button></div>';
    else {
      h += `<button class="cm-i" data-a="cm-equip" data-id="${it.id}">${f.eq ? 'Desequipar' : 'Equipar'}</button>`;
      if (!f.eq && shopNear()) h += `<button class="cm-i" data-a="cm-sell" data-id="${it.id}">Vender <small>💰 ${fmt(itemValue(it))}</small></button>`;
      h += f.eq ? '<button class="cm-i" disabled title="Desequipe antes de excluir">Excluir</button>' : `<button class="cm-i bad" data-a="cm-del" data-id="${it.id}">Excluir</button>`;
    }
    m.innerHTML = h;
    const w = m.offsetWidth || 170, hh = m.offsetHeight || 120;
    m.style.left = Math.min(c.x, (W || innerWidth) - w - 6) + 'px'; m.style.top = Math.min(c.y, (H || innerHeight) - hh - 6) + 'px';
  }
  function cmClose() { st.cm = null; cmRender(); }
  /* celular: tocar num item (mochila, baú ou equipado) abre um cartão com todos os atributos, a comparação com o que está equipado,
     o valor de venda e as ações. No lugar do clique que "pega" o item e do botão direito. */
  function cardItem(c) {
    if (c.zone === 'bank') { const A = Game.account(), it = A && A.bank.items.find(x => x.id === c.id); return it ? { it, eq: null } : null; }
    return Game.findItem(c.id);
  }
  function cardClose() { st.card = null; cardRender(); }
  function cardRender() {
    let m = root.querySelector('.itcard'); const c = st.card;
    if (c && !st.wins.includes('inv') && !(st.modal === 'dlg' && st.side)) st.card = null;
    const f = st.card && cardItem(st.card);
    if (!f) { st.card = null; if (m) m.remove(); return; }
    if (!m) { m = document.createElement('div'); m.className = 'itcard glass'; root.appendChild(m); shield(m); }
    const p = G.player, it = f.it, inBank = c.zone === 'bank', lines = itemTip(it, f.eq ? null : p.eq[it.slot], !!f.eq).split('\n').slice(0, -1); // a última linha é dica de mouse
    let h = `<div class="ic-h"><b style="color:${rcol(it)}">${esc(lines[0])}</b><button class="x" data-a="card-x" title="Fechar">✕</button></div><ul>`;
    for (const l of lines.slice(1)) h += `<li class="${/não pode/.test(l) ? 'bad' : /\(\+/.test(l) ? 'up' : /\(-/.test(l) ? 'dn' : /^Valor/.test(l) ? 'val' : ''}">${esc(l)}</li>`;
    h += '</ul>';
    if (c.ask) h += `<div class="ic-q">Excluir para sempre?</div><div class="ic-b"><button class="btn bad" data-a="card-yes">Sim</button><button class="btn" data-a="card-no">Não</button></div>`;
    else {
      let b = '';
      if (f.eq) b += `<button class="btn primary" data-a="card-un" data-s="${f.eq}">Desequipar</button>`;
      else if (inBank) b += `<button class="btn primary" data-a="card-take">Retirar do baú</button>`;
      else {
        b += `<button class="btn primary" data-a="card-eq"${noUse(it) ? ' disabled' : ''}>Equipar</button>`;
        if (st.side === 'bank') b += `<button class="btn" data-a="card-put">Guardar no baú</button>`;
        if (shopNear()) b += `<button class="btn" data-a="card-sell">Vender 💰 ${fmt(itemValue(it))}</button>`;
      }
      if (!f.eq) b += `<button class="btn" data-a="card-mv">Mover</button>`;
      if (!f.eq && !inBank) b += `<button class="btn bad" data-a="card-del">Excluir</button>`;
      h += `<div class="ic-b">${b}</div>`;
    }
    if (m._h !== h) { m._h = h; m.innerHTML = h; } // só remonta se mudou (senão o botão some entre o toque e o clique)
  }
  function cardAct(a, d) {
    const c = st.card; if (!c && a !== 'card-x') return; let r = null;
    switch (a) {
      case 'card-x': cardClose(); return;
      case 'card-del': c.ask = true; cardRender(); return;
      case 'card-no': c.ask = false; cardRender(); return;
      case 'card-yes': r = Game.deleteItem(c.id); break;
      case 'card-un': r = Game.unequip(d.s); break;
      case 'card-eq': r = Game.equip(c.id); break;
      case 'card-put': r = Game.bankPut(c.id); break;
      case 'card-take': r = Game.bankTake(c.id); break;
      case 'card-sell': r = Game.sellItem(c.id); break;
      case 'card-mv': st.carry = { id: c.id, from: c.zone === 'eq' ? 'bag' : c.zone }; cardClose(); carryRender(); refreshPanels(); toast('Toque num espaço vazio ou em outro item para soltar.'); return;
    }
    if (r && r.ok === false && r.msg) toast(r.msg);
    cardClose(); refreshPanels();
  }

  /* ---------- log, flutuantes, toast, banner ---------- */
  const floats = { free: [], used: [] };
  function log(text, cls) {
    if (!E.log) return;
    const d = document.createElement('div');
    d.className = 'ln ' + (cls || 'sys'); d.textContent = text;
    E.log.appendChild(d);
    while (E.log.children.length > 8) E.log.firstChild.remove();
    setTimeout(() => d.remove(), 19000);
  }
  function float(wx, wy, wz, text, cls) {
    if (!E.floats) return;
    let f = floats.free.pop();
    if (!f) {
      if (floats.used.length >= 48) { f = floats.used.shift(); }
      else { const el = document.createElement('div'); el.className = 'fl'; el.innerHTML = '<span></span>'; E.floats.appendChild(el); f = { el, s: el.firstChild }; }
    }
    f.x = wx; f.y = wy; f.z = wz; f.t0 = now(); f.jx = (Math.random() - .5) * 36;
    f.s.className = cls || 'dmg'; f.s.textContent = text;
    f.s.style.animation = 'none'; void f.s.offsetWidth; f.s.style.animation = '';
    f.el.style.display = 'none';
    floats.used.push(f);
  }
  function toast(text) {
    E.toast.textContent = text; E.toast.classList.remove('show'); void E.toast.offsetWidth; E.toast.classList.add('show');
  }
  /* aviso grande de evento (começou / terminou / ativo) */
  function bigToast(title, sub) {
    if (!E.evtoast) return;
    E.evtoast.firstChild.textContent = title; E.evtoast.lastChild.textContent = sub || '';
    E.evtoast.classList.remove('show'); void E.evtoast.offsetWidth; E.evtoast.classList.add('show');
  }
  /* faixa dourada de eventos no topo. Genérica: list = [{ ic, name, end (ms epoch) }]. Um servidor futuro pode chamar igual. */
  let evList = [], evTimer = 0;
  const evLeft = ms => { const m = Math.max(0, Math.ceil(ms / 60000)); if (ms < 60000) return Math.max(0, Math.ceil(ms / 1000)) + 's'; const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
    return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + mm + 'min' : mm + 'min'; };
  function evRender() {
    if (!E.evbar) return; const now = Date.now();
    const l = evList.filter(e => !e.end || e.end > now);
    E.evbar.classList.toggle('off', !l.length); if (E.hud) E.hud.classList.toggle('evon', !!l.length);
    const h = l.map(e => `<span class="ev"><i>${esc(e.ic || '★')}</i><b>${esc(e.name)}</b>${e.end ? `<small>· termina em ${evLeft(e.end - now)}</small>` : ''}</span>`).join('');
    if (E.evbar._h !== h) { E.evbar._h = h; E.evbar.innerHTML = h; if (E.hud) E.hud.style.setProperty('--evh', (E.evbar.offsetHeight || 26) + 'px'); }
  }
  function setEvents(list) {
    evList = (Array.isArray(list) ? list : []).filter(e => e && e.name).map(e => ({ ic: String(e.ic || ''), name: String(e.name), end: +e.end || 0 }));
    evRender(); clearInterval(evTimer); if (evList.length) evTimer = setInterval(evRender, 1000);
  }
  function levelUp(lvl) {
    E.banner.innerHTML = `<small>Você alcançou o</small><b>NÍVEL ${lvl}!</b>`;
    E.banner.classList.remove('show'); void E.banner.offsetWidth; E.banner.classList.add('show');
  }

  /* ---------- projeção ---------- */
  function project(vp, x, y, z) {
    const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (w <= 0) return null;
    const n = M.xform(vp, [x, y, z]);
    if (Math.abs(n[0]) > 1.05 || Math.abs(n[1]) > 1.05 || n[2] > 1) return null;
    return [Math.round((n[0] * .5 + .5) * W), Math.round((1 - (n[1] * .5 + .5)) * H)];
  }
  /* seta de missão: gira em volta do personagem apontando para o objetivo atual da história, com a distância */
  function updateArrow(G) {
    const ob = st.obj, p = G.player, el = E.qa;
    if (!ob || st.modal || G.dead || G.state !== 'play') { setVis(el, false); return; }
    const dx = ob[0] - p.x, dz = ob[1] - p.z, d = Math.hypot(dx, dz);
    const a = d >= 12 && project(G.vp, p.x, .1, p.z), b = a && project(G.vp, p.x + dx / d * 4, .1, p.z + dz / d * 4);
    if (!b) { setVis(el, false); return; }
    setVis(el, true);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), Rr = 92, x = a[0] + Math.cos(ang) * Rr, y = a[1] + Math.sin(ang) * Rr * .8;
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    E.qaAr.style.transform = `rotate(${(ang * 180 / Math.PI).toFixed(1)}deg)`;
    setText(E.qaD, (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m'));
    setAttr(el, 'title', ob[2] || 'Objetivo');
  }
  function updateLabels(G) {
    const L = G.labels || [], pool = E.labels.children;
    for (let i = 0; i < L.length; i++) {
      let e = pool[i];
      if (!e) { e = document.createElement('div'); E.labels.appendChild(e); }
      const l = L[i], s = project(G.vp, l.x, l.y, l.z);
      if (!s) { if (!e._off) { e._off = 1; e.style.display = 'none'; } continue; }
      if (e._off) { e._off = 0; e.style.display = ''; }
      const cn = 'lb ' + (l.cls || 'mob');
      if (e._cn !== cn) { e._cn = cn; e.className = cn; }
      if (e._tx !== l.text) { e._tx = l.text; e.textContent = l.text; }
      e.style.transform = `translate(${s[0]}px,${s[1]}px) translate(-50%,-100%)`;
    }
    for (let i = L.length; i < pool.length; i++) if (!pool[i]._off) { pool[i]._off = 1; pool[i].style.display = 'none'; }
  }
  function updateFloats(G) {
    const t = now();
    for (let i = floats.used.length - 1; i >= 0; i--) {
      const f = floats.used[i];
      if (t - f.t0 > 1150) { f.el.style.display = 'none'; floats.used.splice(i, 1); floats.free.push(f); continue; }
      const s = project(G.vp, f.x, f.y, f.z);
      if (!s) { f.el.style.display = 'none'; continue; }
      f.el.style.display = '';
      f.el.style.transform = `translate(${s[0] + Math.round(f.jx)}px,${s[1]}px)`;
    }
  }

  /* ---------- minimapa ---------- */
  let mmBk = null;
  function drawMap(G) { // minimapa centrado no jogador (o mapa ficou grande demais para caber inteiro); mesmo terreno e ícones do mapa M
    const c = ctx, S = MM * mmDpr, VR = 105, k = (S / 2 - 3 * mmDpr) / VR, cx = S / 2, P = G.player, u = mmDpr;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S, S);
    c.save(); c.beginPath(); c.arc(cx, cx, S / 2 - 1.5 * mmDpr, 0, 6.2832); c.clip();
    { if (!mmBk || mmBk.width !== S) { mmBk = document.createElement('canvas'); mmBk.width = mmBk.height = S; mmBk._im = mmBk.getContext('2d').createImageData(S, S); }
      paintTerrain(mmBk._im, S, S, P.x - cx / k, P.z - cx / k, 1 / k); mmBk.getContext('2d').putImageData(mmBk._im, 0, 0); c.drawImage(mmBk, 0, 0); }
    const pt = (x, z) => [cx + (x - P.x) * k, cx + (z - P.z) * k], far = (x, z) => Math.abs(x - P.x) > VR + 8 || Math.abs(z - P.z) > VR + 8;
    { const [x, y] = pt(LM.pond[0], LM.pond[1]); c.beginPath(); c.arc(x, y, Math.max(5.4 * k, 3 * u), 0, 6.2832); c.fillStyle = '#5fb0d8'; c.fill(); }
    c.lineJoin = 'round'; c.lineCap = 'round'; // estradas: contorno + miolo, como no mapa M
    for (const pass of [0, 1]) { c.lineWidth = pass ? Math.max(2 * u, ROAD_W * 2 * k) : Math.max(2 * u, ROAD_W * 2 * k) + 2 * u; c.strokeStyle = pass ? '#e3c890' : 'rgba(70,44,18,.7)';
      for (const r of ROADS) { c.beginPath(); r.forEach((q, i) => { const [x, y] = pt(q[0], q[1]); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); } }
    for (const v of VILLAGES) {
      if (far(v.cx, v.cz) && Math.hypot(v.cx - P.x, v.cz - P.z) > VR + 60) continue; const [x, y] = pt(v.cx, v.cz);
      if (v.theme === 'camp') { c.beginPath(); c.arc(x, y, v.r * k, 0, 6.2832); c.fillStyle = 'rgba(220,196,140,.9)'; c.fill(); c.lineWidth = u; c.strokeStyle = '#4a3618'; c.stroke(); }
      else { const h = v.hs * k; c.fillStyle = TOWN_FILL[v.id] || '#d2bd8c'; c.fillRect(x - h, y - h, h * 2, h * 2); c.strokeStyle = '#4a3618'; c.lineWidth = 1.6 * u; c.strokeRect(x - h, y - h, h * 2, h * 2); }
      const [px, py] = pt(v.portal[0], v.portal[1]); c.save(); c.translate(px, py); c.scale(.55, .55); MI.portal(c, 0, 0, u); c.restore();
    }
    const icon = (kind, x, y, s, a) => { c.save(); c.translate(x, y); c.scale(s, s); MI[kind](c, 0, 0, u, a); c.restore(); };
    for (const q of SITES) { if (far(q.x, q.z)) continue; const [x, y] = pt(q.x, q.z); icon(q.k === 'lair' ? 'lair' : 'dungeon', x, y, .55); }
    if (G.encSpot && !far(G.encSpot.x, G.encSpot.z)) { const [x, y] = pt(G.encSpot.x, G.encSpot.z); icon('enc', x, y, .5); }
    for (const m of G.mobs || []) {
      if (m.dead || far(m.x, m.z)) continue;
      const [x, y] = pt(m.x, m.z);
      if (m.boss) icon('boss', x, y, .5);
      else { c.beginPath(); c.arc(x, y, (m.elite ? 2.2 : 1.6) * u, 0, 6.2832); c.fillStyle = m.elite ? '#ffcf4a' : '#ff5a4a'; c.fill(); c.lineWidth = .6 * u; c.strokeStyle = 'rgba(30,10,5,.8)'; c.stroke(); }
    }
    for (const n of G.npcs || []) {
      if (far(n.x, n.z)) continue;
      const [x, y] = pt(n.x, n.z), r = 2.6 * u;
      if (n.kind === 'enc') { icon('enc', x, y, .5); continue; }
      c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath();
      c.fillStyle = '#ffe27a'; c.fill(); c.lineWidth = .6 * u; c.strokeStyle = '#3a2508'; c.stroke();
    }
    { const ob = objectivePos(G); // objetivo: ícone se estiver perto, senão seta na borda
      if (ob) { const dx = ob[0] - P.x, dz = ob[1] - P.z, d = Math.hypot(dx, dz);
        if (d < VR - 6) { const [x, y] = pt(ob[0], ob[1]); icon('obj', x, y, .6); }
        else { const a = Math.atan2(dz, dx), R = S / 2 - 9 * u; c.save(); c.translate(cx + Math.cos(a) * R, cx + Math.sin(a) * R); c.rotate(a); c.beginPath(); c.moveTo(6 * u, 0); c.lineTo(-4 * u, 5 * u); c.lineTo(-4 * u, -5 * u); c.closePath(); c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 1.2 * u; c.strokeStyle = '#3a2508'; c.stroke(); c.restore(); } } }
    icon('me', cx, cx, .62, P.rot || 0);
    c.restore();
    c.font = '700 ' + (11 * u) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3 * u; c.strokeStyle = 'rgba(10,8,14,.9)'; c.strokeText('N', cx, 9 * u); c.fillStyle = '#ffe9b8'; c.fillText('N', cx, 9 * u); c.textBaseline = 'alphabetic';
  }

  /* ---------- atualização por frame ---------- */
  const tierNameShort = t => TIERS[t] || '';
  function updateSkills(p) {
    const cls = CLASSES[p.cls];
    for (let i = 0; i < cls.skills.length; i++) {
      const s = E.slots[i < 5 ? i : i + 2], k = cls.skills[i]; if (!s) continue;
      const learned = !!(p.sk && p.sk[i]), lock = !learned || (k.tier || 0) > p.tier || (k.lvl || 0) > ELV(), cd = lock ? 0 : (p.cd[i] || 0), kn = i < 5 ? i + 1 : i + 3;
      const key = p.cls + (lock ? 'L' : '') + (p.sk ? p.sk[i] : 0);
      if (s._cls !== key) {
        s._cls = key; s.$ic.textContent = k.ic; setText(s.$mpc, k.mp || '');
        s.title = !learned ? `${k.n} [${kn}]\nNão aprendida: fale com um Mestre de Habilidades.` : lock ? `${k.n} [${kn}]\nBloqueada: requer ${k.lvl && k.lvl > ELV() ? 'nível ' + DLV(k.lvl) : TIERS[k.tier] || 'evolução'}.`
          : `${k.n} Nv ${p.sk[i]} [${kn}]\n${k.d}\n${resName(p.cls)}: ${skEff(k, p.sk[i]).mp || 0} · Recarga: ${k.cd}s`;
      }
      setCls(s, 'lock', lock);
      setCls(s, 'nomp', !lock && p.mp < (k.mp || 0));
      setH(s.$cdv, cd > 0 && k.cd ? cd / k.cd * 100 : 0);
      setText(s.$cdt, cd > 0 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : '');
    }
    const pk = ['hp', 'mp'];
    for (let j = 0; j < 2; j++) { const s = E.slots[5 + j], q = p.pots[pk[j]]; setText(s.$qty, q); setCls(s, 'none', q <= 0); }
  }
  function updateQuest(G) {
    let cur = null, avail = null;
    for (const q of QUESTS) {
      const s = G.quests[q.id]; if (!s) continue;
      if (!cur && (s.state === 'active' || s.state === 'ready')) cur = [q, s];
      if (!avail && s.state === 'available') avail = q;
    }
    const M = G.main, s = M && MAIN[M.i];
    let k = '';
    if (s && ELV() >= s.lvl) { const tg = stepGoal(s); k += `<div class="qt-m"><small>📖 História</small><b>${esc(stepTitle(s))}</b><span>${esc(tg > 1 ? stepLine(s) + ' — ' + Math.min(M.prog, tg) + '/' + tg : stepLine(s))}</span></div>`; }
    else if (s) k += `<div class="qt-m dim"><small>📖 História</small><b>Próxima etapa no nível ${DLV(s.lvl)}</b></div>`;
    if (cur) { const [q, qs] = cur, tg = qTarget(q); k += `<div class="qt-s${qs.state === 'ready' ? ' ready' : ''}"><small>📜 Secundária</small><b>${esc(q.n)}</b><span>${qs.state === 'ready' ? 'Pronta! Fale com um Ancião.' : (q.boss ? BOSSES[q.boss].n + ': ' : 'Progresso: ') + Math.min(qs.prog || 0, tg) + '/' + tg}</span></div>`; }
    else if (avail) k += `<div class="qt-s ready"><small>📜 Secundária</small><b>${esc(avail.n)}</b><span>Nova missão: fale com um Ancião.</span></div>`;
    if (G.daily) { const rd = G.daily.list.filter(d => d.done && !d.claimed).length; if (rd) k += `<div class="qt-s ready"><small>📅 Diários</small><span>${rd} desafio(s) pronto(s) — abra Missões (Q)</span></div>`; }
    if (E.qt._k !== k) { E.qt._k = k; E.qt.innerHTML = k; }
    setVis(E.qt, !!k);
  }
  function heavy(G) {
    const p = G.player, s = G.stats || {}, c = CLASSES[p.cls], maxHp = s.maxHp || p.maxHp, maxMp = s.maxMp || p.maxMp;
    if (E.pfIc._c !== p.cls) { E.pfIc._c = p.cls; E.pfIc.innerHTML = ART.cls(p.cls); } setText(E.pfName, c.name); setText(E.pfTier, tierNameShort(p.tier)); setText(E.pfLv, 'Nv ' + p.lvl);
    setW(E.hp, p.hp / maxHp * 100); setText(E.hpT, `${Math.ceil(p.hp)} / ${Math.round(maxHp)}`);
    setCls(E.mp.parentNode, 'fury', !!c.res); if (E.mp.parentNode.title !== resName(p.cls)) E.mp.parentNode.title = resName(p.cls);
    setW(E.mp, p.mp / maxMp * 100); setText(E.mpT, `${Math.floor(p.mp)} / ${Math.round(maxMp)}`);
    setW(E.xp, p.lvl >= lvCap(p.tier) ? 100 : p.xp / xpPlayer(p.lvl, p.tier) * 100);
    setText(E.pfGold, '💰 ' + fmt(p.gold));
    setCls(E.hp.parentNode, 'low', p.hp / maxHp < .25);
    { const mid = p.lastMount, M_ = mid && MOUNTS[mid], mx = Game.mstMax(), en = (p.mst == null ? mx : p.mst) / mx * 100, lv = M_ ? Game.mountLv(mid) : 1, mr = M_ && p.mlv && p.mlv[mid], mxp = lv >= MOUNT_MAXLV ? 100 : (mr ? mr.xp : 0) / mountXpNeed(lv) * 100;
      setVis(E.mf, !!M_);
      if (M_) {
        const st_ = en <= 0 ? 'Exausta' : en < 30 ? 'Com fome' : en < 60 ? 'Cansada' : 'Disposta';
        const k = mid + '|' + Math.ceil(en) + '|' + (p.feed | 0) + '|' + !!p.mount + '|' + lv + '|' + Math.floor(mxp);
        if (E.mf._k !== k) { E.mf._k = k;
          E.mf.innerHTML = `<span class="mf-ic">${M_.ic}</span><div class="mf-t"><div class="mf-h"><b>${esc(M_.n)}</b><span class="mlv">Nv ${lv}</span><small>${p.mount ? 'montado' : 'a pé'} · ${st_}</small></div>`
            + `<div class="bar mst${en < 30 ? ' low' : ''}" title="Energia da montaria: cai enquanto você cavalga e volta devagar a pé. Abaixo de 30 ela come uma ração sozinha."><i style="width:${Math.max(0, Math.min(100, en))}%"></i><span>Energia ${Math.ceil(en / 100 * mx)}/${mx}</span></div>`
            + `<div class="bar mxp" title="XP da montaria: vença lutas montado ou cavalgue"><i style="width:${mxp.toFixed(1)}%"></i></div>`
            + `<small class="mf-f${(p.feed | 0) ? '' : ' warn'}">🌾 ${(p.feed | 0) ? (p.feed | 0) + ' ração(ões)' : 'Sem ração · compre no Cavalariço'}</small></div>`; }
      } }
    const t = G.target;
    setVis(E.tf, !!t);
    if (t) {
      { const k = t.id + (t.boss ? 'b' : ''); if (E.tfIc._k !== k) { E.tfIc._k = k; E.tfIc.innerHTML = ART.mob(t.id, t.boss); } }
      setText(E.tfName, (t.boss ? '👑 ' : '') + t.name); setText(E.tfLv, 'Nv ' + DLV(t.lvl));
      setW(E.tfHp, t.hp / t.maxHp * 100); setText(E.tfHpT, `${Math.ceil(t.hp)} / ${Math.round(t.maxHp)}`);
      setCls(E.tf, 'boss', t.boss);
    }
    { const h = Math.floor(G.tod || 0), m = Math.floor(((G.tod || 0) % 1) * 60), night = h < 6 || h >= 18;
      const k = (G.zone ? G.zone.name : '') + '|' + night + '|' + h + ':' + m + '|' + G.weather;
      if (E.zone._k !== k) { E.zone._k = k; E.zone.innerHTML = esc(G.zone ? G.zone.name : '') + ' · ' + WX_IC[night ? 'moon' : 'sun'] + ' ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + (WX_IC[G.weather] ? ' ' + WX_IC[G.weather] : ''); } }
    setText(E.mute, G.mute ? '🔇' : '🔊');
    if (IS_TOUCH) { const tb = E.talkBtn || (E.talkBtn = root.querySelector('.tact[data-k="KeyF"]')); if (tb) { const n = Game.nearNpc(); setCls(tb, 'off', !n); setCls(tb, 'near', !!n); } }
    updateSkills(p); updateQuest(G); drawMap(G);
    const A = G.auto || {}, any = A.attack || A.skills || A.hp || A.mp;
    setVis(E.badge, any);
    if (any) {
      setText(E.badge, '🤖 AUTO ' + (A.attack ? '⚔️' : '') + (A.skills ? '✨' : '') + (A.hp ? '❤️' : '') + (A.mp ? '💙' : ''));
      setCls(E.badge, 'paused', G.autoPaused);
    }
    if (st.panel) refreshPanels();
  }
  function update(G) {
    setCls(E.btn.char, 'pulse', !!(G.player && G.player.ap > 0));
    if (!E.pf || st.menu || !G || !G.player) return;
    const t = now();
    if (t - lastHeavy > 100) { lastHeavy = t; st.obj = G.state === 'play' ? objectivePos(G) : null; heavy(G); if (st.wins.includes('map')) renderMap(G); }
    if (G.vp) { updateLabels(G); updateFloats(G); updateArrow(G); }
    objSync(G);
  }

  /* ---------- init ---------- */
  function init() {
    root = document.getElementById('ui');
    build();
    const size = () => { W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight; };
    size(); addEventListener('resize', size);
    /* mover itens: clique PEGA o item (ele flutua no cursor), clique em outro espaço da mochila/baú SOLTA ou TROCA, clique no boneco equipa;
       Shift+clique faz a ação rápida de antes (equipar/guardar/retirar); Esc ou botão direito cancela. Com Ferreiro/Joalheiro abertos o clique só escolhe o item. */
    root.addEventListener('click', ev => {
      const T = ev.target; if (!T.closest) return; const cell = T.closest('.bi[data-zone]'), eqb = T.closest('.eqbox'), c = st.carry;
      if (IS_TOUCH && !c && st.side !== 'smith' && st.side !== 'jewel') { const ie = T.closest('.bi.it[data-id], .es.has[data-id]'); if (ie) { ev.stopPropagation(); ev.preventDefault(); st.card = { id: +ie.dataset.id, zone: ie.dataset.zone || 'eq', ask: false }; cardRender(); return; } }
      if (c) {
        const it = carryItem();
        if (cell && it) { ev.stopPropagation(); ev.preventDefault(); st.carry = null; carryRender(); if (cell.dataset.zone === c.from && +cell.dataset.slot === it.pos) refreshPanels(); else Game.itemMove(c.from, c.id, cell.dataset.zone, +cell.dataset.slot); return; }
        if (eqb && it) { ev.stopPropagation(); ev.preventDefault(); if (c.from !== 'bag') { toast('Leve o item do baú para a mochila antes de equipar.'); return; } st.carry = null; carryRender(); Game.equip(c.id); return; }
        return; // abas, páginas e botões seguem normalmente; o item continua na mão
      }
      if (cell && cell.dataset.id && !ev.shiftKey && st.side !== 'smith' && st.side !== 'jewel') { ev.stopPropagation(); ev.preventDefault(); st.carry = { id: +cell.dataset.id, from: cell.dataset.zone }; carryRender(ev); refreshPanels(); }
    }, true);
    window.addEventListener('mousemove', ev => { if (st.carry) { const g = root.querySelector('.carry-ghost'); if (g) { g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px'; } } });
    root.addEventListener('click', ev => {
      const t = ev.target.closest('[data-a]');
      if (st.fabOpen && t && t.dataset.a !== 'fab') { st.fabOpen = false; fabSync(); } // escolheu uma opção do menu: recolhe
      if (st.objOpen && t && t.dataset.a !== 'obj') { st.objOpen = false; objSync(G); } // qualquer outro botão da interface fecha o aviso de objetivo
      if (!t || t.disabled || !root.contains(t)) return;
      { const pn = t.closest('.panel'); if (pn && t.dataset.a === 'close') t.dataset._k = pn.id.slice(2); }
      act(t.dataset.a, t.dataset);
    });
    root.addEventListener('contextmenu', ev => {
      if (st.carry) { ev.preventDefault(); carryCancel(); return; }
      const t = ev.target.closest('[data-cm]');
      if (!t || !root.contains(t) || !(st.wins.includes('inv') || st.side) || !t.closest('#p-inv')) { cmClose(); return; }
      ev.preventDefault();
      const rr = root.getBoundingClientRect(); st.cm = { id: +t.dataset.cm, x: ev.clientX - rr.left, y: ev.clientY - rr.top, ask: false }; cmRender();
    }, true);
    /* arrastar itens: mochila → equipamento/baú, equipado → mochila, baú → mochila */
    root.addEventListener('dragstart', ev => { const t = ev.target.closest && ev.target.closest('[data-drag]'); if (!t) return; st.drag = { id: +t.dataset.id, from: t.dataset.drag, s: t.dataset.s }; cmClose(); try { ev.dataTransfer.setData('text/plain', t.dataset.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) { } });
    root.addEventListener('dragover', ev => { if (st.drag && ev.target.closest && ev.target.closest('.eqbox,[data-drop]')) ev.preventDefault(); });
    root.addEventListener('drop', ev => {
      const D = st.drag; st.drag = null; if (!D) return; ev.preventDefault(); const t = ev.target, cell = t.closest && t.closest('.bi[data-zone]');
      if (cell && (D.from === 'bag' || D.from === 'bank')) { Game.itemMove(D.from, D.id, cell.dataset.zone, +cell.dataset.slot); return; }
      if (D.from === 'bag' && t.closest('.eqbox')) Game.equip(D.id);
      else if (D.from === 'bag' && t.closest('[data-drop=bank]')) Game.bankPut(D.id);
      else if (t.closest('[data-drop=bag]')) { if (D.from === 'eq') Game.unequip(D.s); else if (D.from === 'bank') Game.bankTake(D.id); }
    });
    root.addEventListener('dragend', () => { st.drag = null; });
    // prévia 3D do personagem na janela de Equipamento: gira devagar; arraste para girar à mão
    root.addEventListener('pointerdown', ev => { const cv = ev.target.closest && ev.target.closest('canvas.pv'); if (cv) { st.pvDrag = { x: ev.clientX, y0: st.pvYaw || 0 }; ev.preventDefault(); } }, true);
    window.addEventListener('pointermove', ev => { if (st.pvDrag) st.pvYaw = st.pvDrag.y0 + (ev.clientX - st.pvDrag.x) * .012; });
    window.addEventListener('pointerup', () => { st.pvDrag = null; });
    setInterval(() => {
      const cv = document.querySelector('canvas.pv'); if (!cv || !cv.offsetParent || document.hidden || !Game.portrait) return;
      if (!st.pvDrag) st.pvYaw = (st.pvYaw || 0) + .035;
      try { Game.portrait(cv, st.pvYaw); } catch (e) { }
    }, 70);
    root.addEventListener('mousedown', ev => { if (st.cm && !ev.target.closest('.ctxm')) cmClose(); }, true);
    root.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('button, .btn, .bi, .es') && Game.sound) Game.sound('click', { force: true }); }, true);
    root.addEventListener('input', ev => { const t = ev.target; if (t.dataset && t.dataset.vol) { Game.setVol(t.dataset.vol, t.value / 100); return; } if (!t.dataset || !t.dataset.ci) return; if (t.dataset.ci === 'cr') Game.createSet('hcx', t.value); else Game.setLook('hcx', t.value); });
    addEventListener('pointerdown', () => { if (st.objOpen) { st.objOpen = false; objSync(G); } if (st.fabOpen) { st.fabOpen = false; fabSync(); } }); // toque no jogo (fora da interface) fecha o aviso de objetivo
    addEventListener('keydown', ev => {
      if (ev.ctrlKey || ev.altKey || ev.metaKey || st.menu) return;
      const k = ev.key.toLowerCase();
      if (k === 'escape' && st.carry) { carryCancel(); ev.preventDefault(); return; }
      if (ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
      if (k === 'escape') { if (st.modal) { modalClose(); winSync(); } else if (st.wins.length) winClose(st.wins[st.wins.length - 1]); else if (!st.death && typeof G !== 'undefined' && G.state === 'play') showPanel('pause'); ev.preventDefault(); return; }
      if (st.death || ev.repeat) return;
      if (k === 'i') togglePanel('inv');
      else if (k === 'c') togglePanel('char');
      else if (k === 'q') togglePanel('quest');
      else if (k === 't') togglePanel('auto');
      else if (k === 'h') togglePanel('look');
      else if (k === 'b') togglePanel('lv');
      else if (k === 'n') Game.toggleMute();
      else if (k === 'v') togglePanel('tree');
      else if (k === 'm') mapToggle();
    });
    showPanel(null);
  }

  function openDialog(id) {
    if (st.menu || st.death) return;
    st.npc = id; st.msg = null; st.jw = null; st.sm = null; st.bp = 0;
    const n = NPCS.find(x => x.id === id), k = n && n.kind; st.side = k === 'bank' || k === 'smith' || k === 'jewel' ? k : null; // serviço com a janela de Equipamento ao lado
    showPanel('dlg');
  }

  return {
    init, showMenu, hideMenu, showCreate, hideCreate, syncCreate, update, log, float, toast, bigToast, setEvents, levelUp, refreshPanels,
    openDialog, closeAll, showDeath, hideDeath, mapToWorld,
    isBlocking: () => st.menu || st.death || !!st.modal,
    paused: () => st.modal === 'pause',
  };
})();
