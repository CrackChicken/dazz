/* Kritzelkrieg – Beute: Wundertüte, Kaugummiautomat, Glücksrad, Ausrüstung, Garderobe. */
(function (root) {
  'use strict';
  const E = root.KK, C = root.KK_CONTENT, D = root.KK_DATA, FMT = root.KK_FMT, ART = root.KK_ART;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const snd = (n, a) => root.KK_AUDIO && root.KK_AUDIO.play(n, a);
  const fx = () => root.KK_FX;
  const { fmt } = FMT;

  const SLOT_ICON = {
    waffe: '<path d="M4 20l3-1 11-11-2-2L5 17z"/><path d="M14 6l2-2 4 4-2 2"/>',
    banner: '<path d="M6 21V3"/><path d="M6 4h11l-3 4 3 4H6"/>',
    talisman: '<circle cx="12" cy="14" r="6"/><path d="M9 4h6l-3 4z"/><path d="M12 11v6M9.5 14h5"/>',
    ranzen: '<rect x="5" y="7" width="14" height="13" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/><path d="M5 13h14"/>'
  };
  const rc = r => r.color === 'pencil' ? 'var(--pencil)' : `var(--m-${r.color})`;
  const RAR = C.rarities;
  const IT = Object.fromEntries(C.items.map(i => [i.id, i]));
  const FN = Object.fromEntries(D.fighters.map(f => [f.id, f]));
  let S, H, pal, sub = 'pull';
  let pullState = null;

  /* ---------- Hilfen ---------- */
  function itemText(it, lvl) {
    const st = E.itemStatId(it), v = E.itemValue(it, Math.max(1, lvl));
    if (C.special[st]) {
      const sp = C.special[st];
      const num = sp.unit === '×' ? v.toFixed(2).replace(/\.?0+$/, '').replace('.', ',') : (Math.round(v * 10) / 10).toString().replace('.', ',');
      return `+${num}${sp.unit === '%' ? ' %' : sp.unit === 's' ? ' s' : '×'} ${sp.label}`;
    }
    const slot = C.slots.find(x => x.id === it.slot);
    return `+${Math.round(v)} % ${slot.label}`;
  }
  function skinName(target, style) {
    if (target === 'hero') return 'Held: ' + (C.heroSkins.find(h => h.id === style) || {}).name;
    return (FN[target] ? FN[target].name : target) + ': ' + (C.fighterStyles.find(f => f.id === style) || {}).name;
  }
  function icon(res, size) {
    if (res.kind === 'skin') {
      const c = el('canvas', 'card-por'); c.style.width = size + 'px'; c.style.height = size + 'px';
      requestAnimationFrame(() => ART.portrait(c, res.target === 'hero' ? 'hero' : FN[res.target].look, pal, { ink: res.target === 'hero', color: res.target === 'hero' ? null : pal.m[FN[res.target].color], skin: { target: res.target, style: res.style, base: res.target === 'hero' ? null : FN[res.target].color } }));
      return c;
    }
    const it = IT[res.id];
    const s = el('span', 'card-ico', `<svg viewBox="0 0 24 24" aria-hidden="true">${SLOT_ICON[it.slot]}</svg>`);
    s.style.width = size + 'px'; s.style.height = size + 'px';
    return s;
  }

  /* ---------- Ziehungs-Animation ---------- */
  function startPull(kind, n) {
    const s = S();
    const res = kind === 'gum' ? E.pullGum(s) : E.pullPack(s, n);
    if (!res) { root.KK_UI.toast(kind === 'gum' ? 'Nicht genug Gold.' : 'Nicht genug Sternchen.'); return; }
    H.drain(); H.save();
    showPull(kind, n, res);
  }
  function showPull(kind, n, res) {
    const best = Math.max(...res.map(r => r.rank));
    pullState = { kind, n, res, best, opened: false, flipped: 0 };
    const ov = $('pull');
    ov.hidden = false;
    ov.className = 'pull' + (kind === 'gum' ? ' gum' : '');
    const pack = $('packBig');
    pack.hidden = false; pack.className = 'pack-big r0';
    pack.querySelector('span').textContent = kind === 'gum' ? 'KAUGUMMI' : n === 10 ? '10er WUNDERTÜTE' : 'WUNDERTÜTE';
    $('cards').innerHTML = '';
    $('pullHint').textContent = 'Tippe auf die Tüte!';
    $('pullHint').hidden = false;
    $('pullActions').hidden = true;
  }
  function openPack() {
    if (!pullState || pullState.opened) return;
    pullState.opened = true;
    const pack = $('packBig');
    $('pullHint').hidden = true;
    pack.classList.add('shake');
    const steps = pullState.best;
    let i = 0;
    snd('charge', 0);
    const iv = setInterval(() => {
      i++;
      if (i <= steps) { pack.className = 'pack-big shake r' + i; snd('charge', i); }
      else {
        clearInterval(iv);
        pack.classList.add('burst');
        snd('burst', pullState.best);
        const r = pack.getBoundingClientRect();
        if (fx()) { fx().sparkles(r.left + r.width / 2, r.top + r.height / 2, 20 + pullState.best * 8, pal.m[RAR[pullState.best].color] || pal.gold); if (pullState.best >= 3) fx().confetti(r.left + r.width / 2, r.top + r.height / 2, 30 + pullState.best * 20); }
        setTimeout(() => { pack.hidden = true; layCards(); }, 380);
      }
    }, 330);
  }
  function layCards() {
    const box = $('cards');
    box.className = 'cards n' + pullState.res.length;
    pullState.res.forEach((r, i) => {
      const rar = RAR[r.rank];
      const card = el('button', 'card');
      card.type = 'button';
      card.style.setProperty('--rc', rc(rar));
      card.style.animationDelay = (i * 0.05) + 's';
      const back = el('span', 'card-back', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>');
      const front = el('span', 'card-front');
      const big = pullState.res.length === 1;
      front.appendChild(icon(r, big ? 110 : 54));
      const name = r.kind === 'skin' ? skinName(r.target, r.style) : IT[r.id].name;
      const tag = r.isNew ? 'NEU!' : r.up ? `Stufe ${r.lvl}` : `Doppelt +${r.refund} ★`;
      front.appendChild(el('span', 'card-name', name));
      front.appendChild(el('span', 'card-rar', rar.name + (r.kind === 'skin' ? ' · Skin' : '')));
      front.appendChild(el('span', 'card-tag' + (r.isNew ? ' new' : ''), tag));
      if (big && r.kind === 'item') front.appendChild(el('span', 'card-desc', itemText(IT[r.id], r.lvl) + ' · ' + IT[r.id].lore));
      card.append(back, front);
      card.addEventListener('click', e => { e.stopPropagation(); flip(card, r); });
      box.appendChild(card);
    });
    if (pullState.res.length === 1) setTimeout(() => flip(box.firstChild, pullState.res[0]), 350);
    else { $('pullActions').hidden = false; $('pullRevealAll').hidden = false; setActions(false); }
  }
  function flip(card, r) {
    if (card.classList.contains('flipped')) return;
    card.classList.add('flipped');
    if (r.rank >= 3) card.classList.add('shine');
    pullState.flipped++;
    snd('reveal', r.rank);
    const b = card.getBoundingClientRect();
    if (fx() && r.rank >= 2) fx().sparkles(b.left + b.width / 2, b.top + b.height / 2, 6 + r.rank * 4, pal.m[RAR[r.rank].color]);
    if (fx() && r.rank >= 4) { fx().confetti(b.left + b.width / 2, b.top + b.height / 2, r.rank >= 5 ? 120 : 70); if (r.rank >= 5) fx().rain(80); }
    if (pullState.flipped >= pullState.res.length) { $('pullActions').hidden = false; setActions(true); }
  }
  function setActions(done) {
    $('pullRevealAll').hidden = done;
    $('pullClose').hidden = !done;
    const s = S();
    const again = pullState.kind === 'gum' ? s.gold >= E.gumPrice(s) : s.stars >= (pullState.n === 10 ? C.machines.pack.cost10 : C.machines.pack.cost);
    $('pullAgain').hidden = !done || !again;
  }
  function revealAll() {
    const cards = Array.from($('cards').children);
    cards.forEach((c, i) => setTimeout(() => flip(c, pullState.res[i]), i * 140));
  }
  function closePull() { $('pull').hidden = true; pullState = null; render(true); H.refresh(); }

  /* ---------- Glücksrad ---------- */
  let wheelSpinning = false, wheelAngle = 0;
  function buildWheel() {
    const disc = $('wheelDisc');
    const segs = C.wheel.segments;
    const n = segs.length, step = 360 / n;
    disc.style.background = 'conic-gradient(' + segs.map((sg, i) => `var(--m-${sg.color}) ${i * step}deg ${(i + 1) * step}deg`).join(',') + ')';
    disc.innerHTML = '';
    segs.forEach((sg, i) => {
      const l = el('span', 'wheel-lbl', sg.label);
      l.style.transform = `rotate(${i * step + step / 2}deg) translateY(calc(var(--wr) * -0.31))`;
      disc.appendChild(l);
    });
  }
  function spin(paid) {
    if (wheelSpinning) return;
    const s = S();
    const res = E.spinWheel(s, Date.now(), paid);
    if (!res) { root.KK_UI.toast(paid ? 'Nicht genug Sternchen.' : 'Noch nicht bereit.'); return; }
    wheelSpinning = true;
    const n = C.wheel.segments.length, step = 360 / n;
    const center = res.index * step + step / 2;
    const target = wheelAngle - (wheelAngle % 360) + 360 * 5 + (360 - center);
    wheelAngle = target;
    const disc = $('wheelDisc');
    disc.style.transition = 'transform 4.2s cubic-bezier(.12,.75,.15,1)';
    disc.style.transform = `rotate(${target}deg)`;
    let tick = 0;
    const ticks = () => { if (tick > 26) return; snd('tick'); tick++; setTimeout(ticks, 40 + tick * tick * 4.5); };
    ticks();
    setTimeout(() => {
      wheelSpinning = false;
      H.drain(); H.save();
      const sg = C.wheel.segments[res.index];
      const lbl = res.stars ? `+${res.stars} ★` : res.gold ? `+${fmt(res.gold)} Gold` : sg.id === 'frenzy' ? 'Raserei: ×3 DPS für 60 s' : 'Gratis-Wundertüte!';
      snd(sg.id === 'jackpot' ? 'jackpot' : 'win');
      const r = disc.getBoundingClientRect();
      if (fx()) { fx().sparkles(r.left + r.width / 2, r.top + r.height / 2, 24); fx().confetti(r.left + r.width / 2, r.top, sg.id === 'jackpot' ? 120 : 40); }
      root.KK_UI.toast('Glücksrad: ' + lbl, 'gold');
      if (res.pack) showPull('pack', 1, res.pack);
      render(true); H.refresh();
    }, 4300);
  }

  /* ---------- Ausrüstung & Garderobe ---------- */
  function renderGear() {
    const s = S();
    const slots = $('slots'); slots.innerHTML = '';
    for (const sl of C.slots) {
      const id = s.equip[sl.id], it = IT[id];
      const box = el('div', 'slot');
      const lvl = it ? s.inv.items[id] : 0;
      if (it) box.style.setProperty('--rc', rc(RAR[E.RI[it.rarity]]));
      box.innerHTML = `<span class="slot-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${SLOT_ICON[sl.id]}</svg></span><span class="slot-name">${sl.name}</span>` +
        (it ? `<b>${it.name}</b><span class="slot-val">Lv ${lvl} · ${itemText(it, lvl)}</span>` : '<span class="slot-val">leer</span>');
      slots.appendChild(box);
    }
    const g = E.gear(s);
    $('gearSum').textContent = `Sammelbonus: ${g.nItems} Items (+${g.nItems} % Gold und DPS), ${g.nSkins} Skins (+${g.nSkins} % DPS). Tippe ein Item an, um es anzulegen.`;
    const inv = $('inv'); inv.innerHTML = '';
    const sorted = C.items.slice().sort((a, b) => E.RI[b.rarity] - E.RI[a.rarity] || a.slot.localeCompare(b.slot));
    let owned = 0;
    for (const it of sorted) {
      const lvl = s.inv.items[it.id] || 0;
      const rar = RAR[E.RI[it.rarity]];
      const b = el('button', 'inv-item' + (lvl ? '' : ' unknown') + (s.equip[it.slot] === it.id ? ' on' : ''));
      b.type = 'button';
      b.style.setProperty('--rc', rc(rar));
      if (lvl) {
        owned++;
        b.innerHTML = `<span class="slot-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${SLOT_ICON[it.slot]}</svg></span><b>${it.name}</b><span>${rar.name} · Lv ${lvl}/${rar.maxLvl}</span><span>${itemText(it, lvl)}</span>`;
        b.title = it.lore;
        b.addEventListener('click', () => { E.equipItem(S(), it.id); snd('equip'); H.drain(); H.save(); renderGear(); H.refresh(); });
      } else {
        b.disabled = true;
        b.innerHTML = `<span class="slot-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${SLOT_ICON[it.slot]}</svg></span><b>???</b><span>${rar.name}</span>`;
      }
      inv.appendChild(b);
    }
    $('invCount').textContent = `${owned}/${C.items.length}`;
  }
  function renderSkins() {
    const s = S();
    const wr = $('wardrobe'); wr.innerHTML = '';
    let total = 0, have = 0;
    const row = (target, label, styles, base) => {
      const r = el('div', 'wd-row');
      const head = el('div', 'wd-head');
      const c = el('canvas', 'por'); c.setAttribute('aria-hidden', 'true');
      head.append(c, el('b', null, label));
      r.appendChild(head);
      const chips = el('div', 'wd-chips');
      const cur = s.wear[target] || 'classic';
      const def = el('button', 'chip-btn' + (cur === 'classic' ? ' on' : ''), 'Standard'); def.type = 'button';
      def.addEventListener('click', () => { E.wearSkin(S(), target, 'base'); snd('equip'); H.drain(); H.save(); renderSkins(); });
      chips.appendChild(def);
      for (const st of styles) {
        const key = target + ':' + st.id, own = !!s.inv.skins[key], rar = RAR[E.RI[st.rarity]];
        total++; if (own) have++;
        const b = el('button', 'chip-btn' + (own ? '' : ' locked') + (cur === st.id ? ' on' : ''), own ? st.name : '?');
        b.type = 'button'; b.style.setProperty('--rc', rc(rar)); b.title = rar.name;
        if (own) b.addEventListener('click', () => { E.wearSkin(S(), target, st.id); snd('equip'); H.drain(); H.save(); renderSkins(); });
        else b.disabled = true;
        chips.appendChild(b);
      }
      r.appendChild(chips);
      wr.appendChild(r);
      requestAnimationFrame(() => ART.portrait(c, target === 'hero' ? 'hero' : FN[target].look, pal, { ink: target === 'hero', color: base ? pal.m[base] : null, skin: { target, style: s.wear[target], base } }));
    };
    row('hero', 'Held', C.heroSkins.filter(h => h.rarity), null);
    for (const f of D.fighters) row(f.id, f.name, C.fighterStyles, f.color);
    $('skinSum').textContent = `${have}/${total} Skins gesammelt. Jeder Skin gibt +1 % DPS. Skins gibt es nur in der Wundertüte.`;
  }

  function showRates() {
    const pct = r => (r < 1 ? r.toString().replace('.', ',') : r.toString().replace('.', ',')) + ' %';
    const rows = RAR.map((r, i) => `<tr><td style="color:${rc(r)}">${r.name}</td><td>${pct(C.machines.pack.rates[i])}</td><td>${pct(C.machines.gum.rates[i])}</td></tr>`).join('');
    root.KK_UI.modal({
      title: 'Wahrscheinlichkeiten',
      body: `<table class="rates"><thead><tr><th>Seltenheit</th><th>Wundertüte</th><th>Kaugummi</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="sub">Wundertüte: halb Items, halb Skins. Spätestens nach ${C.machines.pack.pity} Ziehungen ohne Legendär kommt garantiert Legendär oder besser. In jeder 10er-Tüte steckt mindestens ein „Sehr selten“. Doppelte Items steigen eine Stufe auf, danach und bei doppelten Skins gibt es Sternchen zurück. Alles wird nur mit Spielwährung bezahlt.</p>`,
      actions: [{ label: 'OK' }]
    });
  }

  /* ---------- Render ---------- */
  function render(force) {
    const s = S();
    $('lootStars').textContent = fmt(s.stars);
    const pity = C.machines.pack.pity - s.gacha.pity;
    $('pityText').textContent = `Legendär garantiert in spätestens ${pity} Ziehungen.`;
    $('pityBar').style.width = (s.gacha.pity / C.machines.pack.pity * 100).toFixed(1) + '%';
    $('pull1').disabled = s.stars < C.machines.pack.cost;
    $('pull10').disabled = s.stars < C.machines.pack.cost10;
    const gp = E.gumPrice(s);
    $('pullGumCost').textContent = fmt(gp);
    $('pullGum').disabled = s.gold < gp;
    const now = Date.now(), ready = E.wheelReady(s, now);
    $('spinFree').disabled = !ready || wheelSpinning;
    $('spinFree').textContent = ready ? 'Gratis drehen!' : 'Gratis in ' + FMT.dur((s.wheel.next - now) / 1000);
    $('spinFree').classList.toggle('hot', ready);
    $('spinPaid').disabled = s.stars < C.wheel.spinCost || wheelSpinning;
    if (force) { if (sub === 'gear') renderGear(); if (sub === 'skins') renderSkins(); }
  }
  function showSub(name) {
    sub = name;
    $('lootSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === name)));
    document.querySelectorAll('[data-sub]').forEach(x => { x.hidden = x.dataset.sub !== name; });
    render(true);
  }
  function badge() {
    const s = S();
    return s.stars >= C.machines.pack.cost || E.wheelReady(s, Date.now());
  }

  function init(getState, hooks, palette) {
    S = getState; H = hooks; pal = palette;
    buildWheel();
    $('lootSeg').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) showSub(b.dataset.v); });
    $('pull1').addEventListener('click', () => startPull('pack', 1));
    $('pull10').addEventListener('click', () => startPull('pack', 10));
    $('pullGum').addEventListener('click', () => startPull('gum', 1));
    $('spinFree').addEventListener('click', () => spin(false));
    $('spinPaid').addEventListener('click', () => spin(true));
    $('ratesBtn').addEventListener('click', showRates);
    $('packBig').addEventListener('click', openPack);
    $('pullRevealAll').addEventListener('click', revealAll);
    $('pullClose').addEventListener('click', closePull);
    $('pullAgain').addEventListener('click', () => { const p = pullState; closePull(); startPull(p.kind, p.n); });
    showSub('pull');
  }

  root.KK_LOOT = { init, render, badge, setPalette(p) { pal = p; }, get open() { return !!pullState; } };
})(window);
