/* =====================================================================================================
   PAINEL DO ADMINISTRADOR (Ctrl+Shift+F10)
   AVISO: num jogo OFFLINE, que roda inteiro no navegador do jogador, esta senha só impede que alguém
   abra o painel por acaso. Quem tem o arquivo pode ler/alterar o código e o localStorage à vontade.
   A validação de verdade (quem é administrador, quais eventos e valores valem) precisa ficar num
   SERVIDOR quando o jogo for multiplayer: o cliente só deve receber o CFG e a lista de eventos prontos
   (o formato do "Exportar" já é o mesmo que um servidor pode servir) e desenhar com UI.setEvents(list).
   Este módulo é fechado (IIFE): nada daqui fica exposto no objeto Game. Ele só altera o CFG e os eventos,
   através do acesso controlado que o game.js entrega uma única vez em Game._adminHook(fn).
   ===================================================================================================== */
(() => {
  'use strict';
  const KEY = 'aldoria_admin_v1', ITER = 150000, SESSION_MS = 15 * 60 * 1000, LOCK_MS = 60 * 1000, MAX_FAIL = 3;
  let api = null;
  Game._adminHook(a => { api = a; });
  if (!api) return;
  const CFG = api.cfg, DEF = api.defaults, clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- limites de cada valor (validação na edição e na importação) ---------- */
  function lim(path) {
    if (/^drop\.mobBoost/.test(path)) return [0, 5];
    if (/^drop\.items/.test(path)) return [0, 10];
    if (/^econ\./.test(path)) return [0, 100];
    if (/^champ\./.test(path)) return [5, 86400];
    if (path === 'jewel.costMul') return [0, 100];
    return [0, 1]; // chances
  }
  /* copia src para dst seguindo o formato do padrão (só números conhecidos, dentro dos limites) */
  function mergeCfg(dst, src, def, path) {
    for (const k of Object.keys(def)) {
      const p = path ? path + '.' + k : k, d = def[k], v = src ? src[k] : undefined;
      if (d && typeof d === 'object') { if (!dst[k] || typeof dst[k] !== 'object') dst[k] = Array.isArray(d) ? [] : {}; mergeCfg(dst[k], v, d, p); }
      else { const n = Number(v), [a, b] = lim(p); dst[k] = (v !== undefined && v !== null && v !== '' && isFinite(n)) ? Math.min(b, Math.max(a, n)) : d; }
    }
  }
  const getP = p => p.split('.').reduce((o, k) => o[k], CFG);
  function setP(p, v) { const ks = p.split('.'), last = ks.pop(), o = ks.reduce((o, k) => o[k], CFG), [a, b] = lim(p), n = Number(v); if (isFinite(n)) o[last] = Math.min(b, Math.max(a, n)); }

  /* ---------- armazenamento próprio (separado da conta) ---------- */
  let S = { auth: null, fails: 0, lockUntil: 0, cfg: null, events: [] };
  try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && typeof j === 'object') S = Object.assign(S, j); } catch (e) { /* ignora */ }
  function persist() { S.cfg = clone(CFG); S.events = api.getEvents(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignora */ } }
  mergeCfg(CFG, S.cfg || {}, DEF, '');
  api.setEvents(S.events || []); api.cfgChanged();

  /* ---------- senha: PBKDF2/SHA-256 com salt (crypto.subtle) ---------- */
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function derive(pw, salt, iter) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256));
  }
  const sameBytes = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i]; return r === 0; };
  async function createPw(pw) { const salt = crypto.getRandomValues(new Uint8Array(16)); S.auth = { alg: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), hash: b64(await derive(pw, salt, ITER)) }; S.fails = 0; S.lockUntil = 0; persist(); }
  async function checkPw(pw) { const A = S.auth; return sameBytes(await derive(pw, unb64(A.salt), A.iter | 0 || ITER), unb64(A.hash)); }

  /* ---------- sessão ---------- */
  let sessUntil = 0, root = null, tab = 'test', busy = false;
  const logged = () => Date.now() < sessUntil;
  const touch = () => { if (logged()) sessUntil = Date.now() + SESSION_MS; };
  setInterval(() => { if (sessUntil && !logged()) { sessUntil = 0; cheatsOff(); if (root && !root.classList.contains('adm-off')) { render(); msg('Sessão expirada após 15 minutos sem uso. Digite a senha de novo.', 'warn'); } } }, 2000);

  /* ---------- estilo próprio (prefixo .adm-) ---------- */
  const css = `
.adm-root{position:fixed;inset:0;z-index:9999;background:rgba(6,8,14,.72);display:flex;align-items:center;justify-content:center;font:14px/1.4 system-ui,Segoe UI,Roboto,sans-serif;color:#dfe6f2}
.adm-root.adm-off{display:none}
.adm-win{width:min(1060px,96vw);height:min(720px,94vh);display:flex;flex-direction:column;background:#141a26;border:1px solid #34405a;border-radius:12px;box-shadow:0 20px 60px #000;overflow:hidden}
.adm-head{display:flex;align-items:center;gap:10px;padding:10px 16px;background:linear-gradient(90deg,#1d2638,#251b30);border-bottom:1px solid #34405a}
.adm-head h1{font-size:17px;margin:0;color:#ffd36b;letter-spacing:.04em;flex:1}
.adm-head small{color:#8f9bb3}
.adm-btn{background:#26314a;color:#e8eefb;border:1px solid #415072;border-radius:7px;padding:6px 12px;cursor:pointer;font:600 13px system-ui,sans-serif}
.adm-btn:hover{background:#30405f}.adm-btn.adm-pri{background:#2f6fd0;border-color:#4f8ff0}.adm-btn.adm-dan{background:#7a2530;border-color:#a33b48}
.adm-btn.adm-gold{background:#8a6514;border-color:#d1a23a;color:#fff6dc}
.adm-body{display:flex;flex:1;min-height:0}
.adm-tabs{width:190px;background:#10151f;border-right:1px solid #2a3449;padding:8px;display:flex;flex-direction:column;gap:4px}
.adm-tab{text-align:left;background:none;border:0;color:#b8c3d9;padding:9px 12px;border-radius:7px;cursor:pointer;font:600 14px system-ui,sans-serif}
.adm-tab:hover{background:#1b2333}.adm-tab.adm-on{background:#2a3550;color:#ffd36b}
.adm-tabs .adm-sp{flex:1}
.adm-main{flex:1;overflow:auto;padding:16px 20px}
.adm-main h2{font-size:16px;margin:4px 0 4px;color:#ffd36b}.adm-main h3{font-size:14px;margin:16px 0 6px;color:#9fc2ff}
.adm-note{color:#8f9bb3;font-size:12.5px;margin:2px 0 10px}
.adm-row{display:grid;grid-template-columns:230px 1fr 92px 46px;align-items:center;gap:10px;padding:3px 0}
.adm-row label{color:#cdd6e8}.adm-row input[type=range]{width:100%;accent-color:#f2c14e}
.adm-num,.adm-in,.adm-sel{background:#0d121b;color:#e8eefb;border:1px solid #3a4763;border-radius:6px;padding:5px 7px;font:13px system-ui,sans-serif}
.adm-num{width:80px}.adm-row .adm-u{color:#8f9bb3;font-size:12px}
.adm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 26px}
.adm-grid .adm-row{grid-template-columns:150px minmax(60px,1fr) 70px 34px;gap:8px}.adm-grid .adm-num{width:62px}
.adm-tbl{border-collapse:collapse;font-size:12.5px;margin:6px 0}.adm-tbl td,.adm-tbl th{border:1px solid #2c3750;padding:4px 9px;text-align:right}.adm-tbl th{background:#1a2234;color:#9fc2ff}
.adm-tbl td:first-child,.adm-tbl th:first-child{text-align:left}
.adm-card{background:#10151f;border:1px solid #2a3449;border-radius:9px;padding:12px 14px;margin:8px 0}
.adm-form{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}
.adm-form label{display:flex;gap:6px;align-items:center;color:#cdd6e8}
.adm-days label{gap:3px;margin-right:4px}
.adm-ev{display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid #2a3449;border-radius:8px;margin:5px 0;background:#121927}
.adm-ev b{flex:1}.adm-ev .adm-st{font-size:12px;padding:2px 8px;border-radius:99px;background:#2a3550}
.adm-ev .adm-st.adm-act{background:#8a6514;color:#fff6dc}.adm-ev .adm-st.adm-end{background:#333;color:#999}
.adm-msg{min-height:20px;font-size:13px;padding:0 16px 8px}.adm-msg.adm-ok{color:#7be08a}.adm-msg.adm-warn{color:#ff9a7a}
.adm-auth{margin:auto;width:360px;text-align:center}.adm-auth input{width:100%;margin:6px 0;box-sizing:border-box;padding:9px}
.adm-auth p{color:#a9b4c9}
.adm-tg{display:flex;flex-wrap:wrap;gap:6px 18px}.adm-tg label{display:flex;gap:6px;align-items:center;color:#cdd6e8;cursor:pointer}.adm-tg input{accent-color:#e04a4a;width:16px;height:16px}
.adm-card h3{margin-top:0}
.adm-testbar{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:9000;pointer-events:none;background:rgba(150,18,28,.82);color:#fff;font:700 11px/1 system-ui,sans-serif;letter-spacing:.06em;padding:3px 12px 4px;border-radius:6px 6px 0 0;box-shadow:0 0 8px rgba(0,0,0,.5);white-space:nowrap}
.adm-testbar span{font-weight:500;opacity:.85;letter-spacing:0}
.adm-ta{width:100%;height:300px;box-sizing:border-box;background:#0b0f17;color:#cfe3ff;border:1px solid #3a4763;border-radius:8px;font:12px ui-monospace,Consolas,monospace;padding:8px}
`;
  function build() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    root = document.createElement('div'); root.className = 'adm-root adm-off';
    root.innerHTML = '<div class="adm-win" role="dialog" aria-label="Painel do administrador"><div class="adm-head"><h1>⚙ Painel do Administrador · Aldoria</h1><small class="adm-sess"></small><button class="adm-btn" data-x="lock">Trancar</button><button class="adm-btn" data-x="close">Fechar ✕</button></div><div class="adm-body"></div><div class="adm-msg"></div></div>';
    document.body.appendChild(root);
    // o painel não deixa teclado/mouse vazarem para o jogo
    for (const t of ['keydown', 'keyup', 'keypress']) root.addEventListener(t, e => { e.stopPropagation(); if (t === 'keydown') { touch(); if (e.key === 'Escape') close(); } });
    for (const t of ['pointerdown', 'mousedown', 'wheel', 'contextmenu']) root.addEventListener(t, e => { e.stopPropagation(); touch(); }, { passive: true });
    root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('change', onChange);
  }
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let msgT = 0;
  function msg(t, k) { const m = $('.adm-msg'); m.textContent = t; m.className = 'adm-msg adm-' + (k || 'ok'); clearTimeout(msgT); msgT = setTimeout(() => { m.textContent = ''; }, 6000); }

  function open() { if (!root) build(); root.classList.remove('adm-off'); render(); const f = $('input[type=password]'); if (f) f.focus(); }
  function close() { if (root) root.classList.add('adm-off'); }

  /* ---------- telas ---------- */
  function render() {
    const body = $('.adm-body');
    $('[data-x=lock]').style.display = logged() ? '' : 'none';
    $('.adm-sess').textContent = logged() ? 'sessão expira após 15 min sem uso' : '';
    if (!logged()) { body.innerHTML = authView(); return; }
    const T = [['test', '🧪 Teste'], ['drops', '🎁 Drops'], ['enh', '🔨 Refino'], ['econ', '💰 Economia'], ['champ', '👑 Campeões'], ['jewel', '💎 Joalheiro'], ['events', '🎉 Eventos'], ['io', '📦 Exportar/Importar']];
    body.innerHTML = `<nav class="adm-tabs">${T.map(([k, n]) => `<button class="adm-tab${tab === k ? ' adm-on' : ''}" data-tab="${k}">${n}</button>`).join('')}<div class="adm-sp"></div><button class="adm-btn adm-dan" data-x="reset">↺ Restaurar padrões</button></nav><div class="adm-main">${VIEWS[tab]()}</div>`;
    refreshPreviews();
  }
  function authView() {
    const lockLeft = Math.ceil((S.lockUntil - Date.now()) / 1000);
    if (!window.crypto || !crypto.subtle) return '<div class="adm-auth"><h2>Indisponível</h2><p>Este navegador não oferece crypto.subtle.</p></div>';
    if (!S.auth) return `<form class="adm-auth" data-f="create"><h2>Criar senha do administrador</h2><p>Primeiro acesso: defina a senha (mínimo 6 caracteres). Só um hash PBKDF2 com salt é guardado.</p>
      <input class="adm-in" type="password" name="p1" placeholder="Nova senha" autocomplete="new-password"><input class="adm-in" type="password" name="p2" placeholder="Repita a senha" autocomplete="new-password"><button class="adm-btn adm-pri" type="submit">Criar senha e entrar</button></form>`;
    return `<form class="adm-auth" data-f="login"><h2>🔒 Acesso restrito</h2><p>${lockLeft > 0 ? `Muitas tentativas erradas. Tente de novo em <b class="adm-lock">${lockLeft}</b> s.` : `Digite a senha do administrador.${S.fails ? ' Tentativas restantes: ' + (MAX_FAIL - S.fails) + '.' : ''}`}</p>
      <input class="adm-in" type="password" name="pw" placeholder="Senha" autocomplete="current-password"${lockLeft > 0 ? ' disabled' : ''}><button class="adm-btn adm-pri" type="submit"${lockLeft > 0 ? ' disabled' : ''}>Entrar</button></form>`;
  }
  document.addEventListener('submit', async e => {
    const f = e.target; if (!root || !root.contains(f)) return; e.preventDefault(); if (busy) return;
    if (f.dataset.f === 'create') {
      const a = f.p1.value, b = f.p2.value;
      if (a.length < 6) return msg('A senha precisa ter pelo menos 6 caracteres.', 'warn');
      if (a !== b) return msg('As senhas não conferem.', 'warn');
      busy = true; try { await createPw(a); } finally { busy = false; }
      sessUntil = Date.now() + SESSION_MS; render(); msg('Senha criada. Bem-vindo ao painel!');
    } else if (f.dataset.f === 'login') {
      if (Date.now() < S.lockUntil) return render();
      busy = true; let ok = false; try { ok = await checkPw(f.pw.value); } finally { busy = false; }
      if (ok) { S.fails = 0; S.lockUntil = 0; persist(); sessUntil = Date.now() + SESSION_MS; render(); msg('Acesso liberado.'); return; }
      S.fails = (S.fails | 0) + 1;
      if (S.fails >= MAX_FAIL) { S.fails = 0; S.lockUntil = Date.now() + LOCK_MS; persist(); render(); msg('Senha errada 3 vezes: bloqueado por 60 segundos.', 'warn'); lockTick(); return; }
      persist(); render(); msg('Senha incorreta.', 'warn');
    }
  });
  function lockTick() { const t = setInterval(() => { if (!root || logged()) return clearInterval(t); const el = $('.adm-lock'); const left = Math.ceil((S.lockUntil - Date.now()) / 1000); if (left <= 0) { clearInterval(t); render(); } else if (el) el.textContent = left; }, 500); }

  /* ---------- campos genéricos: slider + número ---------- */
  // o: { pct: mostra em %, scale: divisor de exibição, unit, step, max (em unidades exibidas) }
  function field(path, label, o) {
    o = o || {}; const sc = o.pct ? 100 : (o.scale ? 1 / o.scale : 1), [a, b] = lim(path), v = getP(path) * sc;
    const mn = a * sc, mx = o.max != null ? o.max : b * sc, step = o.step || (o.pct ? .1 : .05);
    return `<div class="adm-row"><label title="${esc(path)}">${label}</label><input type="range" data-p="${path}" data-sc="${sc}" min="${mn}" max="${mx}" step="${step}" value="${+v.toFixed(4)}"><input class="adm-num" type="number" data-p="${path}" data-sc="${sc}" min="${mn}" max="${b * sc}" step="${step}" value="${+v.toFixed(4)}"><span class="adm-u">${o.unit || (o.pct ? '%' : '')}</span></div>`;
  }
  const RN = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'], MT = [['normal', 'Comum'], ['elite', 'Elite'], ['boss', 'Chefe'], ['champ', 'Campeão']];
  function rarDist(rb, rareMul) { // mesma regra de rollRarity (data.js)
    const D = CFG.drop, out = [0, 0, 0, 0, 0]; let acc = 0;
    for (let i = 4; i >= 1; i--) { const p = Math.max(0, (D.rar[i] + D.rarBoost[i] * rb) * (i >= 2 ? rareMul : 1)); out[i] = Math.max(0, Math.min(p, 1 - acc)); acc = Math.min(1, acc + p); }
    out[0] = Math.max(0, 1 - acc); return out;
  }
  const pc = v => (v * 100).toFixed(v < .1 ? 1 : 0) + '%';
  function refreshPreviews() {
    const el = $('.adm-prev-drop');
    if (el) {
      const E = cfgEff(), D = CFG.drop;
      el.innerHTML = `<tr><th>Monstro</th>${RN.map(r => `<th>${r}</th>`).join('')}<th>Itens/abate</th><th>Pedra</th><th>Adicional</th></tr>` + MT.map(([k, n]) => {
        const d = rarDist(D.mobBoost[k], E.rareMul); return `<tr><td>${n}</td>${d.map(x => `<td>${pc(x)}</td>`).join('')}<td>${(+D.items[k]).toFixed(2)}</td><td>${pc(Math.min(1, D.stone[k] * E.stoneMul))}</td><td>${pc(D.adds[k])}</td></tr>`; }).join('');
      $('.adm-ev-note').textContent = E.rareMul !== 1 || E.stoneMul !== 1 ? `Com eventos ativos: raros ×${E.rareMul}, pedras ×${E.stoneMul}.` : 'Nenhum evento alterando drops agora.';
    }
    const ej = $('.adm-prev-jewel');
    if (ej) ej.innerHTML = '<tr><th>Adicionais no item</th><th>Chance</th><th>Custo (item grau 2)</th></tr>' + [0, 1, 2].map(n => { const it = { grade: 2, adds: new Array(n).fill({}) }; return `<tr><td>${n}</td><td>${pc(jewelChance(it))}</td><td>${jewelCost(it)}</td></tr>`; }).join('');
    const ee = $('.adm-prev-enh');
    if (ee) { const add = cfgEff().enhAdd; ee.textContent = add ? `Evento Refino abençoado ativo: +${add}% em cada tentativa (ex.: +9 → +10 fica ${pc(enhChance(9))}).` : 'Nenhum bônus de evento no refino agora.'; }
    const ec = $('.adm-prev-champ');
    if (ec) { const m = cfgEff().champMul; ec.textContent = `Intervalo efetivo agora: ${(CFG.champ.min / 60 / m).toFixed(1)} a ${(CFG.champ.max / 60 / m).toFixed(1)} min${m !== 1 ? ' (Invasão de campeões ×' + m + ')' : ''}.`; }
    const ex = $('.adm-prev-econ');
    if (ex) { const E = cfgEff(); ex.textContent = `Efetivo agora (com eventos): XP ×${+(CFG.econ.xpMul * E.xpMul).toFixed(2)} · Ouro ×${+(CFG.econ.goldMul * E.goldMul).toFixed(2)} · Preços ×${CFG.econ.shopMul}.`; }
  }
  const VIEWS = {
    drops: () => `<h2>Drops</h2><p class="adm-note">Chance base de cada raridade (o que sobra é Comum) e quanto o bônus do monstro soma. Itens por abate: a parte inteira é garantida e a fração é a chance de mais um item (0,22 = 22% de chance de 1 item).</p>
      <h3>Raridade base</h3>${[1, 2, 3, 4].map(i => field('drop.rar.' + i, RN[i], { pct: true, step: .1 })).join('')}
      <h3>Bônus de raridade (por ponto de bônus do monstro)</h3>${[1, 2, 3, 4].map(i => field('drop.rarBoost.' + i, RN[i], { pct: true, step: .5 })).join('')}
      <h3>Por tipo de monstro</h3><div class="adm-grid"><div>${MT.map(([k, n]) => field('drop.mobBoost.' + k, 'Bônus de raridade · ' + n, { step: .01, max: 2, unit: 'pt' })).join('')}</div><div>${MT.map(([k, n]) => field('drop.items.' + k, 'Itens por abate · ' + n, { step: .01, max: 6, unit: 'itens' })).join('')}</div>
      <div>${MT.map(([k, n]) => field('drop.stone.' + k, 'Chance de pedra · ' + n, { pct: true, step: .5 })).join('')}</div><div>${MT.map(([k, n]) => field('drop.adds.' + k, 'Item com adicional · ' + n, { pct: true, step: .5 })).join('')}</div>
      <div>${MT.map(([k, n]) => field('drop.mount.' + k, 'Chance de montaria · ' + n, { pct: true, step: .1 })).join('')}</div><div class="adm-note">Montarias caem conforme a zona do monstro ou o chefe (tabela MOUNT_DROP em data.js): ${Object.keys(MOUNT_DROP.zone).map(z => ZN[z].name + ': ' + MOUNT_DROP.zone[z].map(m => MOUNTS[m].n).join(', ')).join(' · ')}; chefes: ${Object.keys(MOUNT_DROP.boss).map(b => BOSSES[b].n + ' → ' + MOUNTS[MOUNT_DROP.boss[b]].n).join(' · ')}.</div></div>
      <h3>Resultado (chance por item que cai)</h3><table class="adm-tbl adm-prev-drop"></table><p class="adm-note adm-ev-note"></p>`,
    enh: () => `<h2>Refino</h2><p class="adm-note">Chance de sucesso de cada tentativa no Ferreiro. Falhar só gasta o ouro.</p>${CFG.enh.slice(0, 9).map((_, i) => field('enh.' + i, `+${i} → <b>+${i + 1}</b>`, { pct: true, step: .5 })).join('')}<p class="adm-note adm-prev-enh"></p>`,
    econ: () => `<h2>Economia</h2><p class="adm-note">Multiplicadores globais. XP vale para todo XP ganho; ouro vale para o ouro dos monstros; preços valem para as lojas de equipamento e poções.</p>
      ${field('econ.xpMul', 'Multiplicador de XP', { step: .05, max: 10, unit: '×' })}${field('econ.goldMul', 'Multiplicador de ouro', { step: .05, max: 10, unit: '×' })}${field('econ.shopMul', 'Multiplicador de preços', { step: .05, max: 5, unit: '×' })}<p class="adm-note adm-prev-econ"></p>`,
    champ: () => `<h2>Campeões errantes</h2><p class="adm-note">Monstros muito fortes que surgem perto do jogador. O próximo aparece num tempo sorteado entre o mínimo e o máximo.</p>
      ${field('champ.first', 'Primeiro Campeão após', { scale: 60, step: .5, max: 30, unit: 'min' })}${field('champ.min', 'Intervalo mínimo', { scale: 60, step: .5, max: 60, unit: 'min' })}${field('champ.max', 'Intervalo máximo', { scale: 60, step: .5, max: 60, unit: 'min' })}<p class="adm-note adm-prev-champ"></p>`,
    jewel: () => `<h2>Joalheiro</h2><p class="adm-note">Chance de engastar uma pedra = base − (redução × adicionais que o item já tem), nunca abaixo do mínimo.</p>
      ${field('jewel.base', 'Chance base', { pct: true, step: .5 })}${field('jewel.perAdd', 'Redução por adicional', { pct: true, step: .5 })}${field('jewel.min', 'Chance mínima', { pct: true, step: .5 })}${field('jewel.costMul', 'Multiplicador de custo', { step: .05, max: 5, unit: '×' })}<table class="adm-tbl adm-prev-jewel"></table>`,
    events: evView,
    test: testView,
    io: () => `<h2>Exportar / Importar</h2><p class="adm-note">JSON com a configuração e os eventos — o mesmo formato que um servidor pode entregar aos jogadores no multiplayer.</p>
      <div class="adm-form"><button class="adm-btn adm-pri" data-x="exp">Gerar JSON atual</button><button class="adm-btn" data-x="copy">Copiar</button><button class="adm-btn" data-x="dl">Baixar arquivo</button><label class="adm-btn">Abrir arquivo…<input type="file" accept=".json,application/json" data-x="file" hidden></label><button class="adm-btn adm-gold" data-x="imp">Importar o JSON abaixo</button></div>
      <textarea class="adm-ta" spellcheck="false" placeholder="Cole aqui um JSON exportado e clique em Importar."></textarea>`,
  };

  /* ---------- eventos ---------- */
  const DN = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const left = ms => { const m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h ? h + 'h ' + (m % 60) + 'min' : m + 'min'; };
  const fmtD = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const localDT = t => { const d = new Date(t - new Date(t).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  function evView() {
    const act = api.active(), evs = api.getEvents(), now = Date.now(), actIds = new Set(act.map(a => a.id));
    const opt = Object.entries(EVENT_TYPES).map(([k, t]) => `<option value="${k}">${t.ic} ${t.n}</option>`).join('');
    return `<h2>Eventos</h2><p class="adm-note">Eventos ativos se combinam com a configuração (multiplicam XP, ouro, raros, campeões e pedras; o refino soma pontos percentuais). Os jogadores veem uma faixa dourada no topo e um aviso quando cada evento começa ou termina.</p>
    <div class="adm-card"><div class="adm-form">
      <label>Tipo <select class="adm-sel" data-e="type">${opt}</select></label>
      <label>Multiplicador <input class="adm-num" type="number" data-e="mult" value="2" min="1" max="20" step="0.1"><span class="adm-u adm-e-unit">×</span></label>
      <label>Nome (opcional) <input class="adm-in" data-e="name" maxlength="40" placeholder="ex.: Festival da Colheita"></label></div>
      <div class="adm-form" style="margin-top:8px"><label><input type="radio" name="adm-mode" value="dur" checked> Duração a partir de agora</label><input class="adm-num" type="number" data-e="dur" value="1" min="1" step="1"><select class="adm-sel" data-e="unit"><option value="60000">minutos</option><option value="3600000" selected>horas</option></select></div>
      <div class="adm-form" style="margin-top:6px"><label><input type="radio" name="adm-mode" value="win"> Início e fim</label><input class="adm-in" type="datetime-local" data-e="from" value="${localDT(now + 3600e3)}"> até <input class="adm-in" type="datetime-local" data-e="to" value="${localDT(now + 3 * 3600e3)}"></div>
      <div class="adm-form adm-days" style="margin-top:6px"><label><input type="radio" name="adm-mode" value="rec"> Recorrente toda semana:</label>${DN.map((d, i) => `<label><input type="checkbox" data-day="${i}"${i === 0 || i === 6 ? ' checked' : ''}>${d}</label>`).join('')} das <input class="adm-in" type="time" data-e="rf" value="18:00"> às <input class="adm-in" type="time" data-e="rt" value="23:00"></div>
      <div class="adm-form" style="margin-top:10px"><button class="adm-btn adm-gold" data-x="evadd">＋ Criar evento</button><span class="adm-note">Atalhos:</span><button class="adm-btn" data-x="pre1">⚡ XP em dobro · 1h</button><button class="adm-btn" data-x="pre2">💎 Chuva de raros · 30min</button><button class="adm-btn" data-x="pre3">Fim de semana: XP ×2 sáb/dom 18h–23h</button></div></div>
    <h3>Ativos agora (${act.length})</h3>${act.length ? act.map(a => `<div class="adm-ev"><span>${a.ic}</span><b>${esc(a.name)}</b><span class="adm-st adm-act">termina em ${left(a.end - now)}</span><button class="adm-btn adm-dan" data-x="evstop" data-id="${esc(a.id)}">Encerrar</button></div>`).join('') : '<p class="adm-note">Nenhum evento ativo.</p>'}
    <h3>Todos os eventos (${evs.length})</h3>${evs.length ? evs.map(e => { const T = EVENT_TYPES[e.type], on = actIds.has(e.id), ended = !e.rec && e.end <= now;
      const when = e.rec ? `toda ${e.rec.days.map(d => DN[d]).join(', ')} · ${e.rec.from}–${e.rec.to}` : `${fmtD(e.start)} → ${fmtD(e.end)}`;
      return `<div class="adm-ev"><span>${T.ic}</span><b>${esc(e.name || evTitle(e))}</b><small class="adm-note">${when}</small><span class="adm-st${on ? ' adm-act' : ended ? ' adm-end' : ''}">${on ? 'ativo' : ended ? 'encerrado' : 'agendado'}</span>${on ? `<button class="adm-btn" data-x="evstop" data-id="${esc(e.id)}">Encerrar</button>` : ''}<button class="adm-btn adm-dan" data-x="evdel" data-id="${esc(e.id)}">Excluir</button></div>`; }).join('') : '<p class="adm-note">Nenhum evento criado.</p>'}`;
  }
  const newId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function addEvent(ev) {
    const now = Date.now(), list = api.getEvents().filter(e => e.rec || e.end > now - 864e5); // limpa encerrados há mais de 1 dia
    const out = api.setEvents(list.concat([Object.assign({ id: newId() }, ev)]));
    if (out.length === list.length) return msg('Evento inválido: confira os horários.', 'warn');
    persist(); render(); msg('Evento criado: ' + (ev.name || evTitle(ev)) + '.');
  }
  function evFromForm() {
    const type = $('[data-e=type]').value, mult = +$('[data-e=mult]').value || EVENT_TYPES[type].def, name = $('[data-e=name]').value.trim() || undefined;
    const mode = ($('input[name=adm-mode]:checked') || {}).value, now = Date.now();
    if (mode === 'dur') { const d = Math.max(1, +$('[data-e=dur]').value || 1) * +$('[data-e=unit]').value; return { type, mult, name, start: now, end: now + d }; }
    if (mode === 'win') { const a = new Date($('[data-e=from]').value).getTime(), b = new Date($('[data-e=to]').value).getTime(); if (!(b > a)) return null; return { type, mult, name, start: a, end: b }; }
    const days = $$('[data-day]').filter(c => c.checked).map(c => +c.dataset.day); if (!days.length) return null;
    return { type, mult, name, rec: { days, from: $('[data-e=rf]').value, to: $('[data-e=rt]').value } };
  }
  function stopEvent(id) {
    const now = Date.now(), list = api.getEvents(), e = list.find(x => x.id === id); if (!e) return;
    if (e.rec) { const a = api.active().find(x => x.id === id); if (a) e.skip = a.end; } else e.end = Math.min(e.end, now);
    api.setEvents(list); persist(); render(); msg('Evento encerrado.');
  }


  /* ---------- 🧪 Teste: conta ADM, trapaças e atalhos (só com a sessão aberta; as trapaças não são salvas) ---------- */
  const T_ = api.test, CH = { god: false, nocd: false, inf: false, spd: false, one: false, tp: false };
  const CHN = { god: 'Invencível', nocd: 'Sem recarga de habilidades', inf: 'Mana/fúria infinita', spd: 'Velocidade ×3', one: 'Matar com 1 golpe', tp: 'Teleporte livre (clique no mapa M)' };
  const CHS = { god: 'Invencível', nocd: 'Sem recarga', inf: 'Recurso infinito', spd: 'Vel. ×3', one: '1 golpe', tp: 'Teleporte' };
  let bar = null, admArm = 0, tpDown = null;
  const GI = { cls: null, slot: 'w', wt: '', rar: 4, plus: 10, tier: 3, adds: true };
  function applyCheats() {
    T_.cheats(CH);
    const on = Object.keys(CH).filter(k => CH[k]);
    if (!bar) { bar = document.createElement('div'); bar.className = 'adm-testbar'; document.body.appendChild(bar); }
    bar.style.display = on.length ? '' : 'none'; bar.innerHTML = 'MODO TESTE <span>· ' + on.map(k => CHS[k]).join(' · ') + '</span>';
  }
  function cheatsOff() { for (const k in CH) CH[k] = false; applyCheats(); }
  cheatsOff(); // nada ligado ao carregar a página
  const opts = (list, cur) => list.map(([v, n]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(n)}</option>`).join('');
  function testView() {
    const I = T_.info(), L = T_.lists(), play = I.play;
    if (!GI.cls || !L.classes.some(c => c[0] === GI.cls)) GI.cls = I.cls || L.classes[0][0];
    const wts = (L.classes.find(c => c[0] === GI.cls) || L.classes[0])[2]; if (!wts.includes(GI.wt)) GI.wt = wts[0];
    const dis = play ? '' : ' disabled';
    return `<h2>Teste</h2><p class="adm-note">Ferramentas para testar o jogo. Tudo aqui só funciona com a sessão do administrador aberta; as trapaças não são salvas e desligam ao trancar o painel ou quando a sessão expira.</p>
    <div class="adm-card"><h3>Conta de teste</h3>
      <p class="adm-note">Conta atual: <b>${esc(I.acc || '—')}</b>${play ? ` · jogando com <b>${esc(I.name)}</b> (nível ${I.lvl}, ${esc(L.tiers[I.tier] || '')})` : ' · no menu'}${I.isAdm ? ' · <b style="color:#ff8a8a">conta de teste</b>' : ''}</p>
      <p class="adm-note">Cria a conta <b>ADM</b> com 4 personagens (um de cada classe), Supremo nível 50, atributos distribuídos, todas as habilidades no máximo, todas as montarias, 10 milhões de ouro (bolsa e baú), equipamento Lendário +10 com 3 adicionais, um conjunto de cada raridade no baú, 99 poções e 999 pedras. A história começa do zero. Sua conta atual não é alterada: volte para ela com <b>⇄ Trocar conta</b> no menu.</p>
      <div class="adm-form">${I.admReal ? '<span class="adm-note" style="color:#ff9a7a">Já existe uma conta “ADM” criada por um jogador; ela não será alterada.</span>' : `<button class="adm-btn adm-gold" data-x="t-adm">${I.admExists ? '↻ Recriar conta ADM de teste' : '＋ Criar conta ADM de teste'}</button>`}
      <button class="adm-btn" data-x="t-story"${dis}>✔ Concluir história (personagem atual)</button></div></div>
    <div class="adm-card"><h3>Trapaças</h3><div class="adm-tg">${Object.keys(CH).map(k => `<label><input type="checkbox" data-ch="${k}"${CH[k] ? ' checked' : ''}> ${CHN[k]}</label>`).join('')}</div>
      <div class="adm-form" style="margin-top:8px"><button class="adm-btn" data-x="t-alloff">Desligar todas</button><span class="adm-note">Com alguma ligada aparece uma faixa vermelha “MODO TESTE” no jogo.</span></div></div>
    <div class="adm-card"><h3>Personagem atual</h3>${play ? '' : '<p class="adm-note">Entre no jogo com um personagem para usar estes botões.</p>'}
      <div class="adm-form"><button class="adm-btn" data-x="t-lv1"${dis}>+1 nível</button><button class="adm-btn" data-x="t-lv50"${dis}>Nível 50</button>
      <label>Fase <select class="adm-sel" data-t="tier"${dis}>${opts(L.tiers.map((n, i) => [i, n]), I.tier | 0)}</select></label><button class="adm-btn" data-x="t-tier"${dis}>Mudar fase</button>
      <button class="adm-btn adm-gold" data-x="t-gold"${dis}>+1.000.000 ouro</button><button class="adm-btn" data-x="t-heal"${dis}>❤ Curar + energia da montaria</button></div></div>
    <div class="adm-card"><h3>🔊 Sons (para ouvir e avaliar)</h3><p class="adm-note">Clique para tocar. Os efeitos têm volume próprio; ajuste o geral no menu de pausa. As prévias de música e de ambiente duram 45 s.</p>
      ${(() => { const N = T_.soundNames(), G_ = [['Interface', /^(click|open|close|error|equip|coin|pick|potion|level|quest|achievement|evolve|discover|refino|gem|enc|toast|portal|forge)/], ['Combate', /^(swing|hit|crit|hurt|die|block|skill|heal|shield|summon|boom|thunder|shoot)/], ['Monstros', /^(mob|boss)/], ['Movimento', /^(step|gallop|wing)/]]; return G_.map(([n, re]) => `<div class="adm-form" style="margin-top:6px;flex-wrap:wrap"><b style="min-width:84px">${n}</b>${N.filter(x => re.test(x)).map(x => `<button class="adm-btn" data-x="t-snd" data-n="${x}">${x}</button>`).join('')}</div>`).join(''); })()}
      <div class="adm-form" style="margin-top:10px;flex-wrap:wrap"><b style="min-width:84px">Música</b>${['town', 'field', 'forest', 'ruins', 'dunes', 'tundra', 'ashlands'].map(z => `<button class="adm-btn" data-x="t-mus" data-z="${z}">${z}</button>`).join('')}<button class="adm-btn adm-pri" data-x="t-mus" data-z="ruins" data-b="1">⚔ combate (chefe)</button></div>
      <div class="adm-form" style="margin-top:6px;flex-wrap:wrap"><b style="min-width:84px">Ambiente</b>${['field', 'forest', 'ruins', 'dunes', 'tundra', 'ashlands'].map(z => `<button class="adm-btn" data-x="t-amb" data-z="${z}">${z}</button>`).join('')}<button class="adm-btn" data-x="t-amb" data-z="field" data-n="night">noite</button><button class="adm-btn" data-x="t-amb" data-z="field" data-n="rain">chuva</button><button class="adm-btn" data-x="t-amb" data-z="field" data-n="storm">tempestade</button><button class="adm-btn" data-x="t-amb" data-z="field" data-n="coast">mar</button><button class="adm-btn" data-x="t-amb" data-z="field" data-n="town">vila</button><button class="adm-btn" data-x="t-snd-off">⏹ parar prévia</button></div></div>
    <div class="adm-card"><h3>Gerar item</h3><div class="adm-form">
      <label>Classe <select class="adm-sel" data-g="cls">${opts(L.classes.map(c => [c[0], c[1]]), GI.cls)}</select></label>
      <label>Espaço <select class="adm-sel" data-g="slot">${opts(L.slots, GI.slot)}</select></label>
      <label${GI.slot === 'w' ? '' : ' style="opacity:.4"'}>Arma <select class="adm-sel" data-g="wt"${GI.slot === 'w' ? '' : ' disabled'}>${opts(wts.map(w => [w, w]), GI.wt)}</select></label>
      <label>Raridade <select class="adm-sel" data-g="rar">${opts(L.rarity.map((n, i) => [i, n]), GI.rar)}</select></label>
      <label>Refino <select class="adm-sel" data-g="plus">${opts([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => [i, '+' + i]), GI.plus)}</select></label>
      <label>Fase exigida <select class="adm-sel" data-g="tier">${opts(L.tiers.map((n, i) => [i, n]), GI.tier)}</select></label>
      <label><input type="checkbox" data-g="adds"${GI.adds ? ' checked' : ''}> 3 adicionais da classe</label>
      <button class="adm-btn adm-pri" data-x="t-give"${dis}>Gerar na mochila</button></div></div>
    <div class="adm-card"><h3>Mundo</h3><div class="adm-form">
      <label>Monstro <select class="adm-sel" data-t="spawn">${opts([['champ', '👑 Campeão da zona']].concat(L.bosses.map(b => [b[0], '☠ ' + b[1] + ' (nv ' + b[2] + ')'])), 'champ')}</select></label><button class="adm-btn adm-dan" data-x="t-spawn"${dis}>Fazer surgir perto</button></div>
      <div class="adm-form" style="margin-top:8px"><label>Hora <input class="adm-num" type="number" min="0" max="23.9" step="0.5" data-t="tod" value="${(Math.round((I.tod || 0) * 2) / 2) % 24}"></label><button class="adm-btn" data-x="t-time">Mudar hora</button>
      <button class="adm-btn" data-x="t-h6">Amanhecer</button><button class="adm-btn" data-x="t-h12">Meio-dia</button><button class="adm-btn" data-x="t-h19">Pôr do sol</button><button class="adm-btn" data-x="t-h0">Meia-noite</button></div>
      <div class="adm-form" style="margin-top:8px"><label>Clima <select class="adm-sel" data-t="wx">${opts(L.weather, I.weather)}</select></label><button class="adm-btn" data-x="t-wx">Mudar clima</button></div>
      <div class="adm-form" style="margin-top:8px"><label>Vila <select class="adm-sel" data-t="vil">${opts(L.villages, L.villages[0][0])}</select></label><button class="adm-btn" data-x="t-vil"${dis}>Ir para a vila</button><span class="adm-note">(ignora a regra de portais vizinhos, só neste botão)</span></div></div>`;
  }
  const tv = k => { const e = $(`[data-t="${k}"]`); return e ? e.value : null; };
  function res(r, keep) { if (!r) return; msg(r.msg, r.ok ? 'ok' : 'warn'); if (!keep) { const sc = $('.adm-main') ? $('.adm-main').scrollTop : 0; render(); if ($('.adm-main')) $('.adm-main').scrollTop = sc; msg(r.msg, r.ok ? 'ok' : 'warn'); } }
  function testClick(x, b) {
    if (x === 't-adm') {
      const I = T_.info();
      if (I.admExists && Date.now() > admArm) { admArm = Date.now() + 4000; b.textContent = 'Clique de novo: recria a conta ADM do zero'; return; }
      admArm = 0; return res(T_.buildAdm());
    }
    if (x === 't-alloff') { cheatsOff(); render(); return msg('Trapaças desligadas.'); }
    if (x === 't-story') return res(T_.story());
    if (x === 't-lv1') return res(T_.level(1));
    if (x === 't-lv50') return res(T_.level(99));
    if (x === 't-tier') return res(T_.tier(+tv('tier')));
    if (x === 't-gold') return res(T_.gold(1e6));
    if (x === 't-heal') return res(T_.heal());
    if (x === 't-give') return res(T_.give(Object.assign({}, GI)), true);
    if (x === 't-spawn') return res(T_.spawn(tv('spawn')), true);
    if (x === 't-time') return res(T_.time(+tv('tod')));
    if (/^t-h\d+$/.test(x)) return res(T_.time(+x.slice(3)));
    if (x === 't-wx') return res(T_.weather(tv('wx')), true);
    if (x === 't-vil') return res(T_.village(tv('vil')), true);
    if (x === 't-snd') return res(T_.soundPlay(b.dataset.n), true);
    if (x === 't-snd-off') return res(T_.soundPreview(null), true);
    if (x === 't-mus') return res(T_.soundPreview({ zone: b.dataset.z, town: b.dataset.z === 'town', tod: 12, rain: 0, storm: 0, coast: 0, fight: b.dataset.b ? 1 : 0, boss: b.dataset.b ? 1 : 0, label: 'música ' + b.dataset.z + (b.dataset.b ? ' em combate' : '') }), true);
    if (x === 't-amb') { const k = b.dataset.n || ''; return res(T_.soundPreview({ zone: b.dataset.z, town: k === 'town', tod: k === 'night' ? 23 : 12, rain: k === 'rain' || k === 'storm' ? 1 : 0, storm: k === 'storm' ? 1 : 0, coast: k === 'coast' ? 1 : 0, fight: 0, boss: 0, label: 'ambiente ' + b.dataset.z + ' ' + k }), true); }
  }
  function testChange(t) {
    if (t.dataset.ch) { CH[t.dataset.ch] = !!t.checked; applyCheats(); msg(CHN[t.dataset.ch] + (t.checked ? ': ligado.' : ': desligado.'), t.checked ? 'ok' : 'warn'); return true; }
    if (t.dataset.g) { const k = t.dataset.g; GI[k] = k === 'adds' ? !!t.checked : (k === 'cls' || k === 'slot' || k === 'wt') ? t.value : +t.value; if (k === 'cls' || k === 'slot') render(); return true; }
    return false;
  }
  // teleporte livre: clique (sem arrastar) no mapa M
  document.addEventListener('mousedown', e => { tpDown = e.target && e.target.classList && e.target.classList.contains('map-c') ? [e.clientX, e.clientY] : null; }, true);
  document.addEventListener('click', e => {
    if (!CH.tp || !logged() || !tpDown || !e.target.classList || !e.target.classList.contains('map-c')) return;
    const d = Math.hypot(e.clientX - tpDown[0], e.clientY - tpDown[1]); tpDown = null; if (d > 5) return;
    const w = UI.mapToWorld(e.clientX, e.clientY); if (!w) return;
    const r = T_.tp(w[0], w[1]); api.toast((r.ok ? '✦ ' : '') + r.msg);
  }, true);
  /* ---------- export / import ---------- */
  const exportObj = () => ({ format: 'aldoria-admin-config', version: 1, exportedAt: new Date().toISOString(), cfg: clone(CFG), events: api.getEvents() });
  function importText(t) {
    let j; try { j = JSON.parse(t); } catch (e) { return msg('JSON inválido: ' + e.message, 'warn'); }
    if (!j || typeof j !== 'object' || !j.cfg || typeof j.cfg !== 'object') return msg('JSON sem o campo "cfg".', 'warn');
    mergeCfg(CFG, j.cfg, DEF, ''); if (Array.isArray(j.events)) api.setEvents(j.events);
    api.cfgChanged(); persist(); render(); msg('Configuração importada' + (Array.isArray(j.events) ? ' (com ' + api.getEvents().length + ' eventos)' : '') + '.');
  }

  /* ---------- interações ---------- */
  let resetArm = 0;
  function onInput(e) {
    const t = e.target; if (!t.dataset.p || !logged()) return; touch();
    const sc = +t.dataset.sc || 1; setP(t.dataset.p, +t.value / sc);
    const v = +(getP(t.dataset.p) * sc).toFixed(4);
    for (const o of $$(`[data-p="${t.dataset.p}"]`)) if (o !== t) o.value = v;
    api.cfgChanged(); persist(); refreshPreviews();
  }
  function onChange(e) {
    const t = e.target; touch();
    if (logged() && testChange(t)) return;
    if (t.dataset.p && e.type === 'change') { const sc = +t.dataset.sc || 1; t.value = +(getP(t.dataset.p) * sc).toFixed(4); }
    if (t.dataset.e === 'type') { const T = EVENT_TYPES[t.value]; $('[data-e=mult]').value = T.def; $('.adm-e-unit').textContent = T.unit === '%' ? '% (pontos)' : '×'; }
    if (t.dataset.x === 'file' && t.files[0]) { const r = new FileReader(); r.onload = () => { $('.adm-ta').value = r.result; importText(r.result); }; r.readAsText(t.files[0]); }
  }
  function onClick(e) {
    const b = e.target.closest('[data-x],[data-tab]'); if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return close();
    if (!logged()) { if (x === 'lock') render(); return; }
    touch();
    if (b.dataset.tab) { tab = b.dataset.tab; return render(); }
    if (x === 'lock') { sessUntil = 0; cheatsOff(); render(); return msg('Painel trancado.'); }
    if (x && x.indexOf('t-') === 0) return testClick(x, b);
    if (x === 'reset') {
      if (Date.now() > resetArm) { resetArm = Date.now() + 4000; b.textContent = 'Clique de novo para confirmar'; return; }
      resetArm = 0; mergeCfg(CFG, DEF, DEF, ''); api.cfgChanged(); persist(); render(); return msg('Todos os valores voltaram ao padrão (eventos mantidos).');
    }
    if (x === 'evadd') { const ev = evFromForm(); return ev ? addEvent(ev) : msg('Preencha os horários/dias do evento.', 'warn'); }
    if (x === 'pre1') return addEvent({ type: 'xp', mult: 2, start: Date.now(), end: Date.now() + 3600e3 });
    if (x === 'pre2') return addEvent({ type: 'rare', mult: 2, start: Date.now(), end: Date.now() + 1800e3 });
    if (x === 'pre3') return addEvent({ type: 'xp', mult: 2, name: 'XP em dobro de fim de semana', rec: { days: [0, 6], from: '18:00', to: '23:00' } });
    if (x === 'evstop') return stopEvent(b.dataset.id);
    if (x === 'evdel') { api.setEvents(api.getEvents().filter(e => e.id !== b.dataset.id)); persist(); render(); return msg('Evento excluído.'); }
    if (x === 'exp') { $('.adm-ta').value = JSON.stringify(exportObj(), null, 2); return msg('JSON gerado.'); }
    if (x === 'copy') { const ta = $('.adm-ta'); if (!ta.value) ta.value = JSON.stringify(exportObj(), null, 2); ta.select(); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => msg('Copiado para a área de transferência.'), () => { try { document.execCommand('copy'); msg('Copiado.'); } catch (er) { msg('Selecione o texto e copie com Ctrl+C.', 'warn'); } }); return; }
    if (x === 'dl') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(exportObj(), null, 2)], { type: 'application/json' })); a.download = 'aldoria-config-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return msg('Arquivo baixado.'); }
    if (x === 'imp') return importText($('.adm-ta').value);
  }
  // mantém a aba de eventos atualizada (tempo restante / início pelo horário programado)
  setInterval(() => { if (root && !root.classList.contains('adm-off') && logged() && tab === 'events' && !(document.activeElement && document.activeElement.closest('.adm-card'))) { const sc = $('.adm-main').scrollTop; render(); $('.adm-main').scrollTop = sc; } }, 15000);

  /* ---------- atalho: Ctrl+Shift+F10 ---------- */
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && (e.code === 'F10' || e.key === 'F10')) { e.preventDefault(); e.stopImmediatePropagation(); if (root && !root.classList.contains('adm-off')) close(); else { open(); if (Date.now() < S.lockUntil) lockTick(); } }
  }, true);
})();
