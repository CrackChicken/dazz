/* Kritzelkrieg – Kampfarena (Canvas). Rein kosmetisch: die Spiellogik liegt in engine.js. */
(function (root) {
  'use strict';
  const A = root.KK_ART, E = root.KK, FMT = root.KK_FMT, MON = root.KK_MON;
  const { POSES, mix, breathe, stick, TAU } = A;
  const rgba = MON.rgba;
  const snd = (n, a) => root.KK_AUDIO && root.KK_AUDIO.play(n, a);
  const fx = () => root.KK_FX;

  const ATTACK = {
    brawler: 'punch', sword: 'slash', archer: 'shoot', spear: 'throw', ninja: 'throw', mage: 'cast',
    knight: 'slash', samurai: 'slash', titan: 'slash', chrono: 'cast', dragon: 'throw', god: 'cast',
    robot: 'punch', shadow: 'slash', star: 'slash', origin: 'throw'
  };
  const MOB_ZONE_COLOR = ['red', 'orange', 'blue', 'red', 'brown', 'purple', 'teal'];
  const PUNCH2 = Object.assign({}, POSES.punch, { ua1: 0.5, la1: 2.4, ua2: 1.55, la2: 1.6 });
  const MARKERS = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'brown'];

  let canvas, ctx, getState, dpr = 1, W = 0, H = 0, ground = 0;
  let pal = { m: {} };
  let bg = null, bgKey = '';
  let t = 0, reduced = false;
  const L = {};
  const hero = { atk: 0, side: 0, cheer: 0, hurt: 0, pillar: 0 };
  const squad = {};
  const foe = { hit: 0, spawn: 0, res: null, atk: -1, atkTimer: 3, breath: 0, beam: 0 };
  let projs = [], eprojs = [], texts = [], parts = [], ghosts = [], meteors = [], ambient = [], chests = [], ripples = [];
  let shake = 0, flash = 0, flashColor = '#fff', slowT = 0, intro = null;

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    pal = {
      paper: g('--paper'), paper2: g('--paper-2'), rule: g('--rule'), margin: g('--margin'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), pencil: g('--pencil'), red: g('--red'),
      gold: g('--gold'), goldInk: g('--gold-ink'), hl: g('--hl'),
      font: g('--font-display') || 'cursive', dark: cs.colorScheme === 'dark' || g('color-scheme') === 'dark', m: {}
    };
    for (const k of MARKERS) pal.m[k] = g('--m-' + k) || pal.red;
    pal.dark = matchDark();
    bgKey = '';
    if (fx()) fx().setPalette(pal);
    return pal;
  }
  function matchDark() {
    const th = document.documentElement.getAttribute('data-theme');
    if (th) return th === 'dark';
    return root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches;
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
    L.k = k;
    L.heroH = k * 0.34; L.squadH = k * 0.23; L.foeH = k * 0.34; L.bossH = k * 0.52;
    L.heroX = W * 0.48; L.foeX = W * 0.79;
    L.sqX0 = W * 0.06; L.sqX1 = W * 0.38;
    bgKey = '';
  }

  /* ---------- Hintergrund ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  }
  const soft = (col, k) => A.soft(pal, col, k);
  function fs(c, fill, stroke, lw) { if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
  function scribbleCircle(c, x, y, r, R) {
    c.beginPath();
    for (let i = 0; i <= 26; i++) { const a = i / 24 * TAU, rr = r * (0.9 + R() * 0.18); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }
  const P = {
    sun(c, x, y, r, R) {
      c.save(); c.globalAlpha = 0.35; c.fillStyle = pal.m.yellow; c.beginPath(); c.arc(x, y, r * 2.1, 0, TAU); c.fill(); c.restore();
      scribbleCircle(c, x, y, r, R); fs(c, soft(pal.m.yellow, 0.75), pal.m.orange, 2.2);
      c.strokeStyle = pal.m.orange; c.lineWidth = 2.2;
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; A.line(c, x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, x + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 1.8); }
    },
    cloud(c, x, y, r) {
      c.beginPath(); c.arc(x - r, y, r * 0.7, Math.PI * 0.5, Math.PI * 1.5); c.arc(x - r * 0.2, y - r * 0.5, r * 0.8, Math.PI, Math.PI * 1.9); c.arc(x + r * 0.8, y - r * 0.1, r * 0.7, Math.PI * 1.3, Math.PI * 0.5); c.closePath();
      fs(c, pal.dark ? soft(pal.m.blue, 0.25) : '#ffffff', soft(pal.m.blue, 0.7), 1.8);
    },
    tree(c, x, g, h, R) {
      c.strokeStyle = pal.m.brown; c.lineWidth = 3; A.line(c, x, g, x, g - h * 0.55);
      scribbleCircle(c, x, g - h * 0.75, h * 0.26, R); fs(c, soft(pal.m.green, 0.5), pal.m.green, 2.2);
      c.fillStyle = pal.m.red; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + (R() - 0.5) * h * 0.3, g - h * 0.75 + (R() - 0.5) * h * 0.3, h * 0.025, 0, TAU); c.fill(); }
    },
    pine(c, x, g, h) {
      c.beginPath(); c.moveTo(x, g - h); c.lineTo(x - h * 0.28, g - h * 0.25); c.lineTo(x + h * 0.28, g - h * 0.25); c.closePath();
      fs(c, soft(pal.m.green, 0.45), pal.m.green, 2); c.strokeStyle = pal.m.brown; A.line(c, x, g - h * 0.25, x, g);
    },
    cactus(c, x, g, h) {
      c.strokeStyle = pal.m.green; c.lineWidth = Math.max(5, h * 0.08); c.lineCap = 'round';
      A.line(c, x, g, x, g - h); c.beginPath(); c.moveTo(x, g - h * 0.45); c.lineTo(x - h * 0.25, g - h * 0.45); c.lineTo(x - h * 0.25, g - h * 0.75); c.stroke();
      c.beginPath(); c.moveTo(x, g - h * 0.6); c.lineTo(x + h * 0.22, g - h * 0.6); c.lineTo(x + h * 0.22, g - h * 0.85); c.stroke();
      c.fillStyle = pal.m.pink; c.beginPath(); c.arc(x, g - h - 3, 4, 0, TAU); c.fill();
    },
    pyramid(c, x, g, h) {
      c.beginPath(); c.moveTo(x - h, g); c.lineTo(x, g - h); c.lineTo(x + h, g); c.closePath(); fs(c, soft(pal.m.yellow, 0.45), pal.m.orange, 2);
      c.beginPath(); c.moveTo(x, g - h); c.lineTo(x + h * 0.25, g); c.lineTo(x + h, g); c.closePath(); fs(c, soft(pal.m.orange, 0.35));
    },
    mountain(c, x, g, h) {
      c.beginPath(); c.moveTo(x - h, g); c.lineTo(x, g - h); c.lineTo(x + h, g); c.closePath(); fs(c, soft(pal.m.blue, 0.35), pal.m.blue, 2);
      c.beginPath(); c.moveTo(x - h * 0.3, g - h * 0.7); c.lineTo(x, g - h); c.lineTo(x + h * 0.3, g - h * 0.7); c.lineTo(x + h * 0.1, g - h * 0.62); c.lineTo(x - h * 0.08, g - h * 0.72); c.closePath();
      fs(c, '#ffffff', pal.m.blue, 1.5);
    },
    volcano(c, x, g, h) {
      c.save(); c.globalAlpha = 0.35; c.fillStyle = pal.m.orange; c.beginPath(); c.arc(x, g - h, h * 0.4, 0, TAU); c.fill(); c.restore();
      c.beginPath(); c.moveTo(x - h * 1.1, g); c.lineTo(x - h * 0.25, g - h); c.lineTo(x + h * 0.25, g - h); c.lineTo(x + h * 1.1, g); c.closePath();
      fs(c, soft(pal.m.brown, 0.45), pal.m.brown, 2.2);
      c.strokeStyle = pal.m.red; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - h * 0.15, g - h); c.quadraticCurveTo(x - h * 0.3, g - h * 0.7, x - h * 0.45, g - h * 0.4); c.stroke();
      c.beginPath(); c.moveTo(x + h * 0.1, g - h); c.quadraticCurveTo(x + h * 0.2, g - h * 0.75, x + h * 0.35, g - h * 0.5); c.stroke();
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + i * h * 0.15, g - h * (1.2 + i * 0.25), h * (0.12 + i * 0.05), 0, TAU); fs(c, soft(pal.pencil, 0.25), pal.pencil, 1.5); }
    },
    castle(c, x, g, h) {
      const w = h * 0.9;
      c.beginPath(); c.rect(x - w / 2, g - h * 0.6, w, h * 0.6); fs(c, soft(pal.pencil, 0.25), pal.pencil, 2);
      for (const tx of [x - w / 2, x + w / 2 - h * 0.22]) {
        c.beginPath(); c.rect(tx, g - h, h * 0.22, h * 0.4); fs(c, soft(pal.pencil, 0.3), pal.pencil, 2);
        c.strokeStyle = pal.pencil; A.line(c, tx + h * 0.11, g - h, tx + h * 0.11, g - h * 1.25);
        c.beginPath(); c.moveTo(tx + h * 0.11, g - h * 1.25); c.lineTo(tx + h * 0.32, g - h * 1.18); c.lineTo(tx + h * 0.11, g - h * 1.1); c.closePath(); fs(c, tx < x ? pal.m.red : pal.m.blue);
      }
      c.beginPath(); c.arc(x, g, h * 0.16, Math.PI, 0); fs(c, soft(pal.m.brown, 0.5), pal.m.brown, 2);
    },
    tomb(c, x, g, h) {
      c.beginPath(); c.moveTo(x - h * 0.3, g); c.lineTo(x - h * 0.3, g - h * 0.7); c.arc(x, g - h * 0.7, h * 0.3, Math.PI, 0); c.lineTo(x + h * 0.3, g); c.closePath();
      fs(c, soft(pal.pencil, 0.3), pal.m.purple, 2);
      c.strokeStyle = pal.m.purple; A.line(c, x - h * 0.12, g - h * 0.6, x + h * 0.12, g - h * 0.6); A.line(c, x, g - h * 0.75, x, g - h * 0.4);
    },
    moon(c, x, y, r) {
      c.save(); c.globalAlpha = 0.3; c.fillStyle = pal.m.yellow; c.beginPath(); c.arc(x, y, r * 2, 0, TAU); c.fill(); c.restore();
      c.beginPath(); c.arc(x, y, r, Math.PI * 0.3, Math.PI * 1.7); c.arc(x + r * 0.5, y, r * 0.8, Math.PI * 1.6, Math.PI * 0.4, true); c.closePath();
      fs(c, soft(pal.m.yellow, 0.7), pal.m.orange, 2);
    },
    planet(c, x, y, r, col, ring) {
      c.beginPath(); c.arc(x, y, r, 0, TAU); fs(c, soft(col, 0.55), col, 2);
      c.beginPath(); c.ellipse(x, y, r * 1.7, r * 0.45, -0.3, 0, TAU); c.strokeStyle = ring; c.lineWidth = 2; c.stroke();
    },
    star(c, x, y, r) { c.strokeStyle = pal.m.yellow; c.lineWidth = 2; A.line(c, x - r, y, x + r, y); A.line(c, x, y - r, x, y + r); },
    flower(c, x, g, R) {
      c.strokeStyle = pal.m.green; c.lineWidth = 1.5; A.line(c, x, g, x, g - 10);
      const col = [pal.m.pink, pal.m.yellow, pal.m.red, pal.m.purple][Math.floor(R() * 4)];
      c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 3, g - 12 + Math.sin(a) * 3, 2.4, 0, TAU); c.fill(); }
      c.fillStyle = pal.m.yellow; c.beginPath(); c.arc(x, g - 12, 1.8, 0, TAU); c.fill();
    }
  };

  function drawBackground(zi) {
    const key = [zi, W, H, dpr, pal.paper, pal.ink, pal.m.red].join('|');
    if (bg && key === bgKey) return;
    bgKey = key;
    bg = bg || document.createElement('canvas');
    bg.width = canvas.width; bg.height = canvas.height;
    const c = bg.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const Z = E.D.zones[zi % E.D.zones.length];
    c.fillStyle = pal.paper; c.fillRect(0, 0, W, H);
    // Wasserfarben-Himmel
    const gr = c.createLinearGradient(0, 0, 0, ground);
    gr.addColorStop(0, rgba(pal.m[Z.sky[0]], pal.dark ? 0.3 : 0.26));
    gr.addColorStop(1, rgba(pal.m[Z.sky[1]], pal.dark ? 0.14 : 0.12));
    c.fillStyle = gr; c.fillRect(0, 0, W, ground);
    const gg = c.createLinearGradient(0, ground, 0, H);
    gg.addColorStop(0, rgba(pal.m[Z.ground], 0.38)); gg.addColorStop(1, rgba(pal.m[Z.ground], 0.16));
    c.fillStyle = gg; c.fillRect(0, ground, W, H - ground);
    // Heftlinien
    c.strokeStyle = pal.rule; c.lineWidth = 1; c.globalAlpha = 0.7;
    for (let y = 26; y < H; y += 24) A.line(c, 0, y + 0.5, W, y + 0.5);
    c.globalAlpha = 1;
    c.strokeStyle = pal.margin; c.lineWidth = 1.5; A.line(c, 30.5, 0, 30.5, H);

    const R = rng(1000 + zi * 77);
    const g = ground, h = Math.min(H, W * 0.7);
    const sy = f => g - (0.79 - f) * h;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    switch (Z.props) {
      case 'meadow':
        P.sun(c, W * 0.88, sy(0.2), h * 0.07, R); P.cloud(c, W * 0.34, sy(0.17), h * 0.06); P.cloud(c, W * 0.62, sy(0.1), h * 0.045);
        P.tree(c, W * 0.2, g, h * 0.42, R); P.tree(c, W * 0.97, g, h * 0.36, R);
        for (let i = 0; i < 9; i++) P.flower(c, R() * W, g + 2 + R() * 4, R); break;
      case 'desert':
        P.sun(c, W * 0.15, sy(0.18), h * 0.08, R); P.pyramid(c, W * 0.66, g, h * 0.3); P.pyramid(c, W * 0.86, g, h * 0.2);
        P.cactus(c, W * 0.26, g, h * 0.3); P.cactus(c, W * 0.97, g, h * 0.22); break;
      case 'mountain':
        P.mountain(c, W * 0.3, g, h * 0.5); P.mountain(c, W * 0.68, g, h * 0.62); P.mountain(c, W * 0.95, g, h * 0.4);
        P.pine(c, W * 0.12, g, h * 0.3); P.pine(c, W * 0.9, g, h * 0.24); P.cloud(c, W * 0.5, sy(0.12), h * 0.05); break;
      case 'volcano':
        P.volcano(c, W * 0.66, g, h * 0.45); P.cloud(c, W * 0.25, sy(0.15), h * 0.05);
        for (let i = 0; i < 4; i++) P.pyramid(c, W * (0.08 + i * 0.27), g, h * 0.06); break;
      case 'castle':
        P.castle(c, W * 0.7, g, h * 0.42); P.cloud(c, W * 0.25, sy(0.14), h * 0.05); P.tree(c, W * 0.96, g, h * 0.3, R); break;
      case 'graveyard':
        P.moon(c, W * 0.85, sy(0.18), h * 0.07); P.tomb(c, W * 0.62, g, h * 0.16); P.tomb(c, W * 0.93, g, h * 0.13); P.tomb(c, W * 0.25, g, h * 0.12);
        c.strokeStyle = pal.m.brown; c.lineWidth = 2.5;
        A.line(c, W * 0.12, g, W * 0.12, g - h * 0.38); A.line(c, W * 0.12, g - h * 0.25, W * 0.16, g - h * 0.33); A.line(c, W * 0.12, g - h * 0.3, W * 0.08, g - h * 0.36); break;
      case 'space':
        P.planet(c, W * 0.8, sy(0.22), h * 0.06, pal.m.pink, pal.m.teal); P.planet(c, W * 0.3, sy(0.12), h * 0.035, pal.m.teal, pal.m.yellow);
        for (let i = 0; i < 18; i++) P.star(c, R() * W, g - R() * (g - 10), 2 + R() * 3); break;
    }
    c.restore();
    // Boden
    c.strokeStyle = pal.ink; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, g); for (let x = 0; x <= W; x += 14) c.lineTo(x, g + (R() - 0.5) * 2.5); c.stroke();
    c.strokeStyle = rgba(pal.m[Z.ground], 0.8); c.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) { const x = R() * W, y = g + 4 + R() * (H - g - 8); A.line(c, x, y, x + 5 + R() * 8, y); }
  }

  /* ---------- Umgebungs-Partikel ---------- */
  function ambientTick(d, zi) {
    const props = E.D.zones[zi % E.D.zones.length].props;
    if (!reduced && ambient.length < 26 && Math.random() < d * 6) {
      const p = { t: 0, life: 6, x: Math.random() * W, y: Math.random() * ground * 0.9, kind: props, s: 2 + Math.random() * 3, ph: Math.random() * 6 };
      if (props === 'mountain' || props === 'meadow' || props === 'castle') p.y = -6;
      if (props === 'volcano') p.y = ground + 4;
      ambient.push(p);
    }
    for (const p of ambient) {
      p.t += d;
      switch (p.kind) {
        case 'meadow': p.x += Math.sin(t + p.ph) * 12 * d + 10 * d; p.y += 18 * d; break;
        case 'desert': p.x += 40 * d; p.y += Math.sin(t * 2 + p.ph) * 8 * d; break;
        case 'mountain': p.x += Math.sin(t + p.ph) * 10 * d; p.y += 28 * d; break;
        case 'volcano': p.y -= 30 * d; p.x += Math.sin(t * 3 + p.ph) * 10 * d; break;
        case 'castle': p.x += 14 * d; p.y += 16 * d; break;
        case 'graveyard': p.x += Math.sin(t * 1.3 + p.ph) * 20 * d; p.y += Math.cos(t + p.ph) * 14 * d; break;
        case 'space': break;
      }
      const a = Math.min(1, p.t, (p.life - p.t)) * (p.kind === 'graveyard' || p.kind === 'space' ? 0.5 + 0.5 * Math.sin(t * 4 + p.ph) : 1);
      ctx.save(); ctx.globalAlpha = Math.max(0, a) * 0.8;
      switch (p.kind) {
        case 'meadow': ctx.fillStyle = p.ph > 3 ? pal.m.pink : pal.m.yellow; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * 0.5, t + p.ph, 0, TAU); ctx.fill(); break;
        case 'desert': ctx.fillStyle = pal.m.orange; ctx.fillRect(p.x, p.y, p.s, 1.5); break;
        case 'mountain': ctx.fillStyle = pal.dark ? '#ffffff' : pal.m.blue; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.6, 0, TAU); ctx.fill(); break;
        case 'volcano': ctx.fillStyle = p.ph > 3 ? pal.m.orange : pal.m.red; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.5, 0, TAU); ctx.fill(); break;
        case 'castle': ctx.fillStyle = pal.m.green; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * 0.45, t * 2 + p.ph, 0, TAU); ctx.fill(); break;
        case 'graveyard': ctx.fillStyle = pal.m.yellow; ctx.shadowColor = pal.m.yellow; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill(); break;
        case 'space': A.star(ctx, p.x, p.y, p.s, pal.m.yellow); break;
      }
      ctx.restore();
    }
    ambient = ambient.filter(p => p.t < p.life && p.y < H + 10 && p.y > -20);
  }

  /* ---------- Effekt-Helfer ---------- */
  function text(x, y, str, o) {
    if (texts.length > 40) texts.shift();
    texts.push(Object.assign({ x, y, str, vy: -46, life: 0.9, t: 0, size: 18, color: pal.ink, jitter: 0, pop: 1 }, o));
  }
  function splat(x, y, color, n, speed) {
    for (let i = 0; i < (reduced ? Math.min(3, n) : n); i++) {
      const a = Math.random() * TAU, sp = (speed || 1) * (60 + Math.random() * 160);
      parts.push({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, t: 0, color });
    }
  }
  function ring(x, y, color, r, life) { ripples.push({ x, y, color, r: r || 30, t: 0, life: life || 0.35 }); }
  function toClient(x, y) { const r = canvas.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; }

  function enemyCenter() {
    const b = foe.res && foe.res.box;
    if (b) return { x: b.x + b.w / 2, y: b.y + b.h * 0.45, h: b.h };
    const s = getState();
    const h = s.enemy && s.enemy.boss ? L.bossH : L.foeH;
    return { x: L.foeX, y: ground - h * 0.55, h };
  }
  function enemyPos() { const c = enemyCenter(); return { x: c.x, y: c.y }; }

  function planePos(p) {
    const k = p.t / p.dur;
    const x = p.dir > 0 ? -50 + (W + 100) * k : W + 50 - (W + 100) * k;
    const y = Math.max(H * 0.34, ground - L.heroH * 1.15) + Math.sin(p.t * 2.2 + (p.seed % 7)) * L.heroH * 0.18;
    return { x, y };
  }
  function hitPlane(x, y) {
    const s = getState();
    if (!s.plane) return false;
    const p = planePos(s.plane);
    return Math.hypot(x - p.x, y - p.y) < Math.max(40, H * 0.13);
  }

  function shoot(f, from, dmg, showNum) {
    const c = enemyCenter();
    const kind = f.shot;
    const tx = c.x - 8 + Math.random() * 16, ty = c.y - c.h * 0.1 + Math.random() * c.h * 0.3;
    const instant = kind === 'bolt' || kind === 'laser';
    const arc = { spear: 0.25, boulder: 0.5, ink: 0.45, shuriken: 0.08, fire: 0.05, arrow: 0.12, clock: 0.15, star: 0.1, shadow: 0.05 }[kind] || 0;
    projs.push({ kind, color: pal.m[f.color] || pal.pencil, x0: from.x, y0: from.y, x1: tx, y1: ty, t: 0, dur: instant ? 0.16 : 0.32 + Math.abs(tx - from.x) / (W * 1.6), arc, dmg, showNum, instant, hit: false, spin: Math.random() * TAU });
  }

  /* ---------- Ereignisse ---------- */
  function onEvent(ev, bulk) {
    if (bulk && ev.t !== 'spawn') return;
    const s = getState();
    const c = enemyCenter();
    switch (ev.t) {
      case 'tap': {
        if (ev.auto) ghosts.push({ t: 0, life: 0.22, x: c.x - L.foeH * (0.6 + Math.random() * 0.3), side: Math.random() < 0.5 ? 1 : 0 });
        else { hero.atk = 0.2; hero.side ^= 1; }
        if (ev.dmg > 0) {
          foe.hit = 0.12;
          const x = c.x + (Math.random() - 0.5) * c.h * 0.7, y = c.y - c.h * (0.2 + Math.random() * 0.35);
          const tier = s.combo >= 150 ? pal.m.purple : s.combo >= 100 ? pal.m.red : s.combo >= 50 ? pal.m.orange : s.combo >= 10 ? pal.m.blue : pal.ink;
          if (ev.crit) {
            text(x, y - 10, 'KRIT ' + FMT.fmt(ev.dmg), { color: pal.m.red, size: 28, life: 1.1, jitter: 1, pop: 1.5 });
            shake = Math.max(shake, 5); flash = Math.max(flash, 0.12); flashColor = pal.m.yellow;
            splat(c.x, c.y, pal.m.orange, 12, 1.4); ring(c.x, c.y, pal.m.red, c.h * 0.6, 0.3);
          } else text(x, y, FMT.fmt(ev.dmg), { color: ev.auto ? pal.m.purple : tier, size: ev.auto ? 14 : 19 + Math.min(8, s.combo / 20) });
          splat(c.x - c.h * 0.2, c.y, ev.auto ? pal.m.purple : pal.ink, ev.auto ? 2 : 5);
        }
        break;
      }
      case 'kill': {
        breakApart(ev.boss);
        const cl = toClient(c.x, c.y);
        const n = ev.boss ? 12 : Math.max(2, Math.min(7, 2 + Math.floor(Math.log10(Math.max(1, ev.gold)) / 3)));
        if (fx()) fx().coins(cl.x, cl.y, n, ev.boss);
        text(c.x + (Math.random() - 0.5) * c.h * 0.5, c.y - c.h * (0.55 + Math.random() * 0.25), '+' + FMT.fmt(ev.gold), { color: pal.goldInk, size: ev.boss ? 30 : 19, vy: -34, life: 1.1, pop: 1.3 });
        ring(c.x, c.y, MON_COLOR(), c.h * 0.8, 0.4);
        if (ev.boss) {
          shake = Math.max(shake, ev.mega ? 18 : 12); flash = 0.5; flashColor = '#ffffff';
          if (!reduced) slowT = 0.5;
          text(W * 0.5, H * 0.38, ev.mega ? 'MEGA-BOSS BESIEGT!' : 'BOSS BESIEGT!', { color: pal.m.orange, size: Math.min(44, W * 0.07), vy: -12, life: 1.8, pop: 1.8 });
          if (fx()) fx().confetti(cl.x, cl.y, ev.mega ? 90 : 50);
        }
        foe.atk = -1; foe.breath = 0; foe.beam = 0;
        break;
      }
      case 'spawn':
        foe.spawn = 0.35; foe.res = null; foe.atk = -1; foe.atkTimer = 2.2; foe.breath = 0; foe.beam = 0;
        if (ev.boss && !bulk) {
          intro = { t: 0, name: ev.name, mega: ev.mega, type: ev.type };
          shake = Math.max(shake, 8); foe.atkTimer = 2.4;
        } else if (!bulk) {
          parts.push({ k: 'dust', x: L.foeX, y: ground, t: 0, life: 0.4 });
        }
        break;
      case 'level':
        hero.cheer = 1.1; hero.pillar = 1.2;
        text(L.heroX, ground - L.heroH * 1.35, 'LEVEL ' + ev.level + '!', { color: pal.goldInk, size: 30, vy: -24, life: 1.6, pop: 1.8 });
        for (let i = 0; i < 16; i++) parts.push({ k: 'star', x: L.heroX + (Math.random() - 0.5) * L.heroH, y: ground - Math.random() * L.heroH, vx: (Math.random() - 0.5) * 50, vy: -70 - Math.random() * 90, life: 1.1, t: 0 });
        if (fx()) { const cl = toClient(L.heroX, ground - L.heroH); fx().confetti(cl.x, cl.y, 40); }
        break;
      case 'meteor': meteors.push({ t: 0, dur: 0.45, dmg: ev.dmg }); break;
      case 'bossFail':
        text(W * 0.5, H * 0.4, 'Zeit abgelaufen!', { color: pal.m.red, size: 28, vy: -14, life: 1.6 }); break;
      case 'ascend':
        for (let i = 0; i < 40; i++) parts.push({ k: 'star', x: Math.random() * W, y: H * (0.3 + Math.random() * 0.6), vx: 0, vy: -40 - Math.random() * 120, life: 1.6, t: 0 });
        if (fx()) fx().rain(120);
        break;
      case 'chest':
        chests.push({ t: 0, roll: ev.roll, gold: ev.gold, x: c.x, opened: false });
        break;
      case 'combo':
        if (ev.n >= 25) {
          text(c.x - c.h * 0.4, c.y - c.h * 0.9, 'COMBO ' + ev.n + '!', { color: ev.n >= 150 ? pal.m.purple : ev.n >= 100 ? pal.m.red : pal.m.orange, size: 24 + Math.min(14, ev.n / 15), vy: -20, life: 1.2, pop: 1.8, jitter: 0.6 });
          ring(L.heroX, ground - L.heroH * 0.5, pal.m.orange, L.heroH, 0.4);
        }
        break;
      case 'planeCatch': {
        const lbl = { stars: '+3 ★', gold: '+' + FMT.fmt(ev.gold || 0), jackpot: 'JACKPOT +' + FMT.fmt(ev.gold || 0), frenzy: 'RASEREI: ×3 DPS', clickstorm: 'KLICKSTURM: ×5', cooldown: 'FÄHIGKEITEN BEREIT!' }[ev.kind];
        const p = lastPlane || { x: W / 2, y: H * 0.3 };
        text(Math.min(W - 80, Math.max(80, p.x)), p.y, lbl, { color: pal.goldInk, size: 26, vy: -20, life: 1.8, pop: 1.8 });
        const cl = toClient(p.x, p.y);
        if (fx()) { fx().sparkles(cl.x, cl.y, 20); fx().confetti(cl.x, cl.y, 30); if (ev.gold) fx().coins(cl.x, cl.y, ev.kind === 'jackpot' ? 14 : 8, true); }
        break;
      }
      case 'buy':
        if (ev.milestone && ev.kind === 'fighter' && squad[ev.id]) { squad[ev.id].glow = 1.4; squad[ev.id].msText = true; }
        if (ev.milestone && ev.kind === 'hero') { hero.pillar = 0.8; text(L.heroX, ground - L.heroH * 1.3, '×2 KLICK!', { color: pal.m.orange, size: 24, life: 1.3, pop: 1.6 }); }
        break;
    }
  }
  let lastPlane = null;
  function MON_COLOR() { return foe.res && foe.res.color || pal.red; }

  function breakApart(boss) {
    const r = foe.res;
    if (!r) return;
    const col = r.color || pal.red;
    if (r.joints) {
      const j = r.joints;
      const segs = [[j.hip, j.neck], [j.sh, j.elb1], [j.elb1, j.hand1], [j.sh, j.elb2], [j.elb2, j.hand2], [j.hip, j.knee1], [j.knee1, j.foot1], [j.hip, j.knee2], [j.knee2, j.foot2]];
      for (const [a, b] of segs) parts.push({ k: 'seg', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dx: (b.x - a.x) / 2, dy: (b.y - a.y) / 2, vx: 40 + Math.random() * 220, vy: -120 - Math.random() * 260, rot: 0, vr: (Math.random() - 0.5) * 14, life: 1.0, t: 0, lw: j.lw, color: col });
      parts.push({ k: 'head', x: j.head.x, y: j.head.y, r: j.head.r, vx: 80 + Math.random() * 160, vy: -260 - Math.random() * 120, rot: 0, vr: 6, life: 1.1, t: 0, lw: j.lw, color: col });
    } else {
      const b = r.box, n = boss ? 22 : 12;
      for (let i = 0; i < n; i++) {
        const len = b.h * (0.06 + Math.random() * 0.12), a = Math.random() * TAU;
        parts.push({ k: 'seg', x: b.x + Math.random() * b.w, y: b.y + Math.random() * b.h, dx: Math.cos(a) * len, dy: Math.sin(a) * len, vx: (Math.random() - 0.3) * 320, vy: -100 - Math.random() * 320, rot: 0, vr: (Math.random() - 0.5) * 16, life: 1.1, t: 0, lw: Math.max(2.5, b.h * 0.03), color: col });
      }
    }
    splat(enemyCenter().x, enemyCenter().y, col, boss ? 24 : 10, boss ? 2 : 1.2);
  }

  /* ---------- Boss-Angriffe (nur Optik) ---------- */
  function bossStrike(e, res) {
    const hx = L.heroX, hy = ground - L.heroH * 0.6;
    switch (e.type) {
      case 'dragon': foe.breath = 0.75; snd('fire'); break;
      case 'mecha': foe.beam = 0.4; snd('laser'); hero.hurt = 0.35; shake = Math.max(shake, 5); break;
      case 'lich': eprojs.push({ k: 'orb', x0: res.hand ? res.hand.x : res.mouth.x, y0: res.hand ? res.hand.y : res.mouth.y, x1: hx, y1: hy, t: 0, dur: 0.5, color: pal.m.green }); snd('magic'); break;
      case 'spider': eprojs.push({ k: 'web', x0: res.mouth.x, y0: res.mouth.y, x1: hx, y1: hy, t: 0, dur: 0.45, color: pal.paper }); snd('magic'); break;
      case 'hydra': for (let i = 0; i < 8; i++) parts.push({ k: 'drop', x: res.mouth.x, y: res.mouth.y, vx: -150 - Math.random() * 150, vy: -60 + Math.random() * 80, t: 0, life: 0.9, color: pal.m.green }); hero.hurt = 0.3; snd('hiss'); break;
      case 'kraken': for (let i = 0; i < 10; i++) parts.push({ k: 'drop', x: hx + 20, y: hy, vx: (Math.random() - 0.5) * 200, vy: -150 - Math.random() * 150, t: 0, life: 0.9, color: pal.m.blue }); hero.hurt = 0.35; shake = Math.max(shake, 6); snd('slam'); break;
      default: {
        const p = res.hand || { x: hx + 30, y: ground };
        ring(p.x, ground, pal.m.brown, L.bossH * 0.6, 0.45); parts.push({ k: 'dust', x: p.x, y: ground, t: 0, life: 0.5 });
        hero.hurt = 0.35; shake = Math.max(shake, 10); snd('slam');
      }
    }
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

  function aura(x, y, h, color, a) {
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.55 * a; ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const yy = y - h * (0.2 + i * 0.2) + Math.sin(t * 20 + i) * 2;
      A.line(ctx, x - h * 0.45, yy, x - h * 0.75 - Math.random() * h * 0.2, yy);
    }
    ctx.restore();
  }

  function frame(dtReal, now) {
    const s = getState();
    if (slowT > 0) slowT -= dtReal;
    const d = dtReal * (slowT > 0 ? 0.3 : 1);
    t += d;
    const zi = E.zoneIndex(s.stage);
    drawBackground(zi);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(bg, 0, 0, W, H);
    ambientTick(d, zi);

    let sx = 0, sy = 0;
    if (shake > 0 && !reduced) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; }
    shake = Math.max(0, shake - dtReal * 30);
    ctx.save();
    ctx.translate(sx, sy);

    const rage = E.active(s, 'rage', now), rush = E.active(s, 'goldrush', now);
    const frenzy = E.buff(s, 'frenzy', now), storm = E.buff(s, 'clickstorm', now);

    // Trupp
    const lay = squadLayout(s);
    const showP = Math.min(1, 4 / Math.max(1, lay.length));
    for (const m of lay.filter(m => m.back).concat(lay.filter(m => !m.back))) {
      const id = m.f.id, col = pal.m[m.f.color] || pal.pencil;
      const st = squad[id] || (squad[id] = { timer: Math.random() * m.f.every, atk: -1, fired: false, glow: 0 });
      st.timer -= d;
      if (st.timer <= 0 && s.enemy && s.spawnTimer <= 0) { st.timer = m.f.every * (0.85 + Math.random() * 0.3) / (rage || frenzy ? 1.6 : 1); st.atk = 0; st.fired = false; }
      const kind = ATTACK[m.f.look] || 'punch';
      const base = kind === 'punch' ? POSES.guard : POSES.idle;
      let pose = breathe(base, t * 0.8 + m.x * 0.01, 0.04);
      if (st.atk >= 0) {
        st.atk += d / 0.36;
        if (st.atk >= 0.45 && !st.fired) {
          st.fired = true;
          shoot(m.f, { x: m.x + m.h * 0.3, y: m.y - m.h * 0.62 }, E.fighterDps(s, id, now) * m.f.every, Math.random() < showP);
        }
        if (st.atk >= 1) st.atk = -1; else pose = attackPose(kind, st.atk, pose);
      }
      if (hero.cheer > 0) pose = mix(pose, POSES.cheer, Math.min(1, hero.cheer * 2) * 0.7);
      if (st.glow > 0) {
        st.glow -= d;
        ctx.save(); ctx.globalAlpha = Math.min(1, st.glow) * 0.5; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(m.x, m.y - m.h * 0.5, m.h * (0.6 + Math.sin(t * 10) * 0.05), 0, TAU); ctx.fill(); ctx.restore();
        if (st.msText) { st.msText = false; text(m.x, m.y - m.h * 1.2, '×' + E.B.fighterMilestoneMult + '!', { color: col, size: 22, life: 1.3, pop: 1.8 }); }
      }
      const o = A.skin(A.looks(m.f.look, pal, col), id, s.wear[id], pal, t, m.f.color);
      o.dir = 1;
      if (o.fx && Math.random() < d * 4) parts.push({ k: 'star', x: m.x + (Math.random() - 0.5) * m.h * 0.5, y: m.y - Math.random() * m.h, vx: 0, vy: -30, life: 0.7, t: 0 });
      if (rage) aura(m.x, m.y, m.h, pal.m.red, 0.6);
      if (frenzy) aura(m.x, m.y, m.h, pal.m.orange, 0.8);
      stick(ctx, m.x, m.y, m.h * (m.f.look === 'titan' || m.f.look === 'origin' ? 1.25 : 1), pose, o);
    }

    // Held
    {
      if (hero.pillar > 0) {
        hero.pillar -= d;
        ctx.save(); ctx.globalAlpha = Math.min(1, hero.pillar) * 0.35;
        const gr = ctx.createLinearGradient(0, 0, 0, ground);
        gr.addColorStop(0, rgba(pal.m.yellow, 0)); gr.addColorStop(1, pal.m.yellow);
        ctx.fillStyle = gr; ctx.fillRect(L.heroX - L.heroH * 0.35, 0, L.heroH * 0.7, ground); ctx.restore();
      }
      let pose = breathe(POSES.guard, t * 0.9, 0.05), lunge = 0;
      if (hero.atk > 0) {
        hero.atk -= d;
        const p = 1 - Math.max(0, hero.atk) / 0.2, k = Math.sin(Math.PI * p);
        pose = mix(pose, hero.side ? PUNCH2 : POSES.punch, k);
        lunge = k * Math.max(0, enemyCenter().x - L.heroX - L.foeH * 0.6);
      } else if (hero.cheer > 0) {
        hero.cheer -= d; pose = mix(pose, POSES.cheer, Math.min(1, hero.cheer * 3));
      }
      if (hero.hurt > 0) { hero.hurt -= d; pose = mix(pose, POSES.hurt, Math.min(1, hero.hurt * 4)); lunge -= hero.hurt * 30; }
      if (rage) aura(L.heroX + lunge, ground, L.heroH, pal.m.red, 1);
      if (storm) { ctx.save(); ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 12); ctx.fillStyle = pal.m.blue; ctx.beginPath(); ctx.arc(L.heroX + lunge, ground - L.heroH * 0.55, L.heroH * 0.55, 0, TAU); ctx.fill(); ctx.restore(); }
      const ho = A.skin(A.looks('hero', pal), 'hero', s.wear.hero, pal, t);
      if (ho.fx === 'fire' && Math.random() < d * 18) parts.push({ k: 'flame', x: L.heroX + lunge + (Math.random() - 0.5) * L.heroH * 0.3, y: ground - Math.random() * L.heroH * 0.9, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, t: 0, life: 0.5, r: 2 + Math.random() * 3 });
      if (ho.fx === 'sparkle' && Math.random() < d * 10) parts.push({ k: 'star', x: L.heroX + lunge + (Math.random() - 0.5) * L.heroH * 0.5, y: ground - Math.random() * L.heroH, vx: -20, vy: -20, life: 0.8, t: 0 });
      stick(ctx, L.heroX + lunge, ground, L.heroH, pose, Object.assign(ho, { dir: 1, lw: Math.max(2.2, L.heroH * 0.055) }));
    }

    // Schattenklone
    for (const g of ghosts) {
      g.t += d;
      const k = Math.sin(Math.PI * Math.min(1, g.t / g.life));
      ctx.save(); ctx.globalAlpha = 0.35 * (1 - g.t / g.life) + 0.15;
      stick(ctx, g.x, ground, L.heroH * 0.9, mix(POSES.guard, g.side ? PUNCH2 : POSES.punch, k), Object.assign(A.looks('hero', pal), { dir: 1, color: pal.m.purple }));
      ctx.restore();
    }
    ghosts = ghosts.filter(g => g.t < g.life);

    // Gegner
    if (s.enemy && s.spawnTimer <= 0 && s.enemy.hp > 0) {
      const e = s.enemy;
      let h = e.boss ? L.bossH * (e.mega ? 1.15 : 1) : L.foeH;
      if (e.type === 'slime' || e.type === 'mushroom') h *= 0.75;
      const x = e.boss ? L.foeX + h * 0.04 : L.foeX;
      foe.spawn = Math.max(0, foe.spawn - d);
      foe.hit = Math.max(0, foe.hit - d);
      // Boss-Angriff
      if (e.boss && !intro) {
        if (foe.atk < 0) { foe.atkTimer -= d; if (foe.atkTimer <= 0) { foe.atk = 0; foe.atkTimer = 2.2 + Math.random() * 1.4; } }
        else {
          const before = foe.atk; foe.atk += d / 0.9;
          if (before < 0.5 && foe.atk >= 0.5 && foe.res) bossStrike(e, foe.res);
          if (foe.atk >= 1) foe.atk = -1;
        }
      }
      const sp = foe.spawn > 0 ? 1 - foe.spawn / 0.35 : 1;
      const pop = sp < 1 ? 1 + 0.25 * Math.sin(sp * Math.PI) - (1 - sp) * 0.7 : 1;
      const hk = foe.hit / 0.12;
      const zx = pop * (1 + hk * 0.07), zy = pop * (1 - hk * 0.08);
      ctx.save();
      ctx.translate(x + hk * 8, ground); ctx.scale(zx, zy); ctx.translate(-x, -ground);
      const color = e.boss ? E.bossInfo(s.stage).color : MOB_ZONE_COLOR[zi];
      foe.res = MON.draw(ctx, e, x, ground, h, { t, atk: foe.atk > 0 ? foe.atk : 0, pal, color, zoneColor: color, hurt: hk });
      ctx.restore();
      if (hk > 0.5 && !reduced) { ctx.save(); ctx.globalAlpha = 0.25 * hk; ctx.fillStyle = '#ffffff'; const b = foe.res.box; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore(); }
      if (!e.boss) hpBar(e, foe.res.box);
      // Feueratem
      if (foe.breath > 0 && foe.res && foe.res.mouth) {
        foe.breath -= d;
        for (let i = 0; i < 3; i++) parts.push({ k: 'flame', x: foe.res.mouth.x, y: foe.res.mouth.y, vx: -(W * 0.5 + Math.random() * W * 0.2), vy: (Math.random() - 0.5) * 90 + 30, t: 0, life: 0.55, r: 4 + Math.random() * 6 });
        hero.hurt = Math.max(hero.hurt, 0.2); shake = Math.max(shake, 3);
      }
      if (foe.beam > 0 && foe.res && foe.res.eye) {
        foe.beam -= d;
        ctx.save(); ctx.strokeStyle = pal.m.red; ctx.shadowColor = pal.m.red; ctx.shadowBlur = 14; ctx.lineCap = 'round';
        ctx.lineWidth = 3 + Math.random() * 3; A.line(ctx, foe.res.eye.x, foe.res.eye.y, L.heroX + 6, ground - L.heroH * 0.65);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; A.line(ctx, foe.res.eye.x, foe.res.eye.y, L.heroX + 6, ground - L.heroH * 0.65);
        ctx.restore();
      }
    }

    // Projektile der Truppe
    for (const p of projs) {
      p.t += d;
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
          if (p.showNum && p.dmg > 0) text(p.x1 + (Math.random() - 0.5) * 24, p.y1 - 12, FMT.fmt(p.dmg), { color: p.color, size: 14, life: 0.7 });
        }
        splat(p.x1, p.y1, p.color, 3);
      }
    }
    projs = projs.filter(p => p.t < p.dur + 0.02);

    // Boss-Projektile
    for (const p of eprojs) {
      p.t += d;
      const k = Math.min(1, p.t / p.dur);
      const x = p.x0 + (p.x1 - p.x0) * k, y = p.y0 + (p.y1 - p.y0) * k - Math.sin(Math.PI * k) * 20;
      ctx.save();
      if (p.k === 'orb') { ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(x, y, 7 + Math.sin(t * 20) * 2, 0, TAU); ctx.fill(); }
      else { ctx.strokeStyle = pal.dark ? '#ffffff' : pal.pencil; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + p.t * 4; A.line(ctx, x, y, x + Math.cos(a) * 10, y + Math.sin(a) * 10); } }
      ctx.restore();
      if (k >= 1 && !p.done) { p.done = true; hero.hurt = 0.35; splat(x, y, p.color, 8); shake = Math.max(shake, 4); }
    }
    eprojs = eprojs.filter(p => p.t < p.dur + 0.05);

    // Meteor
    for (const m of meteors) {
      m.t += d;
      const c = enemyCenter();
      const k = Math.min(1, m.t / m.dur);
      const x = c.x + (1 - k) * W * 0.15, y = -40 + (c.y + 40) * k;
      ctx.save(); ctx.fillStyle = pal.m.blue; ctx.shadowColor = pal.m.blue; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(x, y, L.foeH * 0.22, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.m.purple; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) A.line(ctx, x + 10 + i * 6, y - 20 - i * 10, x + 30 + i * 10, y - 60 - i * 14);
      ctx.restore();
      if (k >= 1 && !m.done) {
        m.done = true; shake = 16; flash = 0.4; flashColor = pal.m.blue;
        splat(c.x, c.y, pal.m.blue, 28, 2); ring(c.x, c.y, pal.m.purple, c.h, 0.5);
        text(c.x, c.y - c.h * 0.8, FMT.fmt(m.dmg), { color: pal.m.blue, size: 36, life: 1.4, jitter: 1, pop: 1.8 });
      }
    }
    meteors = meteors.filter(m => m.t < m.dur + 0.05);

    // Goldrausch-Glitzer
    if (rush && Math.random() < d * 14) parts.push({ k: 'coin', x: Math.random() * W, y: ground, vx: 0, vy: -90 - Math.random() * 90, life: 0.9, t: 0 });

    drawChests(d);
    drawPlane(s, d);
    drawRipples(d);
    drawParts(d);
    drawTexts(d);
    ctx.restore();

    if (intro) drawIntro(dtReal);
    if (flash > 0 && !reduced) {
      ctx.save(); ctx.globalAlpha = Math.min(0.6, flash); ctx.fillStyle = flashColor; ctx.fillRect(0, 0, W, H); ctx.restore();
      flash -= dtReal * 2.5;
    }
  }

  function hpBar(e, box) {
    const w = Math.max(64, Math.min(140, box.w * 1.1)), bh = 9;
    const x = box.x + box.w / 2, y = Math.max(74, box.y - 16);
    const k = Math.max(0, e.hp / e.maxHp), left = x - w / 2;
    ctx.save();
    ctx.fillStyle = pal.paper; ctx.fillRect(left, y, w, bh);
    ctx.beginPath(); ctx.rect(left, y, w * k, bh); ctx.clip();
    ctx.fillStyle = rgba(pal.m.red, 0.25); ctx.fillRect(left, y, w, bh);
    ctx.strokeStyle = pal.m.red; ctx.lineWidth = 1.6;
    for (let i = -bh; i < w; i += 4) A.line(ctx, left + i, y + bh, left + i + bh, y);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = pal.m.red; ctx.lineWidth = 1.8; ctx.strokeRect(left, y, w, bh);
    ctx.fillStyle = pal.m.red; ctx.font = `13px ${pal.font}`; ctx.textAlign = 'center';
    ctx.fillText(FMT.fmt(Math.max(0, e.hp)), x, y - 4);
    ctx.restore();
  }

  function drawProj(p, x, y, k) {
    const c = ctx; c.save(); c.lineCap = 'round';
    c.strokeStyle = p.color; c.fillStyle = p.color; c.lineWidth = 2.4;
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
      case 'shuriken': case 'star':
        c.translate(x, y); c.rotate(p.spin + p.t * 18); A.star(c, 0, 0, p.kind === 'star' ? 8 : 6, p.kind === 'star' ? pal.m.yellow : pal.paper); break;
      case 'fireball': case 'fire':
        c.fillStyle = pal.m.yellow; c.strokeStyle = pal.m.red; c.shadowColor = pal.m.orange; c.shadowBlur = 10;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x - Math.cos(ang) * i * 6, y - Math.sin(ang) * i * 6, (p.kind === 'fire' ? 7 : 6) - i * 1.6, 0, TAU); c.fill(); c.stroke(); }
        break;
      case 'boulder': case 'ink': case 'shadow':
        c.fillStyle = p.kind === 'boulder' ? pal.m.brown : p.color; c.beginPath(); c.arc(x, y, p.kind === 'ink' ? 10 : 8, 0, TAU); c.fill(); break;
      case 'clock':
        c.fillStyle = pal.paper; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); c.stroke();
        A.line(c, x, y, x + Math.cos(p.t * 12) * 6, y + Math.sin(p.t * 12) * 6); A.line(c, x, y, x, y - 4); break;
      case 'bolt': {
        c.strokeStyle = pal.m.yellow; c.lineWidth = 3.5; c.shadowColor = pal.m.yellow; c.shadowBlur = 12;
        c.beginPath(); let yy = 0, xx = p.x1; c.moveTo(xx, yy);
        while (yy < p.y1) { yy += 18; xx = p.x1 + (Math.random() - 0.5) * 18; c.lineTo(xx, Math.min(yy, p.y1)); }
        c.stroke(); break;
      }
      case 'laser':
        c.strokeStyle = pal.m.red; c.lineWidth = 3; c.globalAlpha = 1 - k * 0.6; c.shadowColor = pal.m.red; c.shadowBlur = 8; A.line(c, p.x0, p.y0, p.x1, p.y1); break;
      default:
        c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill();
    }
    c.restore();
  }

  function drawChests(d) {
    for (const ch of chests) {
      ch.t += d;
      const tier = ch.roll >= 10 ? pal.m.yellow : ch.roll >= 5 ? pal.m.purple : ch.roll >= 3 ? pal.m.blue : pal.m.brown;
      const sz = Math.max(26, L.k * 0.13);
      let y = ground - sz * 0.5;
      if (ch.t < 0.35) { const k = ch.t / 0.35; y = -sz + (ground - sz * 0.5 + sz) * k * k; }
      else if (ch.t < 0.5) y -= Math.sin((ch.t - 0.35) / 0.15 * Math.PI) * 12;
      const x = ch.x + (ch.t > 0.5 && ch.t < 0.95 ? Math.sin(ch.t * 60) * 2 : 0);
      const a = ch.t > 2.0 ? Math.max(0, 1 - (ch.t - 2.0) / 0.4) : 1;
      ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round';
      if (ch.t > 0.95) {
        ctx.save(); ctx.globalAlpha = a * 0.45; const r = sz * (1.6 + Math.sin(t * 6) * 0.15);
        ctx.fillStyle = tier; ctx.beginPath();
        for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + t; ctx.moveTo(x, y); ctx.arc(x, y, r, an, an + 0.18); }
        ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = soft(pal.m.brown, 0.7); ctx.strokeStyle = pal.m.brown; ctx.lineWidth = 2.5;
      ctx.fillRect(x - sz * 0.6, y - sz * 0.2, sz * 1.2, sz * 0.7); ctx.strokeRect(x - sz * 0.6, y - sz * 0.2, sz * 1.2, sz * 0.7);
      ctx.strokeStyle = tier; ctx.lineWidth = 3; A.line(ctx, x - sz * 0.6, y + sz * 0.1, x + sz * 0.6, y + sz * 0.1);
      const open = ch.t > 0.95 ? Math.min(1, (ch.t - 0.95) * 6) : 0;
      ctx.save(); ctx.translate(x - sz * 0.6, y - sz * 0.2); ctx.rotate(-open * 1.1);
      ctx.fillStyle = soft(pal.m.brown, 0.7); ctx.strokeStyle = pal.m.brown; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(0, -sz * 0.3, sz * 1.2, sz * 0.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = tier; ctx.lineWidth = 3; A.line(ctx, 0, -sz * 0.15, sz * 1.2, -sz * 0.15);
      ctx.restore();
      ctx.fillStyle = pal.m.yellow; ctx.strokeStyle = pal.goldInk; ctx.lineWidth = 1.5; ctx.fillRect(x - 4, y - sz * 0.22, 8, 9); ctx.strokeRect(x - 4, y - sz * 0.22, 8, 9);
      // Roulette
      if (ch.t > 0.35) {
        const rolls = [2, 3, 5, 10];
        const shown = ch.t < 0.95 ? rolls[Math.floor(ch.t * 22) % 4] : ch.roll;
        const big = ch.t >= 0.95;
        ctx.font = `${big ? Math.round(sz * (ch.roll >= 10 ? 1.3 : 1.0)) : Math.round(sz * 0.7)}px ${pal.font}`;
        ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = pal.paper;
        const ty = y - sz * (big ? 1.25 + Math.min(0.3, (ch.t - 0.95)) : 0.9);
        const lbl = (ch.roll >= 10 && big ? 'JACKPOT ' : '') + '×' + shown;
        ctx.strokeText(lbl, x, ty); ctx.fillStyle = big ? (ch.roll >= 10 ? pal.m.orange : tier) : pal.ink; ctx.fillText(lbl, x, ty);
      }
      ctx.restore();
      if (ch.t > 0.95 && !ch.opened) {
        ch.opened = true;
        const cl = toClient(x, y);
        snd(ch.roll >= 10 ? 'jackpot' : 'chest', ch.roll);
        if (fx()) {
          fx().coins(cl.x, cl.y, 4 + ch.roll, true);
          if (ch.roll >= 5) fx().confetti(cl.x, cl.y, ch.roll * 8);
          if (ch.roll >= 10) { fx().rain(80); flash = 0.5; flashColor = pal.m.yellow; shake = 14; }
        }
        text(x, y - sz * 2.2, '+' + FMT.fmt(ch.gold), { color: pal.goldInk, size: 22, vy: -24, life: 1.5, pop: 1.4 });
      }
    }
    chests = chests.filter(c => c.t < 2.4);
  }

  function drawPlane(s, d) {
    if (!s.plane) return;
    const p = planePos(s.plane);
    lastPlane = p;
    const dir = s.plane.dir;
    const sz = Math.max(22, L.k * 0.11);
    if (Math.random() < 0.6) parts.push({ k: 'star', x: p.x - dir * sz * 0.6, y: p.y + (Math.random() - 0.5) * 6, vx: -dir * 20, vy: 10, life: 0.6, t: 0 });
    ctx.save();
    ctx.translate(p.x, p.y); ctx.scale(dir, 1); ctx.rotate(Math.sin(s.plane.t * 2.2) * 0.15);
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 8); ctx.fillStyle = pal.m.yellow;
    ctx.beginPath(); ctx.arc(0, 0, sz * 1.1, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.m.yellow; ctx.strokeStyle = pal.goldInk; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.8, -sz * 0.55); ctx.lineTo(-sz * 0.35, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = soft(pal.m.orange, 0.8);
    ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.35, 0); ctx.lineTo(-sz * 0.7, sz * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawRipples(d) {
    for (const r of ripples) {
      r.t += d;
      const k = r.t / r.life;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k) * 0.8; ctx.strokeStyle = r.color; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + k), 0, TAU); ctx.stroke(); ctx.restore();
    }
    ripples = ripples.filter(r => r.t < r.life);
  }

  function drawParts(d) {
    for (const p of parts) {
      p.t += d;
      if (p.k !== 'dust') {
        p.vy += (p.k === 'spark' || p.k === 'flame' ? 0 : p.k === 'star' ? -20 : 900) * d;
        p.x += p.vx * d; p.y += p.vy * d;
        if ((p.k === 'seg' || p.k === 'head' || p.k === 'coin' || p.k === 'drop') && p.y > ground - 2) { p.y = ground - 2; p.vy *= -0.35; p.vx *= 0.6; p.vr = (p.vr || 0) * 0.5; }
      }
      if (p.vr) p.rot += p.vr * d;
      const a = Math.max(0, 1 - Math.max(0, p.t - p.life * 0.6) / (p.life * 0.4));
      ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
      switch (p.k) {
        case 'spark': ctx.strokeStyle = p.color; ctx.lineWidth = 2.4; A.line(ctx, p.x, p.y, p.x - p.vx * 0.04, p.y - p.vy * 0.04); break;
        case 'coin': ctx.fillStyle = pal.gold; ctx.strokeStyle = pal.goldInk; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 5 * Math.abs(Math.cos(p.t * 9)) + 1, 0, 0, TAU); ctx.fill(); ctx.stroke(); break;
        case 'star': ctx.strokeStyle = pal.goldInk; ctx.lineWidth = 1; A.star(ctx, p.x, p.y, 4, pal.m.yellow); break;
        case 'seg': {
          ctx.strokeStyle = p.color; ctx.lineWidth = p.lw;
          const c = Math.cos(p.rot), s = Math.sin(p.rot);
          const dx = p.dx * c - p.dy * s, dy = p.dx * s + p.dy * c;
          A.line(ctx, p.x - dx, p.y - dy, p.x + dx, p.y + dy); break;
        }
        case 'head': ctx.strokeStyle = p.color; ctx.lineWidth = p.lw; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke(); break;
        case 'flame': {
          const k = p.t / p.life;
          ctx.fillStyle = k < 0.3 ? pal.m.yellow : k < 0.6 ? pal.m.orange : pal.m.red;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 1.5), 0, TAU); ctx.fill(); break;
        }
        case 'drop': ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, TAU); ctx.fill(); break;
        case 'dust': {
          const k = p.t / p.life;
          ctx.fillStyle = soft(pal.pencil, 0.4);
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(p.x + (i - 2.5) * 14 * (0.5 + k), p.y - 6 - k * 10, 8 * (1 - k * 0.5), 0, TAU); ctx.fill(); }
          break;
        }
      }
      ctx.restore();
    }
    parts = parts.filter(p => p.t < p.life);
    if (parts.length > 320) parts.splice(0, parts.length - 320);
  }

  function drawTexts(d) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const x of texts) {
      x.t += d; x.y += x.vy * d; x.vy *= 0.97;
      const a = Math.max(0, 1 - Math.max(0, x.t - x.life * 0.55) / (x.life * 0.45));
      const pop = x.t < 0.1 ? 0.6 + (x.t / 0.1) * (x.pop - 0.6 + 0.2) : 1 + (x.pop - 1) * Math.max(0, 1 - (x.t - 0.1) * 6) * 0.3;
      ctx.globalAlpha = a;
      ctx.font = `${Math.round(x.size * pop)}px ${pal.font}`;
      const jx = x.jitter ? (Math.random() - 0.5) * x.jitter * 2 : 0;
      ctx.lineWidth = 5; ctx.strokeStyle = pal.paper; ctx.lineJoin = 'round';
      ctx.strokeText(x.str, x.x + jx, x.y);
      ctx.fillStyle = x.color; ctx.fillText(x.str, x.x + jx, x.y);
    }
    ctx.restore();
    texts = texts.filter(x => x.t < x.life);
  }

  function drawIntro(dt) {
    intro.t += dt;
    const T = intro.t, dur = 1.9;
    const inK = Math.min(1, T / 0.25), outK = T > dur - 0.3 ? (dur - T) / 0.3 : 1, k = Math.max(0, Math.min(inK, outK));
    ctx.save();
    ctx.globalAlpha = 0.45 * k; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = k;
    const bh = Math.min(84, H * 0.3), by = H * 0.5 - bh / 2;
    const col = intro.mega ? pal.m.purple : pal.m.red;
    ctx.fillStyle = col; ctx.fillRect(0, by, W, bh);
    ctx.fillStyle = pal.m.yellow;
    for (let x = -40 + (T * 120 % 40); x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + 16, by); ctx.lineTo(x + 6, by + 8); ctx.lineTo(x - 10, by + 8); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, by + bh); ctx.lineTo(x + 16, by + bh); ctx.lineTo(x + 26, by + bh - 8); ctx.lineTo(x + 10, by + bh - 8); ctx.closePath(); ctx.fill(); }
    const slide = (1 - inK) * W * 0.6;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(Math.min(40, W * 0.08))}px ${pal.font}`;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 4;
    const head = intro.mega ? 'MEGA-BOSS!' : 'BOSS-ALARM!';
    ctx.strokeText(head, W / 2 - slide, by + bh * 0.38); ctx.fillText(head, W / 2 - slide, by + bh * 0.38);
    ctx.font = `${Math.round(Math.min(20, W * 0.045))}px ${pal.font}`;
    ctx.fillStyle = pal.m.yellow; ctx.fillText(intro.name, W / 2 + slide, by + bh * 0.76);
    ctx.restore();
    if (T >= dur) intro = null;
  }

  function tapFx(x, y) {
    splat(x, y, pal.ink, 4);
    ring(x, y, pal.m.blue, 22, 0.25);
  }

  function reset() { projs = []; eprojs = []; texts = []; parts = []; ghosts = []; meteors = []; chests = []; ripples = []; intro = null; for (const k in squad) delete squad[k]; foe.res = null; foe.atk = -1; }

  root.KK_ARENA = { init, resize, frame, onEvent, tapFx, enemyPos, readPalette, reset, hitPlane, get palette() { return pal; } };
})(window);
