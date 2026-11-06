/* Kritzelkrieg – Benutzeroberfläche (DOM). */
(function (root) {
  'use strict';
  const E = root.KK, D = E.D, B = E.B, FMT = root.KK_FMT, ART = root.KK_ART;
  const { fmt, dur } = FMT;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  const ICONS = {
    rage: '<path d="M12 3c1.2 3.2 5 5 5 9.5a5 5 0 0 1-10 0c0-2 .9-3.4 2-4.5.2 1.6 1 2.6 2 2.6C10.6 8 11 5.4 12 3z"/><path d="M10.5 16.5c0-1.3.6-2 1.5-2.8.9.8 1.5 1.5 1.5 2.8a1.5 1.5 0 0 1-3 0z"/>',
    goldrush: '<ellipse cx="12" cy="17" rx="6" ry="2.2"/><path d="M6 17v-3"/><path d="M18 17v-3"/><ellipse cx="12" cy="14" rx="6" ry="2.2"/><path d="M6 14v-3"/><path d="M18 14v-3"/><ellipse cx="12" cy="11" rx="6" ry="2.2"/><path d="M14 4l.6 1.6L16 6l-1.4.5L14 8l-.6-1.5L12 6l1.4-.4z"/>',
    clones: '<circle cx="8" cy="6" r="2.2"/><path d="M8 8.2v6.3M8 14.5l-2.5 5M8 14.5l2.5 5M8 10.5l-3 2M8 10.5l3-1.5"/><circle cx="16.5" cy="6" r="2.2" stroke-dasharray="2 1.6"/><path d="M16.5 8.2v6.3M16.5 14.5l-2.5 5M16.5 14.5l2.5 5M16.5 10.5l-3 2M16.5 10.5l3-1.5" stroke-dasharray="2 1.6"/>',
    meteor: '<circle cx="15" cy="15" r="4.5"/><path d="M11.5 11.5L4 4M13 9.5L8 3M9.5 13L3 8"/>'
  };

  let S = null, A = null, pal = null;
  const rows = { fighters: {}, workers: {}, hero: null };
  let curTab = 'fighters';
  let lastStageKey = '';
  let campT = 0;
  const campParts = [];

  /* ---------- Hilfen ---------- */
  function setText(node, txt) { if (node && node._t !== txt) { node._t = txt; node.textContent = txt; } }
  function setHTML(node, html) { if (node && node._h !== html) { node._h = html; node.innerHTML = html; } }
  function toggle(node, cls, on) { if (node && node.classList.contains(cls) !== !!on) node.classList.toggle(cls, !!on); }
  function setDisabled(node, v) { if (node && node.disabled !== !!v) node.disabled = !!v; }

  function toast(msg, kind) {
    const box = $('toasts');
    while (box.children.length > 1) box.firstChild.remove();
    const t = el('div', 'toast' + (kind ? ' ' + kind : ''));
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function modal(opts) {
    const m = $('modal');
    $('mTitle').textContent = opts.title || '';
    const body = $('mBody'); body.innerHTML = '';
    if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    const act = $('mActions'); act.innerHTML = '';
    for (const a of opts.actions || [{ label: 'OK' }]) {
      const b = el('button', a.kind === 'danger' ? 'big-btn danger' : a.kind === 'ghost' ? 'btn' : 'big-btn');
      b.type = 'button'; b.textContent = a.label;
      b.addEventListener('click', () => { close(); if (a.onClick) a.onClick(); });
      act.appendChild(b);
    }
    function close() { m.hidden = true; if (opts.onClose) opts.onClose(); }
    m.hidden = false;
    const first = act.querySelector('button'); if (first) setTimeout(() => first.focus(), 30);
    return close;
  }
  function modalOpen() { return !$('modal').hidden; }

  /* ---------- Kauf-Buttons mit Gedrückthalten ---------- */
  function holdButton(btn, fn) {
    let timer = null, repeated = false;
    const stop = () => { clearTimeout(timer); timer = null; };
    btn.addEventListener('pointerdown', e => {
      if (btn.disabled || e.button > 0) return;
      repeated = false; stop();
      timer = setTimeout(function rep() {
        if (btn.disabled) { stop(); return; }
        repeated = true; fn(); timer = setTimeout(rep, 90);
      }, 420);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('click', e => { if (repeated) { repeated = false; e.preventDefault(); return; } fn(); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ---------- Listen bauen ---------- */
  function makeRow(kind, item) {
    const r = el('div', 'row');
    const c = el('canvas', 'por'); c.setAttribute('aria-hidden', 'true');
    const info = el('div', 'info');
    const name = el('div', 'name'); const nm = el('span'); const lv = el('span', 'lvl');
    name.append(nm, lv);
    const stat = el('div', 'stat'); const desc = el('div', 'desc'); const ms = el('div', 'ms'); const msi = el('i'); ms.appendChild(msi);
    info.append(name, stat, desc, ms);
    const btn = el('button', 'buy'); btn.type = 'button';
    const bq = el('span', 'bq'), bc = el('span', 'bc'); btn.append(bq, bc);
    r.append(c, info, btn);
    const o = { r, c, nm, lv, stat, desc, msi, btn, bq, bc, kind, item, look: item ? item.look : 'hero', drawn: '' };
    holdButton(btn, () => {
      if (kind === 'hero') A.buyHero(); else if (kind === 'fighter') A.buyFighter(item.id); else A.buyWorker(item.id);
    });
    return o;
  }

  function buildLists() {
    const lf = $('listFighters'); lf.innerHTML = '';
    rows.hero = makeRow('hero', null);
    lf.appendChild(rows.hero.r);
    for (const f of D.fighters) { rows.fighters[f.id] = makeRow('fighter', f); lf.appendChild(rows.fighters[f.id].r); }
    const lw = $('listWorkers'); lw.innerHTML = '';
    for (const w of D.workers) { rows.workers[w.id] = makeRow('worker', w); lw.appendChild(rows.workers[w.id].r); }
  }

  function drawPortrait(o, locked) {
    const key = (locked ? 'L' : 'U') + pal.paper + pal.ink + o.c.clientWidth;
    if (o.drawn === key || !o.c.clientWidth) return;
    o.drawn = key;
    ART.portrait(o.c, o.look, pal, { locked, ink: o.kind === 'hero' });
  }

  function buildBuybars() {
    const modes = [1, 10, 25, 100, 'max'];
    document.querySelectorAll('[data-buybar]').forEach(bar => {
      bar.innerHTML = '';
      for (const m of modes) {
        const b = el('button'); b.type = 'button'; b.dataset.mode = String(m);
        b.textContent = m === 'max' ? 'Max' : '×' + m;
        b.addEventListener('click', () => A.setBuy(m));
        bar.appendChild(b);
      }
    });
  }

  function buildTalents() {
    const box = $('talents'); box.innerHTML = '';
    for (const t of D.talents) {
      const b = el('button', 'tal'); b.type = 'button'; b.dataset.id = t.id;
      b.innerHTML = `<span class="tn"><span>${t.name}</span><span class="tr"></span></span><span class="td">${t.desc}</span><span class="tv"></span>`;
      b.addEventListener('click', () => A.buyTalent(t.id));
      box.appendChild(b);
    }
  }

  function buildSkills() {
    const bar = $('skills'); bar.innerHTML = '';
    const list = $('skillList'); list.innerHTML = '';
    for (const k of D.skills) {
      const b = el('button', 'skill'); b.type = 'button'; b.dataset.id = k.id;
      b.setAttribute('aria-label', `${k.name}: ${k.desc}`);
      b.innerHTML = `<span class="cd"></span><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k.id]}</svg><span class="key">${k.key}</span><span class="lock">Lv ${k.unlock}</span>`;
      b.addEventListener('click', () => A.useSkill(k.id));
      bar.appendChild(b);
      const r = el('div', 'sk-row'); r.dataset.id = k.id;
      r.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k.id]}</svg><div><div>${k.name}</div><div class="sd">${k.desc}</div></div><div class="su"></div>`;
      list.appendChild(r);
    }
  }

  function buildAchs() {
    const box = $('achs'); box.innerHTML = '';
    for (const a of D.achievements) {
      const n = el('div', 'ach'); n.dataset.id = a.id;
      n.innerHTML = `<b>${a.name}</b><span>${a.desc}</span>`;
      box.appendChild(n);
    }
  }

  function buildTabs() {
    $('tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-tab]');
      if (b) showTab(b.dataset.tab);
    });
    $('hudLevel').addEventListener('click', () => showTab('talents'));
  }
  function showTab(name) {
    curTab = name;
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    document.querySelectorAll('.pane').forEach(p => { p.hidden = p.dataset.pane !== name; });
    $('panel').scrollTop = 0;
    if (name === 'more') renderMore();
    update(Date.now(), true);
  }

  function buildSettings() {
    const seg = (id, key, conv) => {
      $(id).addEventListener('click', e => {
        const b = e.target.closest('button[data-v]'); if (!b) return;
        A.setSetting(key, conv(b.dataset.v));
        renderSettings();
      });
    };
    seg('setSound', 'sound', v => v === '1');
    seg('setSci', 'sci', v => v === '1');
    seg('setTheme', 'theme', v => v);
    $('btnExport').addEventListener('click', () => {
      const code = A.exportSave();
      const ta = $('saveText'); ta.value = code;
      const done = ok => setText($('saveMsg'), ok ? 'Code kopiert. Auf dem anderen Gerät unter „Code laden“ einfügen.' : 'Code erzeugt. Markiere ihn und kopiere ihn von Hand.');
      try {
        navigator.clipboard.writeText(code).then(() => done(true), () => { ta.focus(); ta.select(); done(false); });
      } catch (e) { ta.focus(); ta.select(); done(false); }
    });
    $('btnImport').addEventListener('click', () => {
      const txt = $('saveText').value.trim();
      if (!txt) { setText($('saveMsg'), 'Füge zuerst einen Export-Code in das Feld ein.'); return; }
      modal({
        title: 'Spielstand laden?',
        body: '<p>Der aktuelle Fortschritt wird durch den Code ersetzt.</p>',
        actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Laden', onClick: () => {
          const ok = A.importSave(txt);
          setText($('saveMsg'), ok ? 'Spielstand geladen.' : 'Der Code ist ungültig oder unvollständig. Kopiere ihn noch einmal komplett.');
        } }]
      });
    });
    $('btnReset').addEventListener('click', () => {
      modal({
        title: 'Alles löschen?',
        body: '<p>Gold, Kämpfer, Level, Seelen und Erfolge gehen verloren. Das lässt sich nicht rückgängig machen.</p>',
        actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Endgültig löschen', kind: 'danger', onClick: () => A.reset() }]
      });
    });
  }

  function renderSettings() {
    const mark = (id, v) => $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    mark('setSound', S().settings.sound ? '1' : '0');
    mark('setSci', S().settings.sci ? '1' : '0');
    mark('setTheme', S().settings.theme || 'auto');
    $('btnSound').setAttribute('aria-pressed', String(!!S().settings.sound));
    $('btnSound').setAttribute('aria-label', S().settings.sound ? 'Ton aus' : 'Ton an');
  }

  /* ---------- Aktualisieren ---------- */
  function hud(now) {
    const s = S();
    setText($('hudGold'), fmt(s.gold));
    const passive = E.workerIncome(s, now) + E.idleCombat(s).gold;
    setText($('hudGps'), '+' + fmt(passive, { decimals: true }) + ' /s');
    setText($('hudLv'), String(s.level));
    $('hudXp').style.width = Math.min(100, s.xp / E.xpNeed(s.level) * 100).toFixed(1) + '%';
    $('hudSouls').hidden = s.souls <= 0 && s.ascensions <= 0;
    setText($('hudSoulsN'), fmt(s.souls));

    // Stufe
    const e = s.enemy;
    const key = [s.stage, s.maxStage, s.kills, s.autoAdvance, e && e.boss].join(',');
    if (key !== lastStageKey) {
      lastStageKey = key;
      setText($('stNum'), String(s.stage));
      const pips = $('stPips');
      if (s.stage < s.maxStage) setHTML(pips, '<span class="farm">geschafft · farmen</span>');
      else if (E.isBoss(s.stage)) setHTML(pips, '<span class="farm">Bossstufe</span>');
      else { let h = ''; for (let i = 0; i < B.killsPerStage; i++) h += `<i class="${i < s.kills ? 'on' : ''}"></i>`; setHTML(pips, h); }
      setDisabled($('stPrev'), s.stage <= 1);
      setDisabled($('stNext'), s.stage >= s.maxStage);
      const z = E.zoneOf(s.stage);
      setText($('stZone'), `Kapitel ${Math.floor((s.stage - 1) / 10) + 1} · ${z.name}`);
      const btn = $('btnBoss');
      btn.hidden = s.autoAdvance;
      setText(btn, E.isBoss(s.maxStage) ? 'Boss herausfordern' : 'Weiter vorrücken');
    }
    const bb = $('bossBar');
    const showBoss = e && e.boss && s.spawnTimer <= 0 && e.hp > 0;
    bb.hidden = !showBoss;
    if (showBoss) {
      const tot = E.bossDuration(s);
      $('bossFill').style.width = Math.max(0, s.bossTime / tot * 100).toFixed(1) + '%';
      setText($('bossTime'), Math.max(0, s.bossTime).toFixed(1) + ' s');
    }
    if (!$('btnBoss').hidden && showBoss) $('btnBoss').hidden = true;
    setText($('dpsTag'), 'DPS ' + fmt(E.totalDps(s, now)));

    // Fähigkeiten: freigeschaltete plus die nächste gesperrte als Vorschau
    let teaser = false;
    for (const k of D.skills) {
      const b = $('skills').querySelector(`[data-id="${k.id}"]`);
      const st = E.skillState(s, k.id, now);
      const vis = st.unlocked || !teaser;
      if (!st.unlocked) teaser = true;
      if (b.hidden === vis) b.hidden = !vis;
      const lock = b.querySelector('.lock');
      if (lock.hidden !== st.unlocked) lock.hidden = st.unlocked;
      setDisabled(b, !st.unlocked || (!st.ready && !st.active));
      toggle(b, 'ready', st.ready);
      toggle(b, 'active', st.active);
      const p = st.active ? 0 : st.cdLeft / k.cd * 100;
      b.style.setProperty('--p', p.toFixed(1) + '%');
    }
    $('tapHint').hidden = s.stats.taps > 0;
  }

  function rowUpdate(o, s, now, mode) {
    let lvl, price, can, show = true, locked = false;
    if (o.kind === 'hero') {
      lvl = s.hero; price = E.heroPrice(s, mode);
      setText(o.nm, 'Held');
      setText(o.lv, 'Lv ' + lvl);
      setText(o.stat, `Klick ${fmt(E.clickDamage(s, now))}`);
      const next = (Math.floor(lvl / 25) + 1) * 25;
      setText(o.desc, `Lv ${next}: Klick ×2, +1 % DPS pro Klick`);
      o.msi.style.width = (lvl % 25) / 25 * 100 + '%';
    } else if (o.kind === 'fighter') {
      const f = o.item; lvl = s.fighters[f.id]; price = E.fighterPrice(s, f.id, mode);
      const idx = D.fighters.indexOf(f);
      const prevOwned = idx === 0 || s.fighters[D.fighters[idx - 1].id] > 0;
      const prev2 = idx <= 1 || s.fighters[D.fighters[idx - 2].id] > 0;
      show = lvl > 0 || prevOwned || prev2;
      locked = lvl === 0 && !prevOwned;
      setText(o.nm, locked ? '???' : f.name);
      setText(o.lv, lvl > 0 ? 'Lv ' + lvl : '');
      const cur = E.fighterDps(s, f.id, now);
      const gain = (E.fighterBaseDps(f, lvl + price.n) - E.fighterBaseDps(f, lvl)) * E.dpsMult(s, now);
      setText(o.stat, locked ? 'Noch nicht entdeckt' : lvl > 0 ? `DPS ${fmt(cur)} (+${fmt(gain)})` : `+${fmt(gain)} DPS`);
      const next = (Math.floor(lvl / B.fighterMilestone) + 1) * B.fighterMilestone;
      setText(o.desc, locked ? '' : lvl > 0 ? `×${B.fighterMilestoneMult} Schaden bei Lv ${next}` : f.desc);
      o.msi.style.width = lvl > 0 ? (lvl % B.fighterMilestone) / B.fighterMilestone * 100 + '%' : '0%';
    } else {
      const w = o.item; lvl = s.workers[w.id]; price = E.workerPrice(s, w.id, mode);
      const idx = D.workers.indexOf(w);
      const prevOwned = idx === 0 || s.workers[D.workers[idx - 1].id] > 0;
      const prev2 = idx <= 1 || s.workers[D.workers[idx - 2].id] > 0;
      show = lvl > 0 || prevOwned || prev2;
      locked = lvl === 0 && !prevOwned;
      setText(o.nm, locked ? '???' : w.name);
      setText(o.lv, lvl > 0 ? '× ' + lvl : '');
      const cur = E.workerGps(s, w.id, now);
      s.workers[w.id] += price.n; const after = E.workerGps(s, w.id, now); s.workers[w.id] -= price.n;
      setText(o.stat, locked ? 'Noch nicht entdeckt' : lvl > 0 ? `${fmt(cur, { decimals: true })} /s (+${fmt(after - cur, { decimals: true })})` : `+${fmt(after - cur, { decimals: true })} Gold /s`);
      const nm = E.nextWorkerMilestone(lvl);
      const prevM = [0].concat(B.workerMilestones).filter(x => x <= lvl).pop() || 0;
      setText(o.desc, locked ? '' : lvl > 0 && nm ? `×2 Einkommen bei ${nm} Stück` : w.desc);
      o.msi.style.width = nm ? ((lvl - prevM) / (nm - prevM) * 100) + '%' : '100%';
    }
    o.r.hidden = !show;
    if (!show) return;
    can = s.gold >= price.cost;
    toggle(o.r, 'locked', locked);
    setText(o.bq, lvl > 0 || o.kind === 'hero' ? '+' + price.n : price.n > 1 ? 'Kaufen ' + price.n : 'Kaufen');
    setText(o.bc, fmt(price.cost));
    setDisabled(o.btn, !can);
    toggle(o.btn, 'can', can);
    drawPortrait(o, locked);
  }

  function update(now, force) {
    const s = S();
    const mode = s.settings.buy;
    document.querySelectorAll('[data-buybar] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === String(mode))));

    // Badges
    const badge = $('badgeTal');
    badge.hidden = s.points <= 0;
    const gain = E.soulsForAscend(s);
    $('badgeAsc').hidden = !(gain > 0 && gain >= Math.max(1, s.souls * 0.25));

    if (curTab === 'fighters' || force) {
      setText($('fightSum'), `DPS ${fmt(E.totalDps(s, now))} · Klick ${fmt(E.clickDamage(s, now))} · Krit ${Math.round(E.critChance(s) * 100)} % ×${E.critMult(s)}`);
      rowUpdate(rows.hero, s, now, mode);
      for (const f of D.fighters) rowUpdate(rows.fighters[f.id], s, now, mode);
    }
    if (curTab === 'workers' || force) {
      setText($('workSum'), `Passiv ${fmt(E.workerIncome(s, now), { decimals: true })} Gold /s`);
      setText($('fameNote'), `Ruhm-Bonus ×${fmt(E.fame(s), { decimals: true })}: Arbeiter verdienen mehr, je weiter deine Truppe kommt (×${B.fameGrowth.toString().replace('.', ',')} pro Stufe).`);
      for (const w of D.workers) rowUpdate(rows.workers[w.id], s, now, mode);
    }
    if (curTab === 'talents' || force) renderTalents(s, now);
    if (curTab === 'ascend' || force) renderAscend(s);
    if (curTab === 'more' && !force) renderStats(s);
  }

  function talentValue(id, s) {
    const r = s.talents[id];
    switch (id) {
      case 'power': return `Aktuell +${r * 25} % Klickschaden`;
      case 'tactics': return `Aktuell +${r * 10} % DPS`;
      case 'greed': return `Aktuell +${r * 10} % Gold`;
      case 'foreman': return `Aktuell +${r * 15} % Arbeiter`;
      case 'precision': return `Krit-Chance ${Math.round(E.critChance(s) * 100)} %`;
      case 'force': return `Krit-Schaden ×${E.critMult(s)}`;
      case 'synergy': return `Klick +${Math.round(E.clickSynergy(s) * 100)} % der DPS`;
      case 'endurance': return `Bosszeit ${E.bossDuration(s)} s`;
      case 'dreamer': return `Offline ${Math.round(E.offlineEff(s) * 100)} %`;
    }
    return '';
  }

  function renderTalents(s, now) {
    setText($('tLv'), String(s.level));
    const need = E.xpNeed(s.level);
    $('tXp').style.width = Math.min(100, s.xp / need * 100).toFixed(1) + '%';
    setText($('tXpText'), `${fmt(s.xp)} / ${fmt(need)} EP bis Level ${s.level + 1}. EP gibt es für jeden besiegten Gegner, mehr auf hohen Stufen und bei Bossen.`);
    setText($('tLvBonus'), `Level-Bonus: ×${fmt(Math.pow(B.levelBonus, s.level - 1), { decimals: true })} auf Gold und Schaden (×1,03 pro Level). Level und Talente bleiben beim Aufstieg erhalten.`);
    const pts = $('tPts');
    setText(pts, s.points === 1 ? '1 Punkt frei' : `${s.points} Punkte frei`);
    toggle(pts, 'has', s.points > 0);
    $('talents').querySelectorAll('.tal').forEach(b => {
      const t = E.T[b.dataset.id], r = s.talents[t.id];
      const maxed = t.max && r >= t.max;
      setText(b.querySelector('.tr'), t.max ? `${r}/${t.max}` : `Rang ${r}`);
      setText(b.querySelector('.tv'), talentValue(t.id, s));
      setDisabled(b, maxed || s.points <= 0);
      toggle(b, 'can', !maxed && s.points > 0);
      toggle(b, 'maxed', maxed);
    });
    $('skillList').querySelectorAll('.sk-row').forEach(r => {
      const k = E.K[r.dataset.id];
      const st = E.skillState(s, k.id, now);
      toggle(r, 'locked', !st.unlocked);
      setText(r.querySelector('.su'), !st.unlocked ? `ab Level ${k.unlock}` : st.active ? `aktiv ${Math.ceil(st.left)} s` : st.ready ? `bereit · Taste ${k.key}` : `wieder in ${dur(st.cdLeft)}`);
    });
  }

  function renderAscend(s) {
    setText($('aSouls'), fmt(s.souls));
    setText($('aBonus'), s.souls > 0 ? `+${fmt(s.souls * B.soulBonus * 100)} % auf Gold und Schaden · ${s.ascensions}× aufgestiegen` : 'Noch keine Seelen.');
    const gain = E.soulsForAscend(s);
    const btn = $('btnAscend');
    if (gain > 0) {
      const now = 1 + s.souls * B.soulBonus, after = 1 + (s.souls + gain) * B.soulBonus;
      setText($('aGainText'), `Höchste Stufe in diesem Lauf: ${s.maxStage}. Aufsteigen bringt +${fmt(gain)} Seelen: dein Bonus steigt von ×${fmt(now, { decimals: true })} auf ×${fmt(after, { decimals: true })}.`);
    } else {
      setText($('aGainText'), `Aufstieg ab Stufe ${B.ascendMinStage}. Deine höchste Stufe in diesem Lauf: ${s.maxStage}.`);
    }
    setDisabled(btn, gain <= 0);
  }

  function renderStats(s) {
    const rowsH = [
      ['Spielzeit', dur(s.stats.playTime)],
      ['Taps', fmt(s.stats.taps)],
      ['Besiegte Gegner', fmt(s.stats.kills)],
      ['Besiegte Bosse', fmt(s.stats.bossKills)],
      ['Kritische Treffer', fmt(s.stats.crits)],
      ['Stärkster Treffer', fmt(s.stats.maxHit)],
      ['Höchste Stufe (gesamt)', String(s.bestStage)],
      ['Gold insgesamt', fmt(s.lifeGold)],
      ['Gold in diesem Lauf', fmt(s.runGold)],
      ['Offline verdient', fmt(s.stats.offlineGold)],
      ['Aufstiege', String(s.ascensions)],
      ['Seelen insgesamt', fmt(s.stats.soulsEarned)]
    ];
    setHTML($('stats'), rowsH.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join(''));
    const done = E.achCount(s);
    setText($('achCount'), `${done}/${D.achievements.length} · +${done * B.achBonus * 100} % auf alles`);
    $('achs').querySelectorAll('.ach').forEach(n => toggle(n, 'done', !!s.ach[n.dataset.id]));
  }
  function renderMore() {
    const s = S();
    renderStats(s);
    renderSettings();
    const C = root.KK_CLOUD;
    const st = C ? C.status : 'off';
    const msg = {
      off: 'Gespeichert wird automatisch in diesem Browser. Für ein anderes Gerät nutze den Export-Code.',
      connecting: 'Cloud-Speicher wird verbunden …',
      on: 'Cloud-Speicher aktiv: Öffne dieses Spiel auf iPhone oder PC mit demselben Konto, dann geht es mit deinem Stand weiter.',
      readonly: 'Du kannst dieses Spiel nur ansehen, die Cloud speichert für dich nicht. Lokal wird trotzdem gespeichert.',
      error: 'Cloud-Speicher gerade nicht erreichbar. Lokal wird weiter gespeichert.'
    }[st];
    setText($('saveInfo'), msg + (s.savedAt ? ` Zuletzt gespeichert: ${new Date(s.savedAt).toLocaleTimeString('de-DE')}.` : ''));
  }

  /* ---------- Lager-Szene ---------- */
  function campFrame(dt) {
    if (curTab !== 'workers') return;
    const c = $('camp');
    const w = c.clientWidth, h = c.clientHeight;
    if (!w) return;
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    campT += dt;
    const s = S();
    const owned = D.workers.filter(x => s.workers[x.id] > 0);
    const g = h - 8;
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ART.line(ctx, 0, g + 0.5, w, g + 0.5);
    if (!owned.length) {
      ctx.fillStyle = pal.inkSoft; ctx.font = `16px ${pal.font}`; ctx.textAlign = 'center';
      ctx.fillText('Noch leer. Stell deinen ersten Sammler ein!', w / 2, h / 2);
      return;
    }
    const sp = Math.min(70, w / owned.length);
    const x0 = w / 2 - sp * (owned.length - 1) / 2;
    owned.forEach((wk, i) => {
      const x = x0 + i * sp;
      const ph = (campT * 1.6 + i * 0.37) % 1;
      const k = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      const pose = ART.mix(ART.POSES.idle, ART.POSES.work, k);
      const o = ART.looks(wk.look, pal, pal.pencil);
      o.dir = i % 2 ? -1 : 1;
      ART.stick(ctx, x, g, h * 0.62, pose, o);
      if (ph < 0.02 && Math.random() < 0.5 && campParts.length < 30) campParts.push({ x, y: g - h * 0.5, vy: -40, t: 0 });
      ctx.fillStyle = pal.inkSoft; ctx.font = `12px ${pal.font}`; ctx.textAlign = 'center';
      ctx.fillText('×' + s.workers[wk.id], x, 12);
    });
    for (const p of campParts) {
      p.t += dt; p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, 1 - p.t);
      ctx.fillStyle = pal.gold; ctx.strokeStyle = pal.goldInk; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, ART.TAU); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = campParts.length - 1; i >= 0; i--) if (campParts[i].t > 1) campParts.splice(i, 1);
  }

  /* ---------- Ereignisse ---------- */
  function onEvent(ev) {
    const s = S();
    switch (ev.t) {
      case 'level': {
        toast(`Level ${ev.level}! +1 Talentpunkt`, 'gold');
        const k = D.skills.find(x => x.unlock === ev.level);
        if (k) setTimeout(() => toast(`Neue Fähigkeit: ${k.name} (Taste ${k.key})`), 600);
        break;
      }
      case 'ach': {
        const a = D.achievements.find(x => x.id === ev.id);
        if (a) toast(`Erfolg: ${a.name} (+2 %)`, 'gold');
        break;
      }
      case 'cleared':
        if (ev.stage % 10 === 0) {
          const z = E.zoneOf(ev.stage + 1);
          toast(`Kapitel ${Math.floor(ev.stage / 10) + 1}: ${z.name}`);
        }
        if (ev.stage + 1 === B.ascendMinStage) toast('Aufstieg freigeschaltet!', 'gold');
        break;
      case 'bossFail':
        toast('Boss zu stark – erst aufrüsten!');
        break;
      case 'buy':
        if (ev.first) {
          const o = ev.kind === 'fighter' ? rows.fighters[ev.id] : null;
          if (o) { o.r.classList.remove('new'); void o.r.offsetWidth; o.r.classList.add('new'); }
        }
        break;
      case 'kill': {
        const g = $('hudGoldBox'); g.classList.remove('bump'); void g.offsetWidth; g.classList.add('bump');
        break;
      }
    }
    void s;
  }

  function setPalette(p) { pal = p; for (const k in rows.fighters) rows.fighters[k].drawn = ''; for (const k in rows.workers) rows.workers[k].drawn = ''; if (rows.hero) rows.hero.drawn = ''; }

  function init(getState, actions, palette) {
    S = getState; A = actions; pal = palette;
    buildLists(); buildBuybars(); buildTalents(); buildSkills(); buildAchs(); buildTabs(); buildSettings();
    $('stPrev').addEventListener('click', () => A.setStage(S().stage - 1));
    $('stNext').addEventListener('click', () => A.setStage(S().stage + 1));
    $('btnBoss').addEventListener('click', () => A.challengeBoss());
    $('btnAscend').addEventListener('click', () => {
      const gain = E.soulsForAscend(S());
      if (gain <= 0) return;
      modal({
        title: 'Aufsteigen?',
        body: `<p class="bigline">+${fmt(gain)} Seelen</p><p>Du startest wieder bei Stufe 1, mit dauerhaft +${fmt(gain * B.soulBonus * 100)} % mehr Gold und Schaden. Level, Talente und Erfolge bleiben.</p>`,
        actions: [{ label: 'Noch nicht', kind: 'ghost' }, { label: 'Aufsteigen', onClick: () => A.ascend() }]
      });
    });
    $('btnSound').addEventListener('click', () => { A.setSetting('sound', !S().settings.sound); renderSettings(); });
    renderSettings();
  }

  function rebuild() { lastStageKey = ''; update(Date.now(), true); renderSettings(); }

  root.KK_UI = { init, update, hud, toast, modal, modalOpen, onEvent, showTab, setPalette, campFrame, rebuild, renderMore, get tab() { return curTab; } };
})(window);
