/* Kritzelkrieg – Kampfarena (Canvas). Rein kosmetisch: die Spiellogik liegt in engine.js. */
(function (root) {
  'use strict';
  const A = root.KK_ART, E = root.KK, FMT = root.KK_FMT;
  const { POSES, mix, breathe, stick, TAU } = A;

  const ATTACK = {
    brawler: 'punch', sword: 'slash', archer: 'shoot', spear: 'throw', ninja: 'throw', mage: 'cast',
    knight: 'slash', samurai: 'slash', titan: 'slash', chrono: 'cast', dragon: 'throw', god: 'cast',
    robot: 'punch', shadow: 'slash', star: 'slash', origin: 'throw'
  };
  const PUNCH2 = Object.assign({}, POSES.punch, { ua1: 0.5, la1: 2.4, ua2: 1.55, la2: 1.6 });

  let canvas, ctx, getState, dpr = 1, W = 0, H = 0, ground = 0;
  let pal = {};
  let bg = null, bgKey = '';
  let t = 0;
  let reduced = false;
  const L = {}; // Layout
  const hero = { atk: 0, side: 0, cheer: 0 };
  const squad = {}; // id -> {timer, atk, fired}
  const foe = { hit: 0, spawn: 0, j: null, flash: 0 };
  let projs = [], texts = [], parts = [], ghosts = [], meteors = [];
  let shake = 0;

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    pal = {
      paper: g('--paper'), paper2: g('--paper-2'), rule: g('--rule'), margin: g('--margin'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), pencil: g('--pencil'), red: g('--red'),
      gold: g('--gold'), goldInk: g('--gold-ink'), hl: g('--hl'),
      font: g('--font-display') || 'cursive'
    };
    bgKey = '';
    return pal;
  }

  function init(c, gs) {
    canvas = c; ctx = c.getContext('2d'); getState = gs;
    reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    readPalette();
    resize();
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, root.devicePixelRatio || 1);
    W = Math.max(200, r.width); H = Math.max(140, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ground = H * 0.79;
    const k = Math.min(H * 0.95, W * 0.6);
    L.heroH = k * 0.34; L.squadH = k * 0.23; L.foeH = k * 0.34; L.bossH = k * 0.46;
    L.heroX = W * 0.5; L.foeX = W * 0.8;
    L.sqX0 = W * 0.06; L.sqX1 = W * 0.4;
    bgKey = '';
  }

  /* ---------- Hintergrund ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  }
  function wobbleLine(c, x0, x1, y, amp, R) {
    c.beginPath(); c.moveTo(x0, y);
    for (let x = x0; x <= x1; x += 14) c.lineTo(x, y + (R() - 0.5) * amp);
    c.lineTo(x1, y); c.stroke();
  }
  function scribbleCircle(c, x, y, r, R) {
    c.beginPath();
    for (let i = 0; i <= 26; i++) {
      const a = i / 24 * TAU, rr = r * (0.9 + R() * 0.18);
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.stroke();
  }
  const PROPS = {
    sun(c, x, y, r, R) { scribbleCircle(c, x, y, r, R); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; A.line(c, x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75); } },
    cloud(c, x, y, r) { c.beginPath(); c.arc(x - r, y, r * 0.7, Math.PI * 0.5, Math.PI * 1.5); c.arc(x - r * 0.2, y - r * 0.5, r * 0.8, Math.PI, Math.PI * 1.9); c.arc(x + r * 0.8, y - r * 0.1, r * 0.7, Math.PI * 1.3, Math.PI * 0.5); c.closePath(); c.stroke(); },
    tree(c, x, g, h, R) { A.line(c, x, g, x, g - h * 0.55); scribbleCircle(c, x, g - h * 0.75, h * 0.25, R); },
    pine(c, x, g, h) { c.beginPath(); c.moveTo(x, g - h); c.lineTo(x - h * 0.28, g - h * 0.25); c.lineTo(x + h * 0.28, g - h * 0.25); c.closePath(); c.stroke(); A.line(c, x, g - h * 0.25, x, g); },
    cactus(c, x, g, h) { c.beginPath(); c.moveTo(x, g); c.lineTo(x, g - h); c.stroke(); c.beginPath(); c.moveTo(x, g - h * 0.45); c.lineTo(x - h * 0.25, g - h * 0.45); c.lineTo(x - h * 0.25, g - h * 0.75); c.stroke(); c.beginPath(); c.moveTo(x, g - h * 0.6); c.lineTo(x + h * 0.22, g - h * 0.6); c.lineTo(x + h * 0.22, g - h * 0.85); c.stroke(); },
    pyramid(c, x, g, h) { c.beginPath(); c.moveTo(x - h, g); c.lineTo(x, g - h); c.lineTo(x + h, g); c.stroke(); A.line(c, x, g - h, x + h * 0.25, g); },
    mountain(c, x, g, h) { c.beginPath(); c.moveTo(x - h, g); c.lineTo(x, g - h); c.lineTo(x + h, g); c.stroke(); c.beginPath(); c.moveTo(x - h * 0.3, g - h * 0.7); c.lineTo(x - h * 0.1, g - h * 0.6); c.lineTo(x + h * 0.08, g - h * 0.72); c.lineTo(x + h * 0.3, g - h * 0.7); c.stroke(); },
    volcano(c, x, g, h, red) { c.beginPath(); c.moveTo(x - h * 1.1, g); c.lineTo(x - h * 0.25, g - h); c.lineTo(x + h * 0.25, g - h); c.lineTo(x + h * 1.1, g); c.stroke(); c.save(); c.strokeStyle = red; c.beginPath(); c.moveTo(x - h * 0.2, g - h); c.lineTo(x - h * 0.35, g - h * 0.6); c.moveTo(x + h * 0.1, g - h); c.lineTo(x + h * 0.25, g - h * 0.5); c.stroke(); c.restore(); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + i * h * 0.15, g - h * (1.2 + i * 0.25), h * (0.12 + i * 0.05), 0, TAU); c.stroke(); } },
    castle(c, x, g, h) { const w = h * 0.9; c.strokeRect(x - w / 2, g - h * 0.6, w, h * 0.6); for (const tx of [x - w / 2, x + w / 2 - h * 0.22]) { c.strokeRect(tx, g - h, h * 0.22, h * 0.4); A.line(c, tx + h * 0.11, g - h, tx + h * 0.11, g - h * 1.25); c.beginPath(); c.moveTo(tx + h * 0.11, g - h * 1.25); c.lineTo(tx + h * 0.3, g - h * 1.18); c.lineTo(tx + h * 0.11, g - h * 1.1); c.stroke(); } c.beginPath(); c.arc(x, g, h * 0.16, Math.PI, 0); c.stroke(); },
    tomb(c, x, g, h, R) { c.beginPath(); c.moveTo(x - h * 0.3, g); c.lineTo(x - h * 0.3, g - h * 0.7); c.arc(x, g - h * 0.7, h * 0.3, Math.PI, 0); c.lineTo(x + h * 0.3, g); c.stroke(); A.line(c, x - h * 0.12, g - h * 0.6, x + h * 0.12, g - h * 0.6); A.line(c, x, g - h * 0.75, x, g - h * 0.4); },
    moon(c, x, y, r) { c.beginPath(); c.arc(x, y, r, Math.PI * 0.3, Math.PI * 1.7); c.arc(x + r * 0.5, y, r * 0.8, Math.PI * 1.6, Math.PI * 0.4, true); c.stroke(); },
    planet(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(x, y, r * 1.7, r * 0.45, -0.3, 0, TAU); c.stroke(); },
    twinkle(c, x, y, r) { A.line(c, x - r, y, x + r, y); A.line(c, x, y - r, x, y + r); },
    snow(c, x, y, r) { for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; A.line(c, x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r); } }
  };

  function drawBackground(zoneIdx) {
    const key = [zoneIdx, W, H, dpr, pal.paper, pal.ink].join('|');
    if (bg && key === bgKey) return;
    bgKey = key;
    bg = bg || document.createElement('canvas');
    bg.width = canvas.width; bg.height = canvas.height;
    const c = bg.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = pal.paper; c.fillRect(0, 0, W, H);
    // Heftlinien
    c.strokeStyle = pal.rule; c.lineWidth = 1;
    for (let y = 26; y < H; y += 24) A.line(c, 0, y + 0.5, W, y + 0.5);
    c.strokeStyle = pal.margin; c.lineWidth = 1.5;
    A.line(c, 30.5, 0, 30.5, H);
    // Zonen-Doodles
    const R = rng(1000 + zoneIdx * 77);
    c.save();
    c.strokeStyle = pal.pencil; c.globalAlpha = 0.45; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
    // Szenengröße unabhängig vom Seitenverhältnis; Himmel-Positionen relativ zum Boden
    const g = ground, h = Math.min(H, W * 0.7);
    const sy = f => g - (0.79 - f) * h;
    const props = E.D.zones[zoneIdx % E.D.zones.length].props;
    switch (props) {
      case 'meadow':
        PROPS.sun(c, W * 0.88, sy(0.2), h * 0.07, R); PROPS.cloud(c, W * 0.34, sy(0.17), h * 0.06); PROPS.cloud(c, W * 0.62, sy(0.1), h * 0.045);
        PROPS.tree(c, W * 0.2, g, h * 0.42, R); PROPS.tree(c, W * 0.97, g, h * 0.36, R); break;
      case 'desert':
        PROPS.sun(c, W * 0.15, sy(0.18), h * 0.08, R); PROPS.pyramid(c, W * 0.66, g, h * 0.3); PROPS.pyramid(c, W * 0.86, g, h * 0.2);
        PROPS.cactus(c, W * 0.26, g, h * 0.3); PROPS.cactus(c, W * 0.97, g, h * 0.22); break;
      case 'mountain':
        PROPS.mountain(c, W * 0.3, g, h * 0.5); PROPS.mountain(c, W * 0.68, g, h * 0.62); PROPS.mountain(c, W * 0.95, g, h * 0.4);
        PROPS.pine(c, W * 0.12, g, h * 0.3); PROPS.pine(c, W * 0.9, g, h * 0.24);
        for (let i = 0; i < 9; i++) PROPS.snow(c, R() * W, sy(R() * 0.5), 3 + R() * 3); break;
      case 'volcano':
        PROPS.volcano(c, W * 0.66, g, h * 0.45, pal.red); PROPS.cloud(c, W * 0.25, sy(0.15), h * 0.05);
        for (let i = 0; i < 4; i++) PROPS.pyramid(c, W * (0.08 + i * 0.27), g, h * 0.06); break;
      case 'castle':
        PROPS.castle(c, W * 0.7, g, h * 0.42); PROPS.cloud(c, W * 0.25, sy(0.14), h * 0.05); PROPS.tree(c, W * 0.96, g, h * 0.3, R); break;
      case 'graveyard':
        PROPS.moon(c, W * 0.85, sy(0.18), h * 0.07); PROPS.tomb(c, W * 0.62, g, h * 0.16); PROPS.tomb(c, W * 0.93, g, h * 0.13); PROPS.tomb(c, W * 0.25, g, h * 0.12);
        A.line(c, W * 0.12, g, W * 0.12, g - h * 0.38); A.line(c, W * 0.12, g - h * 0.25, W * 0.16, g - h * 0.33); A.line(c, W * 0.12, g - h * 0.3, W * 0.08, g - h * 0.36); break;
      case 'space':
        PROPS.planet(c, W * 0.8, sy(0.22), h * 0.06); PROPS.planet(c, W * 0.3, sy(0.12), h * 0.035);
        for (let i = 0; i < 18; i++) PROPS.twinkle(c, R() * W, g - R() * (g - 10), 2 + R() * 3); break;
    }
    c.restore();
    // Boden
    c.strokeStyle = pal.ink; c.lineWidth = 2; c.lineCap = 'round';
    wobbleLine(c, 0, W, g, 2.5, R);
    c.strokeStyle = pal.pencil; c.lineWidth = 1.2; c.globalAlpha = 0.6;
    for (let i = 0; i < 26; i++) {
      const x = R() * W, y = g + 4 + R() * (H - g - 8);
      A.line(c, x, y, x + 5 + R() * 8, y);
    }
    c.globalAlpha = 1;
  }

  /* ---------- Effekte ---------- */
  function text(x, y, str, o) {
    if (texts.length > 36) texts.shift();
    texts.push(Object.assign({ x, y, str, vy: -46, life: 0.9, t: 0, size: 18, color: pal.ink, jitter: 0 }, o));
  }
  function splat(x, y, color, n) {
    for (let i = 0; i < (reduced ? 3 : n || 6); i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 140;
      parts.push({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.28, t: 0, color });
    }
  }
  function enemyCenter() {
    const s = getState();
    const h = s.enemy && s.enemy.boss ? L.bossH : L.foeH;
    return { x: L.foeX, y: ground - h * 0.6, h };
  }
  function enemyPos() { const c = enemyCenter(); return { x: c.x, y: c.y }; }

  function shoot(f, from, dmg, showNum) {
    const c = enemyCenter();
    const kind = f.shot;
    const tx = c.x - 8 + Math.random() * 16, ty = c.y - c.h * 0.1 + Math.random() * c.h * 0.3;
    const instant = kind === 'bolt' || kind === 'laser';
    const arc = { spear: 0.25, boulder: 0.5, ink: 0.45, shuriken: 0.08, fire: 0.05, arrow: 0.12, clock: 0.15, star: 0.1, shadow: 0.05 }[kind] || 0;
    projs.push({ kind, x0: from.x, y0: from.y, x1: tx, y1: ty, t: 0, dur: instant ? 0.16 : 0.32 + Math.abs(tx - from.x) / (W * 1.6), arc, dmg, showNum, instant, hit: false, spin: Math.random() * TAU });
  }

  function onEvent(ev, bulk) {
    const s = getState();
    if (bulk && ev.t !== 'spawn') return;
    const c = enemyCenter();
    switch (ev.t) {
      case 'tap': {
        if (ev.auto) {
          ghosts.push({ t: 0, life: 0.22, x: c.x - L.foeH * (0.55 + Math.random() * 0.25), side: Math.random() < 0.5 ? 1 : 0, flip: Math.random() < 0.3 });
        } else {
          hero.atk = 0.2; hero.side ^= 1;
        }
        if (ev.dmg > 0) {
          foe.hit = 0.12; foe.flash = 0.08;
          const x = c.x + (Math.random() - 0.5) * c.h * 0.8, y = c.y - c.h * (0.2 + Math.random() * 0.35);
          if (ev.crit) { text(x, y - 10, 'KRIT ' + FMT.fmt(ev.dmg), { color: pal.red, size: 26, life: 1.1, jitter: 1 }); shake = Math.max(shake, 4); splat(c.x, c.y, pal.red, 10); }
          else text(x, y, FMT.fmt(ev.dmg), { color: pal.ink, size: ev.auto ? 14 : 19 });
          splat(c.x - c.h * 0.15, c.y, pal.ink, ev.auto ? 2 : 5);
        }
        break;
      }
      case 'kill': {
        breakApart(ev.boss);
        const n = reduced ? 3 : Math.max(3, Math.min(10, 3 + Math.floor(Math.log10(Math.max(1, ev.gold)) / 2)));
        for (let i = 0; i < n; i++) {
          parts.push({ k: 'coin', x: c.x, y: c.y, vx: (Math.random() - 0.3) * 220, vy: -180 - Math.random() * 200, life: 1.2, t: 0, home: 0.35 + Math.random() * 0.2 });
        }
        text(c.x + (Math.random() - 0.5) * c.h * 0.6, c.y - c.h * (0.6 + Math.random() * 0.3), '+' + FMT.fmt(ev.gold), { color: pal.goldInk, size: ev.boss ? 26 : 18, vy: -34, life: 1.1 });
        if (ev.boss) shake = Math.max(shake, 8);
        break;
      }
      case 'spawn':
        foe.spawn = 0.3; foe.j = null;
        if (ev.boss && !bulk) { text(W * 0.5, H * 0.32, 'BOSS!', { color: pal.red, size: 40, vy: -10, life: 1.3, jitter: 1.5 }); shake = Math.max(shake, 6); }
        break;
      case 'level':
        hero.cheer = 0.9;
        text(L.heroX, ground - L.heroH * 1.25, 'LEVEL ' + ev.level + '!', { color: pal.goldInk, size: 24, vy: -24, life: 1.5 });
        for (let i = 0; i < 12; i++) parts.push({ k: 'star', x: L.heroX + (Math.random() - 0.5) * L.heroH, y: ground - Math.random() * L.heroH, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 80, life: 1, t: 0 });
        break;
      case 'meteor':
        meteors.push({ t: 0, dur: 0.45, dmg: ev.dmg });
        break;
      case 'bossFail':
        text(W * 0.5, H * 0.35, 'Zeit abgelaufen!', { color: pal.red, size: 26, vy: -14, life: 1.6 });
        break;
      case 'ascend':
        for (let i = 0; i < 40; i++) parts.push({ k: 'star', x: Math.random() * W, y: H * (0.3 + Math.random() * 0.6), vx: 0, vy: -40 - Math.random() * 120, life: 1.6, t: 0 });
        break;
    }
  }

  function breakApart(boss) {
    const j = foe.j;
    if (!j) return;
    const segs = [[j.hip, j.neck], [j.sh, j.elb1], [j.elb1, j.hand1], [j.sh, j.elb2], [j.elb2, j.hand2], [j.hip, j.knee1], [j.knee1, j.foot1], [j.hip, j.knee2], [j.knee2, j.foot2]];
    for (const [a, b] of segs) {
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      parts.push({ k: 'seg', x: cx, y: cy, dx: (b.x - a.x) / 2, dy: (b.y - a.y) / 2, vx: 40 + Math.random() * 200, vy: -120 - Math.random() * 260, rot: 0, vr: (Math.random() - 0.5) * 14, life: 1.0, t: 0, lw: j.lw * (boss ? 1.4 : 1) });
    }
    parts.push({ k: 'head', x: j.head.x, y: j.head.y, r: j.head.r, vx: 80 + Math.random() * 160, vy: -260 - Math.random() * 120, rot: 0, vr: 6, life: 1.1, t: 0, lw: j.lw });
  }

  /* ---------- Zeichnen ---------- */
  function attackPose(kind, p, idle) {
    let a, b;
    switch (kind) {
      case 'punch': a = POSES.guard; b = POSES.punch; break;
      case 'slash': a = POSES.raise; b = POSES.slash; break;
      case 'shoot': a = POSES.aim; b = POSES.aim; break;
      case 'throw': a = POSES.windup; b = POSES.throw; break;
      default: a = POSES.cast; b = POSES.cast;
    }
    if (p < 0.4) return mix(idle, a, p / 0.4);
    if (p < 0.55) return mix(a, b, (p - 0.4) / 0.15);
    return mix(b, idle, (p - 0.55) / 0.45);
  }

  function squadLayout(s) {
    const owned = E.D.fighters.filter(f => s.fighters[f.id] > 0);
    const n = owned.length;
    const cols = Math.max(1, Math.ceil(n / 2));
    const span = L.sqX1 - L.sqX0;
    const sp = Math.min(L.squadH * 0.75, span / cols);
    return owned.map((f, i) => {
      const col = Math.floor(i / 2), back = i % 2 === 1;
      const x = L.sqX1 - col * sp - (back ? sp * 0.5 : 0);
      return { f, x, y: back ? ground - L.squadH * 0.12 : ground, h: L.squadH * (back ? 0.9 : 1), back };
    });
  }

  function frame(dt, now) {
    const s = getState();
    t += dt;
    const zoneIdx = Math.floor((s.stage - 1) / 10);
    drawBackground(zoneIdx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(bg, 0, 0, W, H);

    let sx = 0, sy = 0;
    if (shake > 0 && !reduced) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; }
    shake = Math.max(0, shake - dt * 30);
    ctx.save();
    ctx.translate(sx, sy);

    const rage = E.active(s, 'rage', now);
    const rush = E.active(s, 'goldrush', now);

    // Trupp
    const lay = squadLayout(s);
    const showP = Math.min(1, 4 / Math.max(1, lay.length));
    for (const m of lay.filter(m => m.back).concat(lay.filter(m => !m.back))) {
      const id = m.f.id;
      const st = squad[id] || (squad[id] = { timer: Math.random() * m.f.every, atk: -1, fired: false });
      st.timer -= dt;
      if (st.timer <= 0 && s.enemy && s.spawnTimer <= 0) { st.timer = m.f.every * (0.85 + Math.random() * 0.3) / (rage ? 1.6 : 1); st.atk = 0; st.fired = false; }
      const kind = ATTACK[m.f.look] || 'punch';
      const base = kind === 'punch' ? POSES.guard : POSES.idle;
      let pose = breathe(base, t * 0.8 + m.x * 0.01, 0.04);
      if (st.atk >= 0) {
        st.atk += dt / 0.36;
        if (st.atk >= 0.45 && !st.fired) {
          st.fired = true;
          const dmg = E.fighterDps(s, id, now) * m.f.every;
          shoot(m.f, { x: m.x + m.h * 0.3, y: m.y - m.h * 0.62 }, dmg, Math.random() < showP);
        }
        if (st.atk >= 1) st.atk = -1; else pose = attackPose(kind, st.atk, pose);
      }
      const o = A.looks(m.f.look, pal, pal.pencil);
      o.dir = 1;
      if (rage) aura(m.x, m.y, m.h, 0.6);
      if (m.f.look === 'titan' || m.f.look === 'origin') stick(ctx, m.x, m.y, m.h * 1.25, pose, o);
      else stick(ctx, m.x, m.y, m.h, pose, o);
    }

    // Held
    {
      let pose = breathe(POSES.guard, t * 0.9, 0.05), lunge = 0;
      if (hero.atk > 0) {
        hero.atk -= dt;
        const p = 1 - Math.max(0, hero.atk) / 0.2, k = Math.sin(Math.PI * p);
        pose = mix(pose, hero.side ? PUNCH2 : POSES.punch, k);
        lunge = k * (L.foeX - L.heroX - L.foeH * 0.55);
      } else if (hero.cheer > 0) {
        hero.cheer -= dt;
        pose = mix(pose, POSES.cheer, Math.min(1, hero.cheer * 3));
      }
      if (rage) aura(L.heroX + lunge, ground, L.heroH, 1);
      stick(ctx, L.heroX + lunge, ground, L.heroH, pose, Object.assign(A.looks('hero', pal), { dir: 1, lw: Math.max(2, L.heroH * 0.05) }));
    }

    // Schattenklone
    for (const g of ghosts) {
      g.t += dt;
      const k = Math.sin(Math.PI * Math.min(1, g.t / g.life));
      ctx.save(); ctx.globalAlpha = 0.35 * (1 - g.t / g.life) + 0.15;
      stick(ctx, g.x, ground, L.heroH * 0.9, mix(POSES.guard, g.side ? PUNCH2 : POSES.punch, k), Object.assign(A.looks('hero', pal), { dir: 1 }));
      ctx.restore();
    }
    ghosts = ghosts.filter(g => g.t < g.life);

    // Gegner
    if (s.enemy && s.spawnTimer <= 0 && s.enemy.hp > 0) {
      const e = s.enemy;
      const h = e.boss ? L.bossH : L.foeH;
      foe.spawn = Math.max(0, foe.spawn - dt);
      foe.hit = Math.max(0, foe.hit - dt);
      foe.flash = Math.max(0, foe.flash - dt);
      let pose = breathe(e.boss ? POSES.guard : POSES.idle, t * 0.7 + 0.3, 0.05);
      if (foe.hit > 0) pose = mix(pose, POSES.hurt, Math.min(1, foe.hit / 0.06));
      const drop = foe.spawn > 0 ? -(foe.spawn / 0.3) * h * 1.2 : 0;
      const kx = foe.hit * 60;
      const o = A.enemyLook(e.seed, e.boss, pal);
      o.dir = -1;
      if (foe.flash > 0) o.lw = Math.max(2, h * 0.06);
      ctx.save();
      if (foe.spawn > 0) ctx.globalAlpha = 1 - foe.spawn / 0.3;
      foe.j = stick(ctx, L.foeX + kx, ground + drop, h, pose, o);
      ctx.restore();
      hpBar(e, L.foeX, ground - h * 1.18 + drop, h);
    }

    // Projektile
    for (const p of projs) {
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      const x = p.x0 + (p.x1 - p.x0) * k;
      const y = p.y0 + (p.y1 - p.y0) * k - Math.sin(Math.PI * k) * p.arc * W * 0.3;
      p.ang = p.lx != null && (x !== p.lx || y !== p.ly) ? Math.atan2(y - p.ly, x - p.lx) : (p.ang != null ? p.ang : Math.atan2(p.y1 - p.y0, p.x1 - p.x0));
      p.lx = x; p.ly = y;
      drawProj(p, x, y, k);
      if (k >= 1 && !p.hit) {
        p.hit = true;
        if (s.enemy && s.enemy.hp > 0 && s.spawnTimer <= 0) {
          foe.hit = Math.max(foe.hit, 0.06);
          if (p.showNum && p.dmg > 0) text(p.x1 + (Math.random() - 0.5) * 20, p.y1 - 12, FMT.fmt(p.dmg), { color: pal.pencil, size: 13, life: 0.7 });
        }
        splat(p.x1, p.y1, p.kind === 'fireball' || p.kind === 'fire' || p.kind === 'bolt' ? pal.gold : pal.pencil, 3);
      }
    }
    projs = projs.filter(p => p.t < p.dur + 0.02);

    // Meteor
    for (const m of meteors) {
      m.t += dt;
      const c = enemyCenter();
      const k = Math.min(1, m.t / m.dur);
      const x = c.x + (1 - k) * W * 0.15, y = -40 + (c.y + 40) * k;
      ctx.save(); ctx.fillStyle = pal.ink;
      ctx.beginPath(); ctx.arc(x, y, L.foeH * 0.22, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) A.line(ctx, x + 10 + i * 6, y - 20 - i * 10, x + 30 + i * 10, y - 60 - i * 14);
      ctx.restore();
      if (k >= 1 && !m.done) {
        m.done = true; shake = 14;
        splat(c.x, c.y, pal.ink, 24);
        text(c.x, c.y - c.h * 0.8, FMT.fmt(m.dmg), { color: pal.ink, size: 34, life: 1.4, jitter: 1 });
      }
    }
    meteors = meteors.filter(m => m.t < m.dur + 0.05);

    // Goldrausch-Glitzer
    if (rush && Math.random() < dt * 14) parts.push({ k: 'coin', x: Math.random() * W, y: ground, vx: 0, vy: -90 - Math.random() * 90, life: 0.9, t: 0, home: 99 });

    drawParts(dt);
    drawTexts(dt);
    ctx.restore();
  }

  function aura(x, y, h, a) {
    ctx.save(); ctx.strokeStyle = pal.red; ctx.globalAlpha = 0.5 * a; ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const yy = y - h * (0.2 + i * 0.2) + Math.sin(t * 20 + i) * 2;
      A.line(ctx, x - h * 0.45, yy, x - h * 0.75 - Math.random() * h * 0.2, yy);
    }
    ctx.restore();
  }

  function hpBar(e, x, y, h) {
    const w = Math.max(70, h * 1.25), bh = 9;
    const k = Math.max(0, e.hp / e.maxHp);
    const left = x - w / 2;
    ctx.save();
    ctx.lineWidth = 1.6; ctx.strokeStyle = pal.red;
    // Schraffur als Füllung
    ctx.beginPath(); ctx.rect(left, y, w * k, bh); ctx.clip();
    ctx.lineWidth = 1.6;
    for (let i = -bh; i < w; i += 4) A.line(ctx, left + i, y + bh, left + i + bh, y);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = pal.red; ctx.lineWidth = 1.8; ctx.strokeRect(left, y, w, bh);
    ctx.fillStyle = pal.red; ctx.font = `13px ${pal.font}`; ctx.textAlign = 'center';
    ctx.fillText(FMT.fmt(Math.max(0, e.hp)), x, y - 4);
    if (e.boss) { ctx.font = `16px ${pal.font}`; ctx.fillText(e.name, x, y - 22); }
    ctx.restore();
  }

  function drawProj(p, x, y, k) {
    const c = ctx; c.save(); c.lineCap = 'round';
    const col = pal.pencil;
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2;
    const ang = p.ang;
    switch (p.kind) {
      case 'pow': case 'wave':
        c.beginPath(); c.arc(x, y, p.kind === 'wave' ? 12 : 7, -1.1, 1.1); c.stroke(); break;
      case 'slash': case 'slash2':
        c.beginPath(); c.arc(x, y, 10, -1.2, 1.2); c.stroke();
        if (p.kind === 'slash2') { c.beginPath(); c.arc(x - 7, y, 10, -1.2, 1.2); c.stroke(); } break;
      case 'arrow': case 'spear': {
        const len = p.kind === 'spear' ? 26 : 16;
        const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
        A.line(c, x - dx, y - dy, x, y);
        c.beginPath(); c.moveTo(x + Math.cos(ang) * 5, y + Math.sin(ang) * 5); c.lineTo(x + Math.cos(ang + 2.5) * 5, y + Math.sin(ang + 2.5) * 5); c.lineTo(x + Math.cos(ang - 2.5) * 5, y + Math.sin(ang - 2.5) * 5); c.closePath(); c.fill();
        break;
      }
      case 'shuriken': case 'star': {
        c.translate(x, y); c.rotate(p.spin + p.t * 18);
        A.star(c, 0, 0, p.kind === 'star' ? 8 : 6, p.kind === 'star' ? pal.gold : pal.paper);
        break;
      }
      case 'fireball': case 'fire':
        c.fillStyle = pal.gold; c.strokeStyle = pal.red;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x - Math.cos(ang) * i * 6, y - Math.sin(ang) * i * 6, (p.kind === 'fire' ? 7 : 6) - i * 1.6, 0, TAU); c.fill(); c.stroke(); }
        break;
      case 'boulder': case 'ink': case 'shadow':
        c.fillStyle = p.kind === 'boulder' ? pal.pencil : pal.ink;
        c.beginPath(); c.arc(x, y, p.kind === 'ink' ? 10 : 8, 0, TAU); c.fill(); break;
      case 'clock':
        c.fillStyle = pal.paper; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); c.stroke();
        A.line(c, x, y, x + Math.cos(p.t * 12) * 6, y + Math.sin(p.t * 12) * 6); A.line(c, x, y, x, y - 4); break;
      case 'bolt': {
        c.strokeStyle = pal.gold; c.lineWidth = 3;
        c.beginPath(); let yy = 0, xx = p.x1; c.moveTo(xx, yy);
        while (yy < p.y1) { yy += 18; xx = p.x1 + (Math.random() - 0.5) * 18; c.lineTo(xx, Math.min(yy, p.y1)); }
        c.stroke(); break;
      }
      case 'laser':
        c.strokeStyle = pal.red; c.lineWidth = 2.5; c.globalAlpha = 1 - k * 0.6; A.line(c, p.x0, p.y0, p.x1, p.y1); break;
      default:
        c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill();
    }
    c.restore();
  }

  function drawParts(dt) {
    const homeX = 18, homeY = 16;
    for (const p of parts) {
      p.t += dt;
      if (p.k === 'coin' && p.t > p.home) {
        const k = Math.min(1, (p.t - p.home) * 3.2);
        p.x += (homeX - p.x) * k; p.y += (homeY - p.y) * k;
        if (Math.hypot(homeX - p.x, homeY - p.y) < 10) p.t = p.life;
      } else {
        p.vy += (p.k === 'spark' ? 0 : p.k === 'star' ? -20 : 900) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if ((p.k === 'seg' || p.k === 'head' || p.k === 'coin') && p.y > ground - 2) { p.y = ground - 2; p.vy *= -0.35; p.vx *= 0.6; p.vr = (p.vr || 0) * 0.5; }
      }
      if (p.vr) p.rot += p.vr * dt;
      const a = Math.max(0, 1 - Math.max(0, p.t - p.life * 0.6) / (p.life * 0.4));
      ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
      switch (p.k) {
        case 'spark': ctx.strokeStyle = p.color; ctx.lineWidth = 2; A.line(ctx, p.x, p.y, p.x - p.vx * 0.04, p.y - p.vy * 0.04); break;
        case 'coin': ctx.fillStyle = pal.gold; ctx.strokeStyle = pal.goldInk; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 5 * Math.abs(Math.cos(p.t * 9)) + 1, 0, 0, TAU); ctx.fill(); ctx.stroke(); break;
        case 'star': A.star(ctx, p.x, p.y, 4, pal.gold); break;
        case 'seg': {
          ctx.strokeStyle = pal.red; ctx.lineWidth = p.lw;
          const c = Math.cos(p.rot), s = Math.sin(p.rot);
          const dx = p.dx * c - p.dy * s, dy = p.dx * s + p.dy * c;
          A.line(ctx, p.x - dx, p.y - dy, p.x + dx, p.y + dy); break;
        }
        case 'head': ctx.strokeStyle = pal.red; ctx.lineWidth = p.lw; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke(); break;
      }
      ctx.restore();
    }
    parts = parts.filter(p => p.t < p.life);
    if (parts.length > 260) parts.splice(0, parts.length - 260);
  }

  function drawTexts(dt) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const x of texts) {
      x.t += dt; x.y += x.vy * dt; x.vy *= 0.97;
      const a = Math.max(0, 1 - Math.max(0, x.t - x.life * 0.55) / (x.life * 0.45));
      const pop = x.t < 0.12 ? 0.7 + x.t / 0.12 * 0.4 : 1.1 - Math.min(0.1, (x.t - 0.12));
      ctx.globalAlpha = a;
      ctx.font = `${Math.round(x.size * pop)}px ${pal.font}`;
      const jx = x.jitter ? (Math.random() - 0.5) * x.jitter * 2 : 0;
      ctx.lineWidth = 4; ctx.strokeStyle = pal.paper; ctx.lineJoin = 'round';
      ctx.strokeText(x.str, x.x + jx, x.y);
      ctx.fillStyle = x.color; ctx.fillText(x.str, x.x + jx, x.y);
    }
    ctx.restore();
    texts = texts.filter(x => x.t < x.life);
  }

  function tapFx(x, y) {
    splat(x, y, pal.ink, 4);
    parts.push({ k: 'spark', x, y, vx: 0, vy: 0, life: 0.01, t: 0, color: pal.ink });
  }

  function reset() { projs = []; texts = []; parts = []; ghosts = []; meteors = []; for (const k in squad) delete squad[k]; foe.j = null; }

  root.KK_ARENA = { init, resize, frame, onEvent, tapFx, enemyPos, readPalette, reset };
})(window);
