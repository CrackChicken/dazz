/* Kritzelkrieg – Start, Spielschleife, Eingabe, Speichern. */
(function (root) {
  'use strict';
  const E = root.KK, FMT = root.KK_FMT, AR = root.KK_ARENA, UI = root.KK_UI, AU = root.KK_AUDIO, CL = root.KK_CLOUD;
  const KEY = 'kritzelkrieg-save-v1';
  let state = null;
  let lastFrame = 0, hudAcc = 0, uiAcc = 0, saveAcc = 0, cloudAcc = 0;
  let cloudReady = false, cloudChecking = false, bootSavedAt = 0;
  let themeSetByUs = false, pal = null;
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

  /* ---------- Zustand ersetzen ---------- */
  function replaceState(s) {
    state = s;
    AR.reset();
    FMT.setSci(state.settings.sci);
    AU.setEnabled(state.settings.sound);
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
    const capped = off.seconds > off.used;
    UI.modal({
      title: 'Willkommen zurück!',
      body: `<p>Du warst ${FMT.dur(off.seconds)} weg. Deine Strichmännchen haben weitergearbeitet:</p>
        <p class="bigline">+${FMT.fmt(off.gold)} Gold</p>
        <p>+${FMT.fmt(off.xp)} EP · ${FMT.fmt(off.kills)} Gegner besiegt${lv > 0 ? ` · <b>+${lv} Level</b>` : ''}</p>
        <p class="sub">Offline-Effizienz ${Math.round(off.eff * 100)} %${capped ? `, gezählt werden höchstens ${E.B.offlineCapHours} Stunden` : ''}. Das Talent „Träumer“ erhöht sie.</p>`,
      actions: [{ label: 'Einsammeln', onClick: () => AU.play('coin') }]
    });
  }

  /* ---------- Simulation ---------- */
  let bulk = false;
  function stepSim(now) {
    let gap = (now - state.lastTick) / 1000;
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
      case 'tap': if (ev.dmg > 0) AU.play('hit', ev.crit); break;
      case 'kill': AU.play('kill'); AU.play('coin'); break;
      case 'spawn': if (ev.boss) AU.play('boss'); break;
      case 'level': AU.play('level'); break;
      case 'skill': AU.play('skill'); break;
      case 'meteor': AU.play('meteor'); break;
      case 'bossFail': AU.play('fail'); break;
      case 'ach': AU.play('ach'); break;
      case 'ascend': AU.play('ascend'); break;
      case 'buy': AU.play('buy'); break;
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
    }
  }

  function frame(ts) {
    root.requestAnimationFrame(frame);
    if (!state) return;
    const now = Date.now();
    const dt = lastFrame ? Math.min(0.1, Math.max(0, (ts - lastFrame) / 1000)) : 0.016;
    lastFrame = ts;
    stepSim(now);
    drain();
    AR.frame(dt, now);
    UI.campFrame(dt);
    hudAcc += dt; if (hudAcc >= 0.066) { hudAcc = 0; UI.hud(now); }
    uiAcc += dt; if (uiAcc >= 0.25) { uiAcc = 0; UI.update(now); }
    saveAcc += dt; if (saveAcc >= 10) { saveAcc = 0; saveLocal(); }
    cloudAcc += dt; if (cloudAcc >= 60) { cloudAcc = 0; saveCloud(); }
  }

  /* ---------- Aktionen für die UI ---------- */
  const actions = {
    buyHero() { if (E.buyHero(state, state.settings.buy)) { drain(); UI.update(Date.now(), true); } },
    buyFighter(id) { if (E.buyFighter(state, id, state.settings.buy)) { drain(); UI.update(Date.now(), true); } },
    buyWorker(id) { if (E.buyWorker(state, id, state.settings.buy)) { drain(); UI.update(Date.now(), true); } },
    buyTalent(id) { if (E.buyTalent(state, id)) { AU.play('buy'); UI.update(Date.now(), true); } },
    useSkill(id) { if (E.useSkill(state, id, Date.now())) drain(); },
    setStage(n) { E.setStage(state, n); drain(); UI.hud(Date.now()); },
    challengeBoss() { E.challengeBoss(state); drain(); UI.hud(Date.now()); },
    setBuy(m) { state.settings.buy = m; UI.update(Date.now(), true); },
    setSetting(k, v) {
      state.settings[k] = v;
      if (k === 'sci') FMT.setSci(v);
      if (k === 'sound') { AU.setEnabled(v); if (v) AU.unlock(); }
      if (k === 'theme') applyTheme();
      UI.update(Date.now(), true); UI.hud(Date.now());
      saveLocal();
    },
    ascend() {
      const gain = E.ascend(state, Date.now());
      if (gain > 0) {
        drain(); AR.reset(); UI.rebuild(); UI.showTab('fighters');
        UI.toast(`+${FMT.fmt(gain)} Seelen! Neuer Lauf, stärker als zuvor.`, 'gold');
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
      attack(e.clientX - r.left, e.clientY - r.top);
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerdown', () => AU.unlock(), { once: true, capture: true });
    document.addEventListener('keydown', e => {
      if (e.repeat || UI.modalOpen()) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if ((e.code === 'Space' || e.key === 'Enter') && tag !== 'BUTTON') {
        e.preventDefault();
        const p = AR.enemyPos(); attack(p.x, p.y);
      } else if (/^[1-4]$/.test(e.key)) {
        const k = E.D.skills[+e.key - 1]; if (k) actions.useSkill(k.id);
      } else if (e.key === 'ArrowLeft') actions.setStage(state.stage - 1);
      else if (e.key === 'ArrowRight') actions.setStage(state.stage + 1);
    });
    // iOS: Pinch-Zoom und Doppeltipp-Zoom im Spiel verhindern
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => { if (e.target.tagName !== 'TEXTAREA') e.preventDefault(); }, { passive: false });

    const wrap = document.getElementById('arenaWrap');
    if (root.ResizeObserver) new ResizeObserver(() => AR.resize()).observe(wrap);
    else root.addEventListener('resize', () => AR.resize());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { saveLocal(); saveCloud(); }
      else cloudCheck();
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
    AU.setEnabled(state.settings.sound);
    AR.init(canvas, () => state);
    pal = AR.readPalette();
    UI.init(() => state, actions, pal);
    applyTheme();
    bindInput();
    UI.update(Date.now(), true);
    UI.hud(Date.now());
    root.requestAnimationFrame(frame);
    cloudBoot();

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
