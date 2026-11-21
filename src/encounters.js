'use strict';
/* ===== Encontros aleatórios ("Gente do caminho"): NPCs temporários com pequenas histórias e mecânicas próprias =====
   Aparecem sozinhos perto do jogador, fora das vilas, com aviso e marca no mapa, e somem depois de um tempo (ou quando a história acaba).
   game.js entrega só a API necessária (X); o resultado de cada encontro vem de dialog(E) -> { say, opts: [{ k, t, dis, pri }] } e act(E, k). */
function registerEncounters(X) {
  const { G, NPCS, UI } = X, A = { list: [], next: 55, seq: 0 };
  const P = () => G.player, rnd = X.rnd, pick = a => a[Math.floor(rnd() * a.length) % a.length], fmt = X.fmt;
  const lvlAt = E => Math.max(1, X.zoneLvl(E.zone, E.x, E.z)), cap = (v, a, b) => Math.max(a, Math.min(b, v));
  const gold = E => Math.round((70 + lvlAt(E) * 28) * X.goldMul()), xp = (E, k) => Math.max(1, Math.round(X.xpNeed(lvlAt(E)) * (k || .5) * X.xpMul()));
  const bearing = (x, z) => { const p = P(), a = Math.atan2(x - p.x, -(z - p.z)) * 180 / Math.PI, N = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste']; return N[Math.round(((a + 360) % 360) / 45) % 8] + ', a ~' + Math.round(Math.hypot(x - p.x, z - p.z) / 10) * 10 + ' m'; };
  const give = it => { const p = P(); if (p.inv.length < 24) p.inv.push(it); else X.dropItem(p.x + 1, p.z, it); UI.log('Você recebeu: ' + X.itemName(it) + '.', 'loot'); X.sfx('pick'); };
  const gift = (E, boost, slot) => { const p = P(); give(X.makeItem(slot || pick(['w', 'a', 'h', 'l', 'b', 'c']), p.cls, cap(lvlAt(E), 1, X.MAXLV + 3), boost, p.tier)); };
  const pay = (E, g, x) => { const p = P(); p.gold += g; X.track('gold', g); X.gainXp(x, true); UI.log('Recompensa: +' + fmt(g) + ' ouro, +' + fmt(x) + ' XP.', 'quest'); X.sfx('coin'); };
  const done = (E, say) => { E.st = 'done'; E.say = say; E.ttl = Math.min(E.ttl, A.t + 14); X.track('enc', 1); X.fx.pillar(E.npc.x, E.npc.z, 1.2, [.6, 1, .8], 1.4); X.sfx('quest'); UI.toast('✔ ' + E.npc.n + ': história concluída'); };
  const hasHp = () => (P().pots.hp | 0) > 0;
  const kills = E => E.data.kills | 0;

  /* ---- os tipos ---- */
  const T = {
    hurt: {
      names: ['Joaquim, o Peregrino', 'Marta de Brumavale', 'Tobias, o Lenhador', 'Irene, a Herbalista'], style: 'story', col: [.5, .4, .3], role: 'Viajante ferido', weight: 3, ttl: 330,
      say: () => pick(['Fui atacado na estrada... minhas pernas não respondem. Você teria uma poção de vida?', 'Os lobos pegaram minha bolsa e a minha perna. Uma poção de vida me salvaria.', 'Ai... ai. Se eu beber qualquer poção de vida, aguento até a vila.']),
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; return { say: E.say0, opts: [{ k: 'give', t: '❤️ Dar uma Poção de Vida (' + (P().pots.hp | 0) + ')', dis: !hasHp(), pri: 1 }, { k: 'bye', t: 'Seguir viagem' }] }; },
      act(E, k) {
        if (k !== 'give' || !hasHp()) return; const p = P(); p.pots.hp--;
        pay(E, gold(E), xp(E, .5)); const r = rnd();
        if (r < .5) gift(E, .1);
        else { const q = SITES.filter(s => s.poi && !(G.rec.disc || []).includes(s.id)); if (q.length) { const s = pick(q); UI.log('📜 Ele rabisca um mapa: “Procure o ' + s.n + ', ' + bearing(s.x, s.z) + '.”', 'quest'); } else gift(E, .15); }
        done(E, 'Que os deuses o abençoem! Vou pelo caminho, devagar. Obrigado, herói.');
      },
    },
    merchant: {
      names: ['Bartolomeu da Estrada', 'Hana Caminheira', 'Tio Quirino', 'Dona Zefa dos Panos'], style: 'shop', col: [.75, .45, .2], role: 'Mercador errante', weight: 3, ttl: 420,
      say: () => pick(['Preços de estrada, mercadoria de verdade! Só enquanto eu estiver por aqui.', 'Passei por seis reinos para chegar aqui. Dê uma olhada, não custa nada!', 'Tenho coisas que o mercador da vila nunca viu.']),
      init(E) { const L = lvlAt(E); E.data.offers = [
        { id: 'pot', t: '🧪 Pacote: 5 Poções de Vida', price: 90 + L * 14, did: false },
        { id: 'mp', t: '💙 Pacote: 5 Poções de Mana', price: 100 + L * 14, did: false },
        { id: 'stone', t: '💎 Pedra misteriosa', price: 260 + L * 38, did: false },
        { id: 'chest', t: '📦 Baú lacrado (equipamento)', price: 420 + L * 70, did: false },
        { id: 'feed', t: '🥕 Ração premium ×10', price: 110, did: false }]; },
      dialog(E) { return { say: E.say0, opts: E.data.offers.map(o => ({ k: o.id, t: o.t + (o.did ? ' (vendido)' : ' · 💰 ' + fmt(o.price)), dis: o.did || P().gold < o.price })).concat([{ k: 'bye', t: 'Até mais' }]) }; },
      act(E, k) {
        const o = E.data.offers.find(x => x.id === k), p = P(); if (!o || o.did || p.gold < o.price) return; p.gold -= o.price; o.did = true; X.sfx('coin');
        if (k === 'pot') p.pots.hp += 5; else if (k === 'mp') p.pots.mp += 5; else if (k === 'feed') p.feed = (p.feed | 0) + 10;
        else if (k === 'stone') { const sid = pick(STONE_IDS); p.mats = p.mats || {}; p.mats[sid] = (p.mats[sid] || 0) + 1; UI.log('Pedra: ' + STONES[sid].n + '.', 'loot'); }
        else gift(E, .45);
        UI.log('Você comprou: ' + o.t.replace(/^\S+\s/, '') + '.', 'loot');
      },
    },
    caravan: {
      names: ['Mestre Caravaneiro Dunga', 'Caravaneira Solange'], style: 'story', col: [.55, .3, .15], role: 'Caravana em perigo', weight: 2, ttl: 360, minLvl: 6,
      say: () => 'Bandidos cercaram a minha carroça! Derrote-os e eu divido o que carrego com você!',
      spawn(E) { const n = 4 + (lvlAt(E) > 20 ? 2 : 0); E.data.left = n; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, m = X.spawnMob(E.zone, 'bandit', 'Bandido da Estrada', E.x + Math.cos(a) * 7, E.z + Math.sin(a) * 7, 1, E.id); if (m) E.mobs.push(m); } },
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; if (E.data.left > 0) return { say: 'Cuidado! Ainda restam ' + E.data.left + ' bandidos!', opts: [] }; return { say: 'Vocês os derrotaram! Pegue, a sua parte é justa.', opts: [{ k: 'claim', t: '🎁 Receber a recompensa', pri: 1 }] }; },
      onKill(E, m) { if (m.enc === E.id) { E.data.left = Math.max(0, E.data.left - 1); if (!E.data.left) UI.toast('Fale com ' + E.npc.n + ' para receber a recompensa.'); } },
      act(E, k) { if (k !== 'claim' || E.data.left > 0 || E.st === 'done') return; pay(E, Math.round(gold(E) * 2.5), xp(E, .9)); gift(E, .3); P().pots.mp += 3; done(E, 'Boa viagem, herói! Quem diria que um dia eu teria um guarda-costas tão bom.'); },
    },
    ghost: {
      names: ['Alma de Lorian', 'Espectro de Mira', 'A Sombra do Velho Dom'], style: 'quest', col: [.6, .85, .95], role: 'Alma penada', weight: 2, ttl: 400, minLvl: 10, night: true,
      say: () => 'Fui deixado para trás quando as criaturas tomaram o campo... Derrote oito delas por aqui e eu descanso em paz.',
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; if (!E.data.on) return { say: E.say0, opts: [{ k: 'ok', t: '🕯️ Prometer ajudar', pri: 1 }, { k: 'bye', t: 'Deixar em paz' }] }; if (kills(E) < 8) return { say: 'Falta pouco... (' + kills(E) + '/8 criaturas derrotadas por aqui)', opts: [] }; return { say: 'Sinto a paz chegando. Leve isto, é tudo o que me restou.', opts: [{ k: 'claim', t: '🎁 Aceitar o presente', pri: 1 }] }; },
      onKill(E, m) { if (E.data.on && Math.hypot(m.x - E.npc.x, m.z - E.npc.z) < 70 && !m.enc) { E.data.kills = kills(E) + 1; if (E.data.kills === 8) UI.toast('Volte à ' + E.npc.n + '.'); } },
      act(E, k) { if (k === 'ok') { E.data.on = 1; UI.log('A alma pede: derrote 8 criaturas perto dela.', 'quest'); } else if (k === 'claim' && kills(E) >= 8) { pay(E, gold(E) * 2, xp(E, .7)); gift(E, .55, 'c'); done(E, 'Obrigado... a névoa se vai. Que o seu caminho seja leve.'); } },
    },
    altar: {
      names: ['Altar do Destino', 'Pedra dos Desejos', 'Estátua Sussurrante'], style: 'quest', col: [.55, .55, .6], role: 'Altar misterioso', weight: 2, ttl: 380,
      say: () => 'Uma voz de pedra sussurra: “Ofereça ouro e o destino responderá. Ele pode ser generoso... ou cruel.”',
      cost(E) { return 60 + lvlAt(E) * 22; },
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; const c = T.altar.cost(E); return { say: E.say0, opts: [{ k: 'offer', t: '🪙 Oferecer ' + fmt(c) + ' de ouro', dis: P().gold < c, pri: 1 }, { k: 'bye', t: 'Deixar em paz' }] }; },
      act(E, k) {
        if (k !== 'offer') return; const p = P(), c = T.altar.cost(E); if (p.gold < c) return; p.gold -= c; const r = rnd(); X.sfx('level');
        if (r < .36) { p.buffs.atk = { v: .2, t: 600 }; p.buffs.crit = { v: .06, t: 600 }; X.recalc(); done(E, 'BÊNÇÃO! Uma luz dourada o envolve: ataque e crítico maiores por 10 minutos.'); }
        else if (r < .56) done(E, 'As pedras ficam em silêncio. O destino não tinha nada a dizer hoje.');
        else if (r < .78) { p.gold += c * 3; done(E, 'FORTUNA! As moedas voltam em dobro... e mais uma: você ganhou ' + fmt(c * 2) + ' de ouro líquido.'); }
        else if (r < .92) { gift(E, .5); done(E, 'Uma fenda se abre na pedra e cospe um presente. O destino sorriu.'); }
        else { p.hp = Math.max(1, Math.round(p.hp * .65)); p.buffs.def = { v: -.15, t: 120 }; X.recalc(); X.shake(.5); done(E, 'MALDIÇÃO! Um frio corta a sua alma: vida reduzida e defesa menor por 2 minutos. O destino tem humor.'); }
      },
    },
    escort: {
      names: ['Peregrino Anselmo', 'Lia, a Aprendiz Perdida', 'Gaspar, o Cartógrafo'], style: 'story', col: [.4, .5, .6], role: 'Viajante perdido', weight: 2, ttl: 420, minLvl: 4,
      say: () => pick(['Estou perdido e os caminhos estão cheios de feras. Você pode me levar até a vila mais próxima?', 'Meu mapa voou com o vento! Me escolte até um lugar seguro, por favor.']),
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; if (!E.data.on) return { say: E.say0, opts: [{ k: 'ok', t: '🧭 Escoltar até uma vila', pri: 1 }, { k: 'bye', t: 'Desculpe, estou ocupado' }] }; return { say: 'Estou logo atrás de você. Vá até uma vila ou posto, onde é seguro!', opts: [] }; },
      act(E, k) { if (k === 'ok') { E.data.on = 1; E.data.far = 0; UI.log('Escolte ' + E.npc.n + ' até uma vila ou posto. Ele segue você.', 'quest'); } },
      tick(E, dt) {
        if (!E.data.on || E.st === 'done') return; const p = P(), n = E.npc, d = Math.hypot(p.x - n.x, p.z - n.z);
        if (d > 3 && d < 70) { const sp = Math.min(d - 2.5, (G.stats.spd || 5.4) * .95 * dt), ux = (p.x - n.x) / d, uz = (p.z - n.z) / d; const nx = n.x + ux * sp, nz = n.z + uz * sp; if (X.isLand(nx, nz)) { n.x = nx; n.z = nz; E.x = nx; E.z = nz; } }
        E.data.far = d > 70 ? (E.data.far || 0) + dt : 0; if (E.data.far > 50) { E.st = 'gone'; UI.log(n.n + ' se perdeu de você.', 'sys'); }
        if (X.inSafe(n.x, n.z) && d < 14) { pay(E, Math.round(gold(E) * 1.6), xp(E, .7)); gift(E, .2); done(E, 'Chegamos! Estou a salvo. Nunca vou esquecer o que fez por mim.'); }
      },
    },
    duel: {
      names: ['Sir Aldemar, o Errante', 'Dama Brisa de Ferro', 'Cavaleiro Valdo'], style: 'story', col: [.3, .3, .38], role: 'Cavaleiro errante', weight: 2, ttl: 360, minLvl: 10,
      say: () => 'Viajo atrás de um adversário digno. Aceita um duelo de honra? O vencedor leva a glória... e o perdedor, a lição.',
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; if (!E.data.on) return { say: E.say0, opts: [{ k: 'ok', t: '⚔️ Aceitar o duelo', pri: 1 }, { k: 'bye', t: 'Recusar' }] }; if (E.data.left > 0) return { say: 'Mostre o que sabe fazer!', opts: [] }; return { say: 'Impressionante... a honra é sua. Receba o prêmio do vencedor.', opts: [{ k: 'claim', t: '🏆 Receber o prêmio', pri: 1 }] }; },
      onKill(E, m) { if (m.enc === E.id) { E.data.left = 0; UI.toast('Duelo vencido! Fale com o cavaleiro.'); } },
      act(E, k) {
        if (k === 'ok' && !E.data.on) { E.data.on = 1; E.data.left = 1; const m = X.spawnMob(E.zone, 'orcwar', 'Cavaleiro Negro', E.x + 6, E.z, 3, E.id, true); if (m) E.mobs.push(m); X.shake(.4); X.sfx('boom'); UI.bigToast && UI.bigToast('⚔ DUELO!', 'Derrote o Cavaleiro Negro'); }
        else if (k === 'claim' && E.data.left <= 0) { pay(E, Math.round(gold(E) * 2.2), xp(E, 1)); gift(E, .55); done(E, 'Você luta com honra. Que as lendas lembrem o seu nome.'); }
      },
    },
    treasure: {
      names: ['Capitã Ruiva Marisa', 'Explorador Caio Mapa-Rasgado', 'Velho Pirata Barnabé'], style: 'weapon', col: [.7, .25, .2], role: 'Caçador de tesouros', weight: 2, ttl: 420, minLvl: 5,
      say: () => 'Tenho um mapa de tesouro que não consigo seguir (as minhas pernas já eram!). Quer ficar com ele? O X marca o lugar, a uns cem passos daqui.',
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; if (!E.data.on) return { say: E.say0, opts: [{ k: 'ok', t: '🗺️ Pegar o mapa', pri: 1 }, { k: 'bye', t: 'Não, obrigado' }] }; return { say: 'O X está ' + bearing(E.data.spot.x, E.data.spot.z) + '. Boa caçada!', opts: [] }; },
      act(E, k) { if (k !== 'ok' || E.data.on) return; for (let i = 0; i < 40; i++) { const a = rnd() * Math.PI * 2, d = 70 + rnd() * 60, x = E.x + Math.cos(a) * d, z = E.z + Math.sin(a) * d; if (X.freeSpot(x, z)) { E.data.on = 1; E.data.spot = { x, z }; G.encSpot = { x, z, n: 'Tesouro' }; UI.log('🗺️ O tesouro está ' + bearing(x, z) + '. Procure o brilho no chão.', 'quest'); return; } } UI.log('O mapa está ilegível... (sem terreno livre por perto)', 'sys'); },
      tick(E, dt) {
        if (!E.data.on || E.st === 'done') return; const s = E.data.spot, p = P(); E.data.fx = (E.data.fx || 0) - dt; if (E.data.fx <= 0) { E.data.fx = 1.6; X.fx.pillar(s.x, s.z, 1.1, [1, .85, .3], 1.7); }
        if (Math.hypot(p.x - s.x, p.z - s.z) < 3) { G.encSpot = null; X.fx.burst(s.x, 1, s.z, [1, .85, .3], 36, 5, .22); pay(E, Math.round(gold(E) * 2.6), xp(E, .8)); gift(E, .4); if (rnd() < .5) gift(E, .3, 'c'); if (rnd() < .4) for (let i = 0; i < 2; i++) { const m = X.spawnMob(E.zone, pick(['bandit', 'skel', 'goblin'].filter(q => X.hasMob(E.zone, q)).concat([X.firstMob(E.zone)])), '', s.x + (i ? 4 : -4), s.z, 0, E.id); if (m) E.mobs.push(m); } done(E, 'O baú era mesmo real. Você achou o tesouro!'); E.ttl = A.t + 6; }
      },
    },
    witch: {
      names: ['Bruxa Cacilda', 'Vovó Cogumelo', 'Mãe Lodo'], style: 'quest', col: [.35, .6, .3], role: 'Bruxa do caminho', weight: 2, ttl: 380,
      say: () => pick(['Heh heh! Beba a minha poção, querido. Prometo que não é veneno... na maioria das vezes.', 'Fiz esta mistura com cogumelo, pena de corvo e um espirro. Quer provar?']),
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; return { say: E.say0, opts: [{ k: 'drink', t: '🧪 Beber a poção misteriosa', pri: 1 }, { k: 'bye', t: 'Educadamente, não' }] }; },
      act(E, k) {
        if (k !== 'drink') return; const p = P(), r = rnd(); X.sfx('potion');
        if (r < .2) { p.buffs.spd = { v: .35, t: 90 }; X.recalc(); done(E, 'Gosto de framboesa! Você ficou muito mais rápido por 90 segundos.'); }
        else if (r < .4) { p.buffs.atk = { v: .25, t: 150 }; X.recalc(); done(E, 'Queima na garganta... mas os seus golpes ficaram 25% mais fortes por 2 minutos e meio!'); }
        else if (r < .55) { p.shield = { hp: Math.round(p.maxHp * .35), t: 90 }; done(E, 'Uma bolha brilhante cobre você: escudo por 90 segundos.'); }
        else if (r < .7) { p.hp = p.maxHp; p.mp = p.maxMp; done(E, 'Vida e mana cheias! Que gosto de sopa de cebola...'); }
        else if (r < .85) { p.pots.hp += 3; p.pots.mp += 3; done(E, 'A poção se multiplicou na sua bolsa: 3 poções de vida e 3 de mana. A bruxa pisca.'); }
        else { p.buffs.def = { v: -.2, t: 60 }; X.recalc(); done(E, 'Que gosto HORRÍVEL! A sua defesa caiu por 1 minuto. A bruxa gargalha até chorar.'); }
      },
    },
    smith: {
      names: ['Ferreiro Brasa', 'Forjadora Ingrid', 'Mestre Bigorna Torto'], style: 'smith', col: [.45, .3, .25], role: 'Ferreiro itinerante', weight: 2, ttl: 400,
      say: () => 'Carrego a forja nas costas! Escolha uma peça e eu dou uma martelada de graça. Sem garantias, hein?',
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; const p = P(), o = ['w', 'a', 'h', 'l', 'b'].filter(s => p.eq[s] && (p.eq[s].plus | 0) < 7).map(s => ({ k: 'hit_' + s, t: '🔨 ' + SLOTS[s] + ': ' + X.itemName(p.eq[s]), pri: s === 'w' })); return { say: E.say0, opts: o.length ? o.concat([{ k: 'bye', t: 'Mudei de ideia' }]) : [{ k: 'bye', t: 'Você não tem peça para refinar (até +6)' }] }; },
      act(E, k) {
        if (!/^hit_/.test(k)) return; const p = P(), it = p.eq[k.slice(4)]; if (!it || E.st === 'done') return; X.sfx('hit');
        if (rnd() < .75) { it.plus = (it.plus | 0) + 1; X.recalc(); X.fx.burst(p.x, 1.4, p.z, [1, .8, .3], 20, 4, .2); done(E, 'CLANG! ' + X.itemName(it) + ' agora está +' + it.plus + '. Trabalho de mestre!'); }
        else done(E, 'Ih, a martelada deslizou... nada mudou. Mas não custou nada, né?');
      },
    },
    bard: {
      names: ['Menestrel Tadeu', 'Bardo Flor-de-Lis', 'Cantora Valéria'], style: 'shop', col: [.7, .3, .55], role: 'Menestrel viajante', weight: 2, ttl: 380,
      say: () => pick(['♪ La-la-lá! Quer ouvir uma canção sobre o herói que derrotou o Rei dos Bandidos? Ele se parecia com você!', '♪ Cantar é a minha vida! Sente-se um instante, herói, e deixe a música curar a estrada.']),
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; return { say: E.say0, opts: [{ k: 'song', t: '🎶 Ouvir uma canção', pri: 1 }, { k: 'tip', t: '🪙 Dar uma gorjeta de ' + fmt(40 + lvlAt(E) * 8) + ' (canção especial)', dis: P().gold < 40 + lvlAt(E) * 8 }, { k: 'bye', t: 'Já ouvi demais' }] }; },
      act(E, k) {
        const p = P(); if (k === 'song') { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .3); p.buffs.aspd = { v: .1, t: 240 }; X.recalc(); done(E, '♪ A música alivia o corpo: 30% da vida recuperada e ataque mais rápido por 4 minutos. ♪'); }
        else if (k === 'tip') { const c = 40 + lvlAt(E) * 8; if (p.gold < c) return; p.gold -= c; p.hp = p.maxHp; p.mp = p.maxMp; p.buffs.spd = { v: .15, t: 300 }; p.buffs.crit = { v: .05, t: 300 }; X.recalc(); done(E, '♪ Uma balada só para você! Vida e mana cheias, mais velocidade e crítico por 5 minutos. ♪'); }
      },
    },
  };

  /* ---- mais sete tipos (rodada 2): jogo de cascas, enigma, animal perdido, monge, baú traiçoeiro, arena em ondas, mensageiro ---- */
  Object.assign(T, {
    gambler: {
      names: ['Zé Três-Cascas', 'Madame Dado-Torto', 'Tavares, o Trapaceiro'], style: 'shop', col: [.6, .15, .3], role: 'Jogador de cascas', weight: 2, ttl: 380,
      bet: E => 40 + lvlAt(E) * 10,
      say: () => pick(['Psiu! Qual casca esconde a pedrinha? Acertou, ganha o triplo! Errou... bem, a casa agradece!', 'Três cascas, uma pedrinha, olhos de águia. Você tem?']),
      dialog(E) { const c = T.gambler.bet(E), n = E.data.n | 0; if (E.st === 'done') return { say: E.say, opts: [] };
        return { say: E.data.last || E.say0, opts: [1, 2, 3].map(i => ({ k: 'cup' + i, t: '🥥 Casca ' + i + ' · aposta de ' + fmt(c) + ' (' + (3 - n) + ' rodadas)', dis: P().gold < c, pri: i === 2 })).concat([{ k: 'bye', t: 'Chega de jogo' }]) }; },
      act(E, k) {
        if (!/^cup/.test(k) || E.st === 'done') return; const p = P(), c = T.gambler.bet(E); if (p.gold < c) return; p.gold -= c; E.data.n = (E.data.n | 0) + 1; X.sfx('coin');
        if (rnd() < .36) { p.gold += c * 3; E.data.last = 'ACERTOU! A pedrinha estava aí. Você leva ' + fmt(c * 3) + ' de ouro. Ninguém é perfeito... ainda.'; X.sfx('quest'); }
        else E.data.last = 'Errou! A pedrinha estava embaixo de outra casca. Quer tentar de novo?';
        if (E.data.n >= 3) done(E, E.data.last + ' Já deu por hoje! Volte outro dia.');
      },
    },
    riddle: {
      names: ['Esfinge Miúda', 'Sábio Corujão', 'Velha Charada'], style: 'quest', col: [.8, .7, .4], role: 'Enigma do caminho', weight: 2, ttl: 420,
      R: [{ q: 'Tenho cidades, mas não tenho casas. Tenho rios, mas não tenho água. O que sou?', a: ['Um mapa', 'Uma sombra', 'Um sonho'] },
        { q: 'Quanto mais você tira de mim, maior eu fico. O que sou?', a: ['Um buraco', 'Um saco', 'Uma dívida'] },
        { q: 'Corro sem ter pernas e canto sem ter boca. O que sou?', a: ['Um rio', 'Uma pedra', 'Uma vela'] },
        { q: 'Sempre chego amanhã, mas nunca chego hoje. O que sou?', a: ['O amanhã', 'O ontem', 'O vento'] }],
      say: () => 'Pare, viajante! Ninguém passa sem responder a um enigma. Acerte e a estrada o recompensa. Erre, e eu rio de você.',
      init(E) { const r = pick(T.riddle.R), a = r.a.slice(), ok = r.a[0]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } E.data.q = r.q; E.data.a = a; E.data.ok = ok; },
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; return { say: '“' + E.data.q + '”', opts: E.data.a.map((t, i) => ({ k: 'a' + i, t: (i + 1) + ') ' + t, pri: 0 })).concat([{ k: 'bye', t: 'Não sei responder' }]) }; },
      act(E, k) { if (!/^a\d/.test(k) || E.st === 'done') return; const t = E.data.a[+k.slice(1)];
        if (t === E.data.ok) { pay(E, Math.round(gold(E) * 1.4), xp(E, .6)); gift(E, .3); done(E, 'CERTO! “' + t + '”. Você é mais esperto que parece. Leve isto.'); }
        else { pay(E, 0, xp(E, .1)); done(E, 'Errou! A resposta era “' + E.data.ok + '”. Hi hi hi... tome um tiquinho de experiência pelo esforço.'); } },
    },
    lostpet: {
      names: ['Pipo, o Menino', 'Pastora Neli', 'Velho Tomé'], style: 'story', col: [.5, .6, .35], role: 'Animal perdido', weight: 2, ttl: 440, minLvl: 3,
      say: () => pick(['Meu cãozinho fugiu na tempestade! Ele atende por Bolota. Pode procurá-lo? Eu marco o lugar no seu mapa.', 'Perdi a minha ovelhinha de manhã... Se você a encontrar, traga ela de volta?']),
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; if (!E.data.on) return { say: E.say0, opts: [{ k: 'ok', t: '🐕 Procurar o bichinho', pri: 1 }, { k: 'bye', t: 'Não posso agora' }] };
        if (!E.data.found) return { say: 'Ele deve estar ' + bearing(E.data.spot.x, E.data.spot.z) + '. Veja o mapa!', opts: [] }; return { say: 'Você o achou! Ele está bem? Ai, obrigado, obrigado!', opts: [{ k: 'claim', t: '🤝 Entregar o bichinho', pri: 1 }] }; },
      act(E, k) {
        if (k === 'ok' && !E.data.on) { for (let i = 0; i < 40; i++) { const a = rnd() * Math.PI * 2, d = 55 + rnd() * 50, x = E.x + Math.cos(a) * d, z = E.z + Math.sin(a) * d; if (X.freeSpot(x, z)) { E.data.on = 1; E.data.spot = { x, z }; G.encSpot = { x, z, n: 'Bichinho' }; UI.log('Procure o bichinho de ' + E.npc.n + ': ' + bearing(x, z) + '. Está marcado no mapa.', 'quest'); return; } } }
        else if (k === 'claim' && E.data.found) { pay(E, Math.round(gold(E) * 1.7), xp(E, .7)); gift(E, .25); P().pots.hp += 2; done(E, 'Ele lambeu a minha cara! Vocês são os maiores heróis do mundo. Leve duas poções de vida de presente.'); }
      },
      tick(E, dt) {
        if (!E.data.on || E.data.found || E.st === 'done') return; const s = E.data.spot, p = P(); E.data.fx = (E.data.fx || 0) - dt; if (E.data.fx <= 0) { E.data.fx = 2; X.fx.pillar(s.x, s.z, .8, [.9, .8, .5], 1.4); }
        if (Math.hypot(p.x - s.x, p.z - s.z) < 3.5) { E.data.found = 1; G.encSpot = null; X.sfx('pick'); X.fx.burst(s.x, 1, s.z, [1, .9, .5], 22, 4, .2); UI.toast('🐕 Você achou o bichinho! Leve-o de volta.'); E.data.fx = 99; E.ttl = Math.max(E.ttl, A.t + 160); }
      },
    },
    monk: {
      names: ['Monge Ventania', 'Irmã Serena', 'Ancião Sem-Pressa'], style: 'quest', col: [.85, .55, .2], role: 'Monge meditante', weight: 2, ttl: 380,
      say: () => pick(['A pressa é a vassoura do tempo... Sente-se um instante. A estrada espera.', 'Respire fundo, viajante. Quem luta sem descansar, perde duas vezes.']),
      cost: E => 80 + lvlAt(E) * 18,
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; const c = T.monk.cost(E); return { say: E.say0, opts: [{ k: 'rest', t: '🧘 Meditar um pouco (grátis)', pri: 1 }, { k: 'donate', t: '🪙 Doar ' + fmt(c) + ' ao templo (bênção maior)', dis: P().gold < c }, { k: 'bye', t: 'Seguir viagem' }] }; },
      act(E, k) { const p = P();
        if (k === 'rest') { p.hp = p.maxHp; p.mp = p.maxMp; X.fx.burst(p.x, 1.2, p.z, [.6, 1, .8], 24, 3, .2); X.sfx('potion'); done(E, 'Vida e mana restauradas. Leve a calma com você.'); }
        else if (k === 'donate') { const c = T.monk.cost(E); if (p.gold < c) return; p.gold -= c; p.hp = p.maxHp; p.mp = p.maxMp; p.buffs.def = { v: .2, t: 600 }; p.buffs.crit = { v: .04, t: 600 }; X.recalc(); X.sfx('level'); done(E, 'Que a montanha o proteja! Defesa e crítico maiores por 10 minutos, e corpo e mente restaurados.'); } },
    },
    mimic: {
      names: ['Baú Esquecido', 'Arca Enferrujada', 'Cofre Sem Dono'], style: 'weapon', col: [.45, .3, .15], role: 'Baú abandonado', weight: 2, ttl: 400, minLvl: 5,
      say: () => pick(['Um baú velho, a fechadura quebrada... parece ter alguma coisa dentro. Será seguro abrir?', 'Ninguém por perto. Só um baú, e uma língua comprida de couro saindo da tampa. Hm?']),
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; if (E.data.left > 0) return { say: 'ELE TEM DENTES! Derrote-o!', opts: [] }; if (E.data.won) return { say: 'O que sobrou da fera cuspiu o tesouro de verdade!', opts: [{ k: 'claim', t: '💰 Pegar o tesouro', pri: 1 }] };
        return { say: E.say0, opts: [{ k: 'open', t: '📦 Abrir o baú', pri: 1 }, { k: 'bye', t: 'Deixar quieto' }] }; },
      act(E, k) {
        if (k === 'open' && !E.data.on) { E.data.on = 1;
          if (rnd() < .5) { pay(E, Math.round(gold(E) * 1.5), xp(E, .4)); gift(E, .4); done(E, 'Estava limpo! Moedas e um item velho, mas bom.'); }
          else { E.data.left = 1; const m = X.spawnMob(E.zone, X.firstMob(E.zone), 'Baú Traiçoeiro', E.x + 2, E.z, 2, E.id, true); if (m) E.mobs.push(m); X.shake(.5); X.sfx('boom'); UI.bigToast && UI.bigToast('📦 ERA UM MÍMICO!', 'Derrote a criatura do baú.'); } }
        else if (k === 'claim' && E.data.won) { pay(E, Math.round(gold(E) * 2.6), xp(E, .9)); gift(E, .6); done(E, 'O tesouro era de verdade. Bom trabalho!'); }
      },
      onKill(E, m) { if (m.enc === E.id) { E.data.left = 0; E.data.won = 1; UI.toast('Mímico derrotado! Abra o baú outra vez.'); } },
    },
    arena: {
      names: ['Mestre de Armas Torvald', 'Campeã Brunhilde', 'Capitão Rochedo'], style: 'story', col: [.5, .2, .2], role: 'Arena do desafiante', weight: 1, ttl: 520, minLvl: 8,
      say: () => 'Três ondas, nenhuma desistência! Vença todas e eu pago como se paga a um campeão. Quer o desafio?',
      wave(E) { const w = E.data.wave, n = 2 + w, last = w === 3; E.data.left = n;
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + w, m = X.spawnMob(E.zone, X.firstMob(E.zone), null, E.x + Math.cos(a) * 8, E.z + Math.sin(a) * 8, w - 1, E.id, last && i === 0); if (m) E.mobs.push(m); }
        X.shake(.35); X.sfx('boom'); UI.bigToast && UI.bigToast('⚔ ONDA ' + w + ' / 3', last ? 'Um campeão se aproxima!' : 'Prepare-se!'); },
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; if (!E.data.on) return { say: E.say0, opts: [{ k: 'ok', t: '🏟️ Entrar na arena', pri: 1 }, { k: 'bye', t: 'Prefiro assistir' }] };
        if (E.data.wave <= 3 && E.data.left > 0) return { say: 'Onda ' + E.data.wave + ' de 3: faltam ' + E.data.left + '! Não pare!', opts: [] }; return { say: 'VITÓRIA! Os três grupos caíram. Reivindique o prêmio!', opts: [{ k: 'claim', t: '🏆 Receber o prêmio', pri: 1 }] }; },
      act(E, k) { if (k === 'ok' && !E.data.on) { E.data.on = 1; E.data.wave = 1; T.arena.wave(E); } else if (k === 'claim' && E.data.wave > 3) { pay(E, Math.round(gold(E) * 3.2), xp(E, 1.2)); gift(E, .6); gift(E, .3, 'c'); done(E, 'Você é um campeão de verdade! Que todos saibam o seu nome.'); } },
      onKill(E, m) { if (m.enc !== E.id || !E.data.on || E.data.wave > 3) return; E.data.left = Math.max(0, E.data.left - 1);
        if (!E.data.left) { E.data.wave++; if (E.data.wave > 3) { UI.toast('🏆 Arena vencida! Fale com ' + E.npc.n + '.'); E.ttl = Math.max(E.ttl, A.t + 120); } else T.arena.wave(E); } },
    },
    courier: {
      names: ['Ligeirinho, o Mensageiro', 'Correio Real Pedro', 'Dona Nina dos Pombos'], style: 'shop', col: [.3, .5, .7], role: 'Mensageiro', weight: 2, ttl: 400, minLvl: 3,
      say: () => 'Estou com uma carta urgente e o meu cavalo coxeou! Você leva até a vila mais próxima? Eu pago na chegada.',
      dest() { const p = P(), V = VILLAGES.filter(v => v.theme !== 'camp').map(v => ({ v, d: Math.hypot(v.cx - p.x, v.cz - p.z) })).sort((a, b) => a.d - b.d), far = V.find(q => q.d > 90); return (far || V[0]).v; },
      dialog(E) { if (E.st === 'done') return { say: E.say, opts: [] }; const v = T.courier.dest(); return { say: E.say0, opts: [{ k: 'ok', t: '✉️ Levar a carta até ' + v.n, pri: 1 }, { k: 'bye', t: 'Estou sem tempo' }] }; },
      act(E, k) { if (k !== 'ok' || E.data.on) return; const v = T.courier.dest(); E.data.on = 1; E.data.dest = v.id; E.data.spot = { x: v.cx, z: v.cz }; G.encSpot = { x: v.cx, z: v.cz, n: 'Entrega' };
        const i = NPCS.indexOf(E.npc); if (i >= 0) NPCS.splice(i, 1); E.ttl = A.t + 900; UI.log('✉️ Leve a carta até ' + v.n + ' (' + bearing(v.cx, v.cz) + '). Está marcado no mapa.', 'quest'); },
      tick(E, dt) {
        if (!E.data.on || E.st === 'done') return; const p = P(); E.npc.x = E.x = p.x; E.npc.z = E.z = p.z; const v = VILLAGES.find(q => q.id === E.data.dest);
        if (v && X.inSafe(p.x, p.z) && Math.hypot(p.x - v.cx, p.z - v.cz) < (v.hs || 12)) { G.encSpot = null; pay(E, Math.round(gold(E) * 2), xp(E, .8)); gift(E, .3); done(E, 'Carta entregue em ' + v.n + '! O destinatário agradeceu de coração.'); }
      },
    },
  });

  /* ---- ciclo de vida ---- */
  const find = id => A.list.find(e => e.npc.id === id);
  function remove(E) {
    const i = NPCS.indexOf(E.npc); if (i >= 0) NPCS.splice(i, 1);
    for (const m of E.mobs) { const j = G.mobs.indexOf(m); if (j >= 0) G.mobs.splice(j, 1); }
    if (E.data.spot && G.encSpot && G.encSpot.x === E.data.spot.x) G.encSpot = null;
    A.list.splice(A.list.indexOf(E), 1);
  }
  function spawn(type) {
    const p = P(), def = T[type]; if (!def || !p) return null;
    for (let i = 0; i < 60; i++) {
      const a = rnd() * Math.PI * 2, d = 38 + rnd() * 40, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (!X.freeSpot(x, z) || NPCS.some(n => Math.hypot(n.x - x, n.z - z) < 12)) continue;
      const zone = X.zoneAt(x, z).id, E = { id: 'enc' + (++A.seq), type, st: 'open', zone, x, z, born: A.t, ttl: A.t + (def.ttl || 360), data: {}, mobs: [], say0: def.say() };
      E.npc = { id: 'enc_' + type, kind: 'enc', n: pick(def.names), role: def.role, x, z, col: def.col, style: def.style, enc: type };
      if (find(E.npc.id)) return null; E.say = E.say0;
      NPCS.push(E.npc); A.list.push(E); if (def.init) def.init(E); if (def.spawn) def.spawn(E);
      UI.toast('❗ ' + E.npc.n + ' (' + def.role + ') — ' + bearing(x, z)); UI.log('❗ Alguém precisa de você: ' + E.npc.n + ', ' + def.role.toLowerCase() + ', ' + bearing(x, z) + '.', 'quest'); X.sfx('enc');
      return E;
    }
    return null;
  }
  const SPOT_T = { treasure: 1, lostpet: 1, courier: 1 };
  function choose() {
    const p = P(), night = G.tod < 5.5 || G.tod > 19.5, ok = Object.keys(T).filter(k => (!T[k].minLvl || X.elv() >= T[k].minLvl) && (!T[k].night || night) && !A.list.some(e => e.type === k) && !(G.encSpot && SPOT_T[k]));
    if (!ok.length) return null; let w = ok.reduce((s, k) => s + (T[k].weight || 1), 0), r = rnd() * w; for (const k of ok) { r -= T[k].weight || 1; if (r <= 0) return k; } return ok[0];
  }
  function tick(dt) {
    A.t = (A.t || 0) + dt; const p = P(); if (!p || G.state !== 'play' || G.dead) return;
    for (const E of A.list.slice()) {
      const d = Math.hypot(p.x - E.npc.x, p.z - E.npc.z);
      if (T[E.type].tick) T[E.type].tick(E, dt);
      if (E.st === 'gone' || A.t > E.ttl || d > 260) { if (d < 120 && E.st !== 'done' && E.st !== 'gone') UI.log(E.npc.n + ' seguiu viagem.', 'sys'); remove(E); }
    }
    A.next -= dt;
    if (A.next <= 0) { A.next = 110 + rnd() * 110; if (A.list.length < 2 && !X.inSafe(p.x, p.z)) { const k = choose(); if (k) spawn(k); } }
  }
  const dialog = id => { const E = find(id); if (!E) return null; const d = T[E.type].dialog(E); return d; };
  const act = (id, k) => { const E = find(id); if (!E) return; if (k !== 'bye') T[E.type].act(E, k); else if (E.type !== 'merchant' && E.type !== 'smith' && E.type !== 'bard') { /* recusou: continua por perto até o tempo acabar */ } UI.refreshPanels(); if (k === 'bye') UI.closeAll(); };
  const onKill = m => { for (const E of A.list) if (T[E.type].onKill) T[E.type].onKill(E, m); };
  return { tick, dialog, act, onKill, spawn, types: () => Object.keys(T), list: () => A.list.map(e => ({ id: e.npc.id, type: e.type, st: e.st, n: e.npc.n, x: Math.round(e.x), z: Math.round(e.z) })), clear() { for (const E of A.list.slice()) remove(E); } };
}
