/* Kritzelkrieg – Start, Spielschleife, Eingabe, Speichern. */
(function (root) {
  'use strict';
  const E = root.KK, FMT = root.KK_FMT, AR = root.KK_ARENA, UI = root.KK_UI, AU = root.KK_AUDIO, CL = root.KK_CLOUD, FX = root.KK_FX;
  const ST = root.KK_STORY, LOOT = root.KK_LOOT;
  const KEY = 'kritzelkrieg-save-v1';
  let state = null;
  let lastFrame = 0, hudAcc = 0, uiAcc = 0, saveAcc = 0, cloudAcc = 0;
  let cloudReady = false, cloudChecking = false, bootSavedAt = 0;
  let themeSetByUs = false, pal = null;
  let menuOpen = false, pendingOffline = null, autoAcc = 0, lastRender = 0, perfAcc = 0, perfN = 0, perfSlow = 0, autoLow = false;
  const pads = { prev: [] };
  const canvas = document.getElementById('arena');

  /* ---------- Speicher ---------- */
  function storageGet() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function storageSet(v) { try { localStorage.setItem(KEY, v); return true; } catch (e) { return false; } }
  function storageDel() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  function saveLocal() {
    if (!state) return null;
    state.savedAt = Date.now();
    const json = E.serialize(state);
    storageSet(json);
    return json;
  }
  function saveCloud() {
    if (!cloudReady || cloudChecking || !CL.available) return;
    const json = saveLocal();
    CL.save(json, state.savedAt);
  }

  function encode(json) { return 'KK1:' + btoa(unescape(encodeURIComponent(json))); }
  function decode(txt) {
    txt = txt.replace(/\s+/g, '');
    if (txt[0] === '{') return txt;
    if (txt.startsWith('KK1:')) txt = txt.slice(4);
    return decodeURIComponent(escape(atob(txt)));
  }

  /* ---------- Theme ---------- */
  function refreshPalette() {
    pal = AR.readPalette();
    UI.setPalette(pal);
    if (ST) ST.setPalette(pal);
    if (LOOT) LOOT.setPalette(pal);
    UI.update(Date.now(), true);
  }
  function applyTheme() {
    const t = state.settings.theme, html = document.documentElement;
    if (t === 'light' || t === 'dark') { html.setAttribute('data-theme', t); themeSetByUs = true; }
    else if (themeSetByUs) { html.removeAttribute('data-theme'); themeSetByUs = false; }
    const meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach(m => { if (t === 'light' || t === 'dark') m.setAttribute('content', t === 'dark' ? '#1e2925' : '#f7f5ec'); });
    refreshPalette();
  }

  function applyAudio() {
    if (state.settings.music === undefined) state.settings.music = true;
    AU.setSfx(state.settings.sound);
    AU.setMusic(state.settings.music);
    AU.setVolumes(state.settings.musicVol != null ? state.settings.musicVol : 0.8, state.settings.sfxVol != null ? state.settings.sfxVol : 0.9);
  }
  // Grafik: Qualität (Auto misst die Bildzeit), Effektstärke, Wackeln, Zahlen
  function applyGfx() {
    const st = state.settings, q = st.gfx || 'auto';
    const low = q === 'low' || (q === 'auto' && autoLow) || !!st.eco;
    const base = q === 'high' ? 1.25 : q === 'med' ? 0.8 : low ? 0.45 : 1;
    root.KK_GFX = { fx: Math.max(0, (st.fx == null ? 1 : st.fx) * base), shake: st.shake !== false, numbers: st.numbers !== false, low };
    document.documentElement.classList.toggle('gfx-low', low);
  }
  function fpsCap() { const st = state.settings; if (st.eco) return 30; return st.fps == null ? 60 : st.fps; }
  function perfSample(dt) {
    if ((state.settings.gfx || 'auto') !== 'auto' || document.visibilityState !== 'visible') return;
    perfAcc += dt; perfN++;
    if (perfAcc < 3) return;
    const avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
    const cap = fpsCap(), target = cap ? 1 / cap : 1 / 60;
    if (avg > Math.max(target * 1.45, 0.026)) perfSlow++; else perfSlow = Math.max(0, perfSlow - 1);
    const want = perfSlow >= 2 ? true : perfSlow === 0 ? false : autoLow;
    if (want !== autoLow) { autoLow = want; applyGfx(); }
  }
  // Haptik: Vibration, wo der Browser sie erlaubt (iOS Safari bietet Webseiten keine Vibration)
  function haptic(p) { try { if (state.settings.haptics && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* optional */ } }
  function wantTrack() {
    const e = state.enemy;
    return e && e.boss && e.hp > 0 ? 'boss' : 'z' + E.zoneIndex(state.stage);
  }
  function story(id, cb) {
    if (state.story.seen[id]) { if (cb) cb(); return false; }
    state.story.seen[id] = true;
    ST.play(id, () => { state.lastTick = Date.now(); if (cb) cb(); });
    saveLocal();
    return true;
  }
  function storyFor(ev) {
    if (ev.t === 'cleared') {
      if (ev.stage % 10 === 0 && ev.stage <= 60) story('ch' + (ev.stage / 10 + 1));
      if (ev.stage === 24) story('mega');
      if (ev.stage === 99) story('finale');
    }
    if (ev.t === 'ascend' && state.ascensions === 1) setTimeout(() => story('newbook'), 3400);
  }
  function starsPop(n) {
    const h = document.getElementById('hudStars');
    if (!h) return;
    h.classList.remove('bump'); void h.offsetWidth; h.classList.add('bump');
    const r = h.getBoundingClientRect();
    FX.sparkles(r.left + r.width / 2, r.top + r.height / 2, 6 + Math.min(10, n));
    AU.play('star');
  }
  function daily() {
    const res = E.claimDaily(state, Date.now());
    if (!res) return;
    state._ev = state._ev.filter(ev => ev.t === 'ach');
    UI.showDaily(res, () => { AU.play('daily'); const b = document.getElementById('hudGoldBox').getBoundingClientRect(); FX.coins(b.left + 40, b.top + 120, 12, true); });
    saveLocal();
  }

  /* ---------- Zustand ersetzen ---------- */
  function replaceState(s) {
    state = s;
    AR.reset();
    FMT.setSci(state.settings.sci);
    applyAudio();
    applyTheme();
    UI.rebuild();
    saveLocal();
  }

  /* ---------- Offline ---------- */
  function offline(gap) {
    const off = E.computeOffline(state, gap);
    const lv = E.applyOffline(state, off);
    state._ev = [];
    if (off.gold <= 0 && off.xp <= 0) return;
    pendingOffline = { off, lv };
    if (!menuOpen) showOffline();
  }
  function showOffline() {
    if (!pendingOffline) return;
    const { off, lv } = pendingOffline; pendingOffline = null;
    UI.showOffline(off, lv, () => {
      AU.play('coin');
      const b = document.getElementById('hudGoldBox').getBoundingClientRect();
      FX.coins(b.left + 40, b.top + 120, 10 + Math.min(14, (off.items || []).length * 2), true);
      if ((off.items || []).some(r => r.rank >= 3)) AU.play('reveal', 4);
    });
  }
  // Zeitschutz: Offline-Zeit zählt nur ab dem spätesten je gesehenen Zeitpunkt.
  // Stellt jemand die Uhr vor und wieder zurück, gibt es bis zum Einholen nichts doppelt.
  function clockGuard(now) {
    if (!state.maxTime || state.maxTime > now + 366 * 864e5) state.maxTime = Math.max(now, state.lastTick || 0);
    if (now < state.lastTick - 5000) { state.stats.clockBack = (state.stats.clockBack || 0) + 1; state.lastTick = now; }
    if (now > state.maxTime) state.maxTime = now;
  }

  /* ---------- Simulation ---------- */
  let bulk = false;
  function stepSim(now) {
    const ref = Math.max(state.lastTick, Math.min(state.maxTime || 0, now));
    let gap = (now - state.lastTick) / 1000;
    if (gap > 60) gap = (now - ref) / 1000;
    clockGuard(now);
    bulk = false;
    if (gap <= 0) { state.lastTick = now; return; }
    if (gap > 60) { state.lastTick = now; offline(gap); return; }
    bulk = gap > 1.5;
    while (gap > 1e-6) {
      const dt = Math.min(0.1, gap);
      E.tick(state, dt, now - (gap - dt) * 1000);
      gap -= dt;
    }
    state.lastTick = now;
  }

  function sound(ev) {
    switch (ev.t) {
      case 'tap': if (ev.dmg > 0) AU.play('swing', { w: 'fist', crit: ev.crit }); break;
      case 'kill': AU.play('kill'); break;
      case 'spawn': if (ev.boss) AU.play('roar'); break;
      case 'plane': AU.play('plane'); break;
      case 'planeCatch': AU.play('planeCatch'); break;
      case 'combo': if (ev.n >= 25) AU.play('combo', ev.n); break;
      case 'hstrike': AU.play('swing', { w: ev.weapon, heavy: ev.heavy, crit: ev.crit }); break;
      case 'eatk': if (ev.special) AU.play('warn'); break;
      case 'ehit': AU.play(ev.out === 'hit' ? 'hurt' : ev.out === 'block' ? 'block' : ev.out === 'parry' ? 'parry' : 'dodge'); if (ev.out === 'hit' && ev.special) haptic(30); break;
      case 'counter': AU.play('counter'); break;
      case 'ko': AU.play('ko'); haptic([60, 40, 60]); break;
      case 'revive': case 'shield': AU.play('revive'); break;
      case 'phase': AU.play('roar'); haptic(50); break;
      case 'drop': AU.play('reveal', ev.res.rank); if (ev.res.rank >= 3) haptic([30, 30, 60]); break;
      case 'level': AU.play('level'); break;
      case 'skill': AU.play('skill'); break;
      case 'meteor': AU.play('meteor'); break;
      case 'bossFail': AU.play('fail'); break;
      case 'ach': AU.play('ach'); break;
      case 'ascend': AU.play('ascend'); break;
      case 'buy': AU.play(ev.milestone ? 'milestone' : 'buy'); break;
    }
  }
  function drain() {
    const evs = state._ev;
    if (!evs.length) return;
    state._ev = [];
    for (const ev of evs) {
      AR.onEvent(ev, bulk);
      if (!bulk || ev.t === 'level' || ev.t === 'ach') UI.onEvent(ev);
      if (!bulk) sound(ev);
      if (ev.t === 'stars' && !bulk) starsPop(ev.n);
      storyFor(ev);
    }
  }

  function frame(ts) {
    root.requestAnimationFrame(frame);
    if (!state) return;
    const cap = fpsCap();
    if (cap && lastRender && ts - lastRender < 1000 / cap - 2) return;
    lastRender = ts;
    const now = Date.now();
    const dt = lastFrame ? Math.min(0.1, Math.max(0, (ts - lastFrame) / 1000)) : 0.016;
    lastFrame = ts;
    perfSample(dt);
    pollPads();
    if (ST.open) { state.lastTick = now; return; }
    stepSim(now);
    autoAcc += dt;
    if (autoAcc >= 1) {
      autoAcc = 0;
      if (E.autoBuy(state) > 0) { state._ev = state._ev.filter(ev => ev.t !== 'buy' || ev.milestone); UI.update(now, true); }
    }
    drain();
    AR.frame(dt, now);
    FX.frame(dt);
    UI.campFrame(dt);
    AU.setTrack(wantTrack());
    hudAcc += dt; if (hudAcc >= 0.066) { hudAcc = 0; UI.hud(now); }
    uiAcc += dt; if (uiAcc >= 0.25) {
      uiAcc = 0; UI.update(now);
      document.getElementById('badgeLoot').hidden = !LOOT.badge();
      if (UI.tab === 'loot' && !LOOT.open) LOOT.render(false);
    }
    saveAcc += dt; if (saveAcc >= 10) { saveAcc = 0; saveLocal(); }
    cloudAcc += dt; if (cloudAcc >= 60) { cloudAcc = 0; saveCloud(); }
  }

  /* ---------- Aktionen für die UI ---------- */
  const actions = {
    buyHero() { if (E.buyHero(state, state.settings.buy)) { drain(); UI.update(Date.now(), true); } },
    buyFighter(id) { if (E.buyFighter(state, id, state.settings.buy)) { drain(); UI.update(Date.now(), true); } },
    buyWorker(id) { if (E.buyWorker(state, id, state.settings.buy)) { drain(); UI.update(Date.now(), true); } },
    buyTrain(k) { if (E.buyTrain(state, k, state.settings.buy)) { drain(); UI.update(Date.now(), true); } },
    buyNode(id) {
      if (E.buyNode(state, id)) {
        AU.play('milestone'); haptic(20); drain(); UI.update(Date.now(), true); UI.renderSettings(); saveLocal();
        const n = E.C.tree.find(x => x.id === id); UI.toast(`Seelenbaum: ${n.name} Stufe ${E.tr(state, id)}`, 'gold');
      }
    },
    buyTalent(id) { if (E.buyTalent(state, id)) { AU.play('buy'); UI.update(Date.now(), true); } },
    useSkill(id) { if (E.useSkill(state, id, Date.now())) drain(); },
    setStage(n) { E.setStage(state, n); drain(); UI.hud(Date.now()); },
    challengeBoss() { E.challengeBoss(state); drain(); UI.hud(Date.now()); },
    setBuy(m) { state.settings.buy = m; UI.update(Date.now(), true); },
    setSetting(k, v) {
      state.settings[k] = v;
      if (k === 'sci') FMT.setSci(v);
      if (k === 'sound' || k === 'music') { applyAudio(); if (v) AU.unlock(); }
      if (k === 'theme') applyTheme();
      if (k === 'musicVol' || k === 'sfxVol') applyAudio();
      if (k === 'gfx' || k === 'fx' || k === 'shake' || k === 'numbers' || k === 'eco') { perfSlow = 0; autoLow = false; applyGfx(); }
      if (k === 'haptics' && v) haptic(25);
      UI.update(Date.now(), true); UI.hud(Date.now());
      saveLocal();
    },
    ascend() {
      const gain = E.ascend(state, Date.now());
      if (gain > 0) {
        const evs = state._ev, a = evs.find(ev => ev.t === 'ascend');
        drain(); AR.reset(); UI.rebuild(); UI.showTab('fighters');
        rebirth(gain, a ? a.crystals : E.crystalsFor(gain));
        saveLocal(); saveCloud();
      }
    },
    exportSave() { return encode(saveLocal()); },
    importSave(txt) {
      try {
        const s = E.deserialize(decode(txt));
        s.lastTick = Date.now();
        replaceState(s); saveCloud();
        return true;
      } catch (e) { return false; }
    },
    reset() {
      storageDel();
      const s = E.newState();
      s.settings = Object.assign(s.settings, { sound: state.settings.sound, theme: state.settings.theme, sci: state.settings.sci });
      replaceState(s); saveCloud();
      UI.showTab('fighters');
    }
  };

  /* ---------- Aufstiegs-Animation ---------- */
  function rebirth(gain, crystals) {
    const o = document.createElement('div');
    o.className = 'rebirth';
    o.innerHTML = `<div class="rb-page"></div><div class="rb-text"><b>Neues Heft!</b><span>+${FMT.fmt(gain)} Seelen · +${crystals} Tintenkristalle</span><small>Lauf ${state.ascensions + 1} beginnt – stärker als zuvor.</small></div>`;
    document.body.appendChild(o);
    haptic([40, 60, 120]);
    const w = root.innerWidth, h = root.innerHeight;
    for (let i = 0; i < 4; i++) setTimeout(() => FX.sparkles(w * (0.2 + Math.random() * 0.6), h * (0.3 + Math.random() * 0.3), 14), 300 + i * 220);
    setTimeout(() => o.classList.add('out'), 2600);
    setTimeout(() => o.remove(), 3300);
    o.addEventListener('click', () => { o.classList.add('out'); setTimeout(() => o.remove(), 500); });
  }

  /* ---------- Hauptmenü ---------- */
  function showMenu(then) {
    const m = document.getElementById('menu');
    menuOpen = true; m.hidden = false;
    const s = state;
    document.getElementById('menuPlay').textContent = s.stats.kills > 0 ? 'Weiterspielen' : 'Spiel starten';
    document.getElementById('menuFoot').textContent = s.stats.kills > 0
      ? `Stufe ${s.stage} · Level ${s.level} · ${s.ascensions}× aufgestiegen · Spielzeit ${FMT.dur(s.stats.playTime)}`
      : 'Tippe, klicke oder drücke die Leertaste zum Angreifen. Dein Held kämpft auch allein.';
    const c = document.getElementById('menuArt');
    try { root.KK_ART.portrait(c, 'hero', pal, { ink: true }); } catch (e) { /* nur Deko */ }
    const close = after => {
      if (!menuOpen) return;
      menuOpen = false; m.classList.add('out');
      AU.unlock();
      setTimeout(() => { m.hidden = true; m.classList.remove('out'); }, 260);
      state.lastTick = Date.now();
      if (after) after();
    };
    document.getElementById('menuPlay').onclick = () => close(then);
    document.getElementById('menuSettings').onclick = () => close(() => { then(); UI.showTab('more'); });
    document.getElementById('menuStory').onclick = () => close(() => { if (state.story.seen.intro) ST.play('intro', then); else then(); });
    showMenu.close = close;
  }
  function afterMenu() {
    if (!state.story.seen.intro) story('intro', () => { showOffline(); setTimeout(daily, 300); });
    else { showOffline(); setTimeout(daily, 700); }
  }

  /* ---------- Controller (Gamepad) ---------- */
  const TAB_ORDER = ['fighters', 'workers', 'talents', 'loot', 'ascend', 'more'];
  function pollPads() {
    if (!navigator.getGamepads) return;
    let pads0;
    try { pads0 = navigator.getGamepads(); } catch (e) { return; }
    const gp = pads0 && Array.from(pads0).find(p => p && p.connected);
    if (!gp) return;
    const prev = pads.prev, cur = gp.buttons.map(b => b.pressed || b.value > 0.5);
    const hit = i => cur[i] && !prev[i];
    pads.prev = cur;
    if (!pads.seen) { pads.seen = true; UI.toast('Controller verbunden: A angreifen · X/Y Fähigkeiten · LB/RB Tabs · Steuerkreuz Stufe'); }
    if (menuOpen) { if (hit(0) || hit(9)) showMenu.close(afterMenu); return; }
    if (UI.modalOpen()) { if (hit(0)) { const b = document.querySelector('#modal .actions button:last-child'); if (b) b.click(); } else if (hit(1)) { const b = document.querySelector('#modal .actions button'); if (b) b.click(); } return; }
    if (ST.open || LOOT.open) { if (hit(0) || hit(1)) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return; }
    if (hit(0) || (cur[7] && Math.random() < 0.25)) { const p = AR.enemyPos(); attack(p.x, p.y); }
    if (hit(2)) actions.useSkill(E.D.skills[0].id);
    if (hit(3)) actions.useSkill(E.D.skills[1].id);
    if (hit(6)) actions.useSkill(E.D.skills[2].id);
    if (hit(8)) actions.challengeBoss();
    if (hit(14)) actions.setStage(state.stage - 1);
    if (hit(15)) actions.setStage(state.stage + 1);
    if (hit(4) || hit(5)) {
      const i = Math.max(0, TAB_ORDER.indexOf(UI.tab)), n = (i + (hit(5) ? 1 : TAB_ORDER.length - 1)) % TAB_ORDER.length;
      UI.showTab(TAB_ORDER[n]);
      if (TAB_ORDER[n] === 'loot') LOOT.render(true);
    }
  }

  /* ---------- Eingabe ---------- */
  function attack(x, y) {
    AU.unlock();
    if (x != null) AR.tapFx(x, y);
    E.tap(state, Date.now(), false);
    drain();
  }
  function bindInput() {
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (AR.hitPlane(x, y)) { AU.unlock(); E.catchPlane(state, Date.now()); drain(); return; }
      attack(x, y);
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerdown', () => AU.unlock(), { once: true, capture: true });
    document.addEventListener('keydown', e => {
      if (e.repeat || menuOpen || UI.modalOpen() || ST.open || LOOT.open) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if ((e.code === 'Space' || e.key === 'Enter') && tag !== 'BUTTON') {
        e.preventDefault();
        const p = AR.enemyPos(); attack(p.x, p.y);
      } else if (/^[1-4]$/.test(e.key)) {
        const k = E.D.skills[+e.key - 1]; if (k) actions.useSkill(k.id);
      } else if (e.key === 'ArrowLeft') actions.setStage(state.stage - 1);
      else if (e.key === 'ArrowRight') actions.setStage(state.stage + 1);
      else if (e.key === 'b' || e.key === 'B') actions.challengeBoss();
      else if (e.key === 'Tab') {
        e.preventDefault();
        const i = Math.max(0, TAB_ORDER.indexOf(UI.tab)), n = (i + (e.shiftKey ? TAB_ORDER.length - 1 : 1)) % TAB_ORDER.length;
        UI.showTab(TAB_ORDER[n]); if (TAB_ORDER[n] === 'loot') LOOT.render(true);
      } else if (e.key === 'f' || e.key === 'F') document.getElementById('btnFullscreen').click();
    });
    document.addEventListener('keydown', e => { if (menuOpen && (e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); showMenu.close(afterMenu); } }, true);
    // iOS: Pinch-Zoom und Doppeltipp-Zoom im Spiel verhindern
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => { if (e.target.tagName !== 'TEXTAREA') e.preventDefault(); }, { passive: false });

    const wrap = document.getElementById('arenaWrap');
    if (root.ResizeObserver) new ResizeObserver(() => AR.resize()).observe(wrap);
    else root.addEventListener('resize', () => AR.resize());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { saveLocal(); saveCloud(); AU.suspend(); }
      else { AU.resume(); cloudCheck(); setTimeout(daily, 600); }
    });
    root.addEventListener('pagehide', () => saveLocal());

    const mq = root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)');
    if (mq && mq.addEventListener) mq.addEventListener('change', refreshPalette);
    new MutationObserver(() => refreshPalette()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshPalette).catch(() => {});
  }

  /* ---------- Cloud ---------- */
  async function cloudBoot() {
    const data = await CL.init();
    if (CL.status === 'off') return;
    let loaded = false;
    if (data && typeof data.json === 'string' && data.savedAt > bootSavedAt + 2000) {
      try { replaceState(E.deserialize(data.json)); loaded = true; UI.toast('Spielstand aus der Cloud geladen'); }
      catch (e) { /* defekter Cloud-Stand: lokal weiterspielen */ }
    }
    cloudReady = true;
    if (!loaded) saveCloud();
    if (UI.tab === 'more') UI.renderMore();
  }
  async function cloudCheck() {
    if (!cloudReady || !CL.available || cloudChecking) return;
    cloudChecking = true;
    try {
      const data = await CL.fetch();
      if (data && data.device !== CL.DEVICE && typeof data.json === 'string' && data.savedAt > (state.savedAt || 0) + 2000) {
        replaceState(E.deserialize(data.json));
        UI.toast('Neuerer Spielstand von deinem anderen Gerät geladen');
      }
    } catch (e) { /* ignorieren */ }
    finally { cloudChecking = false; }
  }

  /* ---------- Start ---------- */
  function boot(hot) {
    let s = null;
    const candidates = [hot && hot.save, storageGet()].filter(Boolean);
    for (const raw of candidates) {
      try {
        const c = E.deserialize(raw);
        if (!s || (c.savedAt || 0) > (s.savedAt || 0)) s = c;
      } catch (e) { /* nächster Kandidat */ }
    }
    state = s || E.newState();
    bootSavedAt = state.savedAt || 0;
    FMT.setSci(state.settings.sci);
    applyAudio();
    applyGfx();
    AR.init(canvas, () => state);
    pal = AR.readPalette();
    FX.init(document.getElementById('fx'), document.querySelector('#hudGoldBox .coin'), () => {
      const g = document.getElementById('hudGoldBox'); g.classList.remove('bump'); void g.offsetWidth; g.classList.add('bump');
      AU.play('coin');
    });
    FX.setPalette(pal);
    UI.init(() => state, actions, pal);
    ST.init(pal);
    LOOT.init(() => state, { drain, save: saveLocal, refresh: () => { UI.update(Date.now(), true); UI.hud(Date.now()); } }, pal);
    document.getElementById('tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-tab]');
      if (b && b.dataset.tab === 'loot') { story('loot'); LOOT.render(true); }
    });
    document.getElementById('hudStars').addEventListener('click', () => { UI.showTab('loot'); story('loot'); LOOT.render(true); });
    applyTheme();
    bindInput();
    UI.update(Date.now(), true);
    UI.hud(Date.now());
    root.requestAnimationFrame(frame);
    cloudBoot();
    // Hauptmenü beim Start (im eingebetteten Vorschaumodus ohne Ton-Freigabe genauso)
    if (root.KK_SKIP_MENU) afterMenu(); else showMenu(afterMenu);

    try {
      const h = root.claude && root.claude.hot;
      if (h && typeof h.snapshot === 'function') h.snapshot(() => ({ save: state ? E.serialize(state) : null }));
    } catch (e) { /* optional */ }

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !root.KK_NO_SW && root.top === root) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  // Für Tests und Neugierige in der Konsole: KK_GAME.state
  root.KK_GAME = { get state() { return state; }, actions, saveLocal };

  const hot = root.claude && root.claude.hot;
  if (hot && typeof hot.ready === 'function') hot.ready(d => boot(d || {}));
  else boot((hot && hot.data) || {});
})(window);
