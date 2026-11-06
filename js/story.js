/* Kritzelkrieg – Geschichte: Comic-Cutscenes mit gezeichneten Panels und Schreibmaschinen-Text. */
(function (root) {
  'use strict';
  const A = root.KK_ART, MON = root.KK_MON, C = root.KK_CONTENT, D = root.KK_DATA;
  const TAU = Math.PI * 2;
  const $ = id => document.getElementById(id);

  let pal = null, cv = null, ctx = null, W = 0, H = 0, dpr = 1;
  let cur = null, idx = 0, t = 0, shown = 0, raf = 0, last = 0, onDone = null;
  const queue = [];

  function setPalette(p) { pal = p; }
  const soft = (c, k) => A.soft(pal, c, k);

  /* ---------- Figuren ---------- */
  function kid(c, x, g, h, pose, opts) {
    const o = { color: pal.m.brown, fill: pal.paper, dir: opts && opts.dir || 1, lw: Math.max(2, h * 0.045) };
    o.front = (cx, j) => {
      const { x: hx, y: hy, r } = j.head;
      cx.save(); cx.strokeStyle = pal.m.brown; cx.lineWidth = Math.max(1.5, j.lw * 0.8);
      cx.beginPath();
      for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; const rr = r * (i % 2 ? 1.35 : 1.05); cx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr); }
      cx.stroke(); cx.restore();
    };
    o.hand = (cx, j) => { cx.save(); cx.strokeStyle = pal.m.blue; cx.lineWidth = j.lw; A.line(cx, j.hand1.x, j.hand1.y, j.hand1.x + o.dir * j.h * 0.12, j.hand1.y - j.h * 0.12); cx.restore(); };
    return A.stick(c, x, g, h, pose, o);
  }
  function teacher(c, x, g, h, tt) {
    const col = pal.m.red;
    c.save(); c.strokeStyle = col; c.fillStyle = soft(col, 0.35); c.lineWidth = Math.max(2.5, h * 0.03); c.lineCap = 'round'; c.lineJoin = 'round';
    // Rock
    c.beginPath(); c.moveTo(x - h * 0.08, g - h * 0.55); c.lineTo(x - h * 0.2, g - h * 0.08); c.lineTo(x + h * 0.2, g - h * 0.08); c.lineTo(x + h * 0.08, g - h * 0.55); c.closePath(); c.fill(); c.stroke();
    A.line(c, x - h * 0.08, g - h * 0.08, x - h * 0.08, g); A.line(c, x + h * 0.08, g - h * 0.08, x + h * 0.08, g);
    A.line(c, x, g - h * 0.55, x, g - h * 0.78);
    // Kopf mit Dutt und Brille
    const hy = g - h * 0.87;
    c.fillStyle = pal.paper; c.beginPath(); c.arc(x, hy, h * 0.085, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x + h * 0.02, hy - h * 0.1, h * 0.045, 0, TAU); c.fill(); c.stroke();
    c.lineWidth = Math.max(1.5, h * 0.015);
    c.beginPath(); c.arc(x - h * 0.035, hy, h * 0.025, 0, TAU); c.stroke(); c.beginPath(); c.arc(x + h * 0.035, hy, h * 0.025, 0, TAU); c.stroke();
    A.line(c, x - h * 0.03, hy + h * 0.045, x + h * 0.035, hy + h * 0.04 - Math.sin(tt * 3) * h * 0.01);
    // Arm mit riesigem Rotstift
    c.lineWidth = Math.max(2.5, h * 0.03);
    const ax = x - h * 0.2, ay = g - h * 0.62 + Math.sin(tt * 4) * h * 0.03;
    A.line(c, x, g - h * 0.72, ax, ay);
    c.save(); c.translate(ax, ay); c.rotate(-0.7 + Math.sin(tt * 4) * 0.1);
    c.fillStyle = col; c.fillRect(-h * 0.03, -h * 0.25, h * 0.06, h * 0.32); c.strokeRect(-h * 0.03, -h * 0.25, h * 0.06, h * 0.32);
    c.beginPath(); c.moveTo(-h * 0.03, h * 0.07); c.lineTo(0, h * 0.14); c.lineTo(h * 0.03, h * 0.07); c.closePath(); c.fillStyle = pal.paper; c.fill(); c.stroke();
    c.restore();
    A.line(c, x, g - h * 0.72, x + h * 0.15, g - h * 0.55);
    c.restore();
  }
  function hero(c, x, g, h, pose, o) {
    return A.stick(c, x, g, h, pose, Object.assign(A.looks('hero', pal), { dir: 1, lw: Math.max(2.2, h * 0.055) }, o || {}));
  }
  function paper(c, lines) {
    c.fillStyle = pal.paper; c.fillRect(0, 0, W, H);
    if (lines !== false) {
      c.strokeStyle = pal.rule; c.lineWidth = 1;
      for (let y = 22; y < H; y += 20) A.line(c, 0, y, W, y);
      c.strokeStyle = pal.margin; c.lineWidth = 1.5; A.line(c, W * 0.1, 0, W * 0.1, H);
    }
  }
  function speedLines(c, cx, cy, col, n) {
    c.save(); c.strokeStyle = col; c.globalAlpha = 0.35; c.lineWidth = 2;
    for (let i = 0; i < (n || 26); i++) { const a = i / (n || 26) * TAU + t * 0.2, r0 = Math.min(W, H) * 0.3, r1 = Math.max(W, H); A.line(c, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); }
    c.restore();
  }
  function sparkle(c, x, y, r, col) {
    c.save(); c.strokeStyle = col; c.lineWidth = 2; const k = 0.6 + 0.4 * Math.sin(t * 6 + x);
    A.line(c, x - r * k, y, x + r * k, y); A.line(c, x, y - r * k, x, y + r * k); c.restore();
  }

  /* ---------- Szenen ---------- */
  const SCENES = {
    classroom(c, p) {
      c.fillStyle = soft(pal.m.yellow, 0.25); c.fillRect(0, 0, W, H);
      c.fillStyle = soft(pal.m.brown, 0.35); c.fillRect(0, H * 0.78, W, H * 0.22);
      // Tafel
      c.fillStyle = '#2f4a3c'; c.strokeStyle = pal.m.brown; c.lineWidth = 5;
      c.fillRect(W * 0.08, H * 0.1, W * 0.5, H * 0.38); c.strokeRect(W * 0.08, H * 0.1, W * 0.5, H * 0.38);
      c.fillStyle = '#f2f0e4'; c.font = `${Math.round(H * 0.09)}px ${pal.font}`; c.textAlign = 'left';
      c.fillText(p.bell ? 'Pause!' : '7 × 8 = ?', W * 0.13, H * 0.27);
      c.font = `${Math.round(H * 0.05)}px ${pal.font}`; c.fillText(p.bell ? 'Hausaufgabe: S. 42' : 'Seite 42, Nr. 3', W * 0.13, H * 0.4);
      // Uhr
      const ux = W * 0.75, uy = H * 0.2, ur = H * 0.08;
      c.fillStyle = pal.paper; c.strokeStyle = pal.ink; c.lineWidth = 3; c.beginPath(); c.arc(ux, uy, ur, 0, TAU); c.fill(); c.stroke();
      A.line(c, ux, uy, ux + Math.cos(t * 0.5) * ur * 0.75, uy + Math.sin(t * 0.5) * ur * 0.75); A.line(c, ux, uy, ux, uy - ur * 0.5);
      if (p.bell) {
        c.fillStyle = pal.m.yellow; c.strokeStyle = pal.m.orange; c.beginPath(); c.arc(W * 0.9, H * 0.18, H * 0.06, Math.PI, 0); c.lineTo(W * 0.9 + H * 0.06, H * 0.2); c.lineTo(W * 0.9 - H * 0.06, H * 0.2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = pal.m.red; c.font = `${Math.round(H * 0.07)}px ${pal.font}`; c.textAlign = 'center';
        c.save(); c.translate(W * 0.88 + Math.sin(t * 30) * 3, H * 0.36); c.rotate(-0.1); c.fillText('RIIING!', 0, 0); c.restore();
      }
      // Pulte
      c.fillStyle = soft(pal.m.brown, 0.6); c.strokeStyle = pal.m.brown; c.lineWidth = 3;
      for (const dx of [0.12, 0.62]) { c.beginPath(); c.rect(W * dx, H * 0.7, W * 0.26, H * 0.06); c.fill(); c.stroke(); A.line(c, W * (dx + 0.02), H * 0.76, W * (dx + 0.02), H * 0.95); A.line(c, W * (dx + 0.24), H * 0.76, W * (dx + 0.24), H * 0.95); }
      // Toni
      const bored = Math.sin(t * 1.5) * 0.15;
      kid(c, W * 0.75, H * 0.96, H * 0.42, Object.assign({}, A.POSES.idle, { lean: 0.25 + bored, ua1: 1.3, la1: 2.4 }), { dir: -1 });
      if (!p.bell) { c.fillStyle = pal.ink; c.font = `${Math.round(H * 0.06)}px ${pal.font}`; c.textAlign = 'center'; c.fillText('z z z', W * 0.82 + Math.sin(t) * 5, H * 0.45 - (t * 8 % 20)); }
    },
    doodle(c) {
      paper(c);
      const k = Math.min(1, t / 2.2);
      c.save(); c.beginPath(); c.rect(0, 0, W * 0.2 + W * 0.5 * k, H); c.clip();
      hero(c, W * 0.45, H * 0.85, H * 0.6, A.POSES.idle);
      c.restore();
      // Hand mit Stift
      const px = W * 0.2 + W * 0.5 * k, py = H * (0.35 + Math.sin(t * 9) * 0.04);
      c.save(); c.strokeStyle = pal.m.brown; c.fillStyle = soft(pal.m.orange, 0.35); c.lineWidth = 3;
      c.beginPath(); c.ellipse(px + W * 0.12, py + H * 0.18, W * 0.09, H * 0.12, -0.6, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = pal.m.blue; c.lineWidth = 7; A.line(c, px, py, px + W * 0.1, py + H * 0.15);
      c.restore();
    },
    awaken(c) {
      paper(c);
      speedLines(c, W * 0.45, H * 0.55, pal.m.yellow, 30);
      const jump = Math.max(0, Math.sin(Math.min(1.6, t) * 2)) * H * 0.12;
      const pose = t < 0.8 ? A.POSES.idle : A.mix(A.POSES.idle, A.POSES.cheer, Math.min(1, (t - 0.8) * 3));
      hero(c, W * 0.45, H * 0.88 - jump, H * 0.55, pose);
      for (let i = 0; i < 10; i++) sparkle(c, W * (0.25 + (i * 37 % 50) / 100), H * (0.2 + (i * 53 % 60) / 100), 8, i % 2 ? pal.m.yellow : pal.m.orange);
      if (t > 0.8) { c.fillStyle = pal.m.red; c.font = `${Math.round(H * 0.18)}px ${pal.font}`; c.textAlign = 'center'; c.fillText('!', W * 0.62, H * 0.3); }
    },
    teacher(c) {
      paper(c);
      c.fillStyle = soft(pal.m.red, 0.15); c.fillRect(0, 0, W, H);
      teacher(c, W * 0.78, H * 0.98, H * 0.9, t);
      // rote Kritzler kriechen aus Korrekturen
      for (let i = 0; i < 3; i++) {
        const x = W * (0.18 + i * 0.17), rise = Math.min(1, Math.max(0, t * 0.9 - i * 0.3));
        c.strokeStyle = pal.m.red; c.lineWidth = 4; A.line(c, x - 18, H * 0.9, x + 18, H * 0.9 - 10); A.line(c, x - 18, H * 0.9 - 10, x + 18, H * 0.9);
        if (rise > 0) {
          c.save(); c.beginPath(); c.rect(0, 0, W, H * 0.9); c.clip();
          MON.draw(c, { boss: false, type: 'stick', seed: i * 3 + 1 }, x, H * 0.9 + (1 - rise) * H * 0.35, H * 0.32, { t: t + i, pal, zoneColor: 'red' });
          c.restore();
        }
      }
    },
    ready(c) {
      paper(c);
      speedLines(c, W * 0.5, H * 0.6, pal.m.orange, 34);
      const cols = ['orange', 'blue', 'green', 'purple', 'pink'];
      cols.forEach((col, i) => {
        const o = A.looks(D.fighters[i].look, pal, pal.m[col]); o.dir = 1;
        A.stick(c, W * (0.08 + i * 0.07), H * 0.92 - (i % 2) * H * 0.03, H * 0.3, A.breathe(A.POSES.idle, t + i, 0.05), o);
      });
      hero(c, W * 0.5, H * 0.92, H * 0.5, A.breathe(A.POSES.guard, t, 0.05));
      MON.draw(c, { boss: false, type: 'stick', seed: 4 }, W * 0.8, H * 0.92, H * 0.42, { t, pal, zoneColor: 'red' });
      MON.draw(c, { boss: false, type: 'slime', seed: 2 }, W * 0.93, H * 0.92, H * 0.3, { t, pal });
    },
    zone(c, p) {
      const Z = D.zones[p.zone % D.zones.length];
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, soft(pal.m[Z.sky[0]], 0.4)); gr.addColorStop(0.75, soft(pal.m[Z.sky[1]], 0.3)); gr.addColorStop(0.751, soft(pal.m[Z.ground], 0.45)); gr.addColorStop(1, soft(pal.m[Z.ground], 0.3));
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.strokeStyle = pal.ink; c.lineWidth = 3; A.line(c, 0, H * 0.75, W, H * 0.75);
      c.fillStyle = pal.ink; c.textAlign = 'center';
      c.font = `${Math.round(H * 0.08)}px ${pal.font}`; c.fillText('Kapitel ' + (p.zone + 1), W / 2, H * 0.18);
      c.font = `${Math.round(H * 0.12)}px ${pal.font}`; c.fillStyle = pal.m[Z.sky[0]]; c.fillText(Z.name, W / 2, H * 0.34);
      const walk = Math.min(1, t / 1.6);
      const step = Math.sin(t * 8);
      hero(c, W * (0.1 + walk * 0.25), H * 0.75, H * 0.36, Object.assign({}, A.POSES.idle, { th1: 0.4 * step, th2: -0.4 * step, ua1: -0.4 * step, ua2: 0.4 * step }));
      Z.mobs.forEach((m, i) => MON.draw(c, { boss: false, type: m, seed: i * 5 + 1 }, W * (0.6 + i * 0.13), H * 0.75, H * 0.3, { t: t + i, pal, zoneColor: 'red' }));
    },
    boss(c, p) {
      c.fillStyle = soft(p.mega ? pal.m.purple : pal.m.red, 0.25); c.fillRect(0, 0, W, H);
      speedLines(c, W * 0.65, H * 0.5, p.mega ? pal.m.purple : pal.m.red, 30);
      const bc = { cyclops: 'brown', spider: 'purple', golem: 'brown', kraken: 'blue', dragon: p.mega ? 'purple' : 'red', lich: 'purple', hydra: 'green', mecha: 'teal' }[p.boss] || 'red';
      const atk = (t % 2.2) / 2.2;
      MON.draw(c, { boss: true, type: p.boss, mega: !!p.mega, seed: 3 }, W * 0.66, H * 0.95, H * (p.mega ? 0.85 : 0.75), { t, atk: atk < 0.6 ? atk / 0.6 : 0, pal, color: bc });
      hero(c, W * 0.15, H * 0.95, H * 0.3, A.mix(A.POSES.guard, A.POSES.hurt, Math.max(0, Math.sin(t * 3)) * 0.3));
    },
    ink(c, p) {
      paper(c);
      const bx = W * 0.55, by = H * 0.4;
      const tip = p.spill ? Math.min(1.3, t * 1.2) : Math.sin(t * 4) * 0.08;
      if (p.spill) {
        const r = Math.min(H * 0.6, t * H * 0.2);
        c.fillStyle = pal.ink; c.beginPath();
        for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU, rr = r * (0.8 + 0.25 * Math.sin(i * 3 + t * 2)); c.lineTo(bx + W * 0.05 + Math.cos(a) * rr * 1.3, H * 0.8 + Math.sin(a) * rr * 0.4); }
        c.fill();
        for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(bx + W * 0.05 + Math.sin(i * 2 + t) * r, H * 0.8 - r * 0.4 - (t * 30 + i * 20) % (r + 1), 5, 0, TAU); c.fill(); }
      }
      c.save(); c.translate(bx, by + H * 0.2); c.rotate(tip);
      c.fillStyle = soft(pal.m.blue, 0.4); c.strokeStyle = pal.ink; c.lineWidth = 4;
      c.beginPath(); c.rect(-H * 0.12, -H * 0.24, H * 0.24, H * 0.24); c.fill(); c.stroke();
      c.beginPath(); c.rect(-H * 0.05, -H * 0.32, H * 0.1, H * 0.08); c.fill(); c.stroke();
      c.fillStyle = pal.ink; c.fillRect(-H * 0.12, -H * 0.1, H * 0.24, H * 0.1);
      c.restore();
      if (!p.spill) { teacher(c, W * 0.88, H * 1.02, H * 0.55, t); hero(c, W * 0.2, H * 0.95, H * 0.32, A.POSES.guard); }
    },
    newbook(c) {
      c.fillStyle = soft(pal.m.blue, 0.2); c.fillRect(0, 0, W, H);
      const open = Math.min(1, t / 1.4);
      const bw = H * 0.55, bh = H * 0.72, bx = W / 2, by = H * 0.14;
      c.fillStyle = pal.paper; c.strokeStyle = pal.ink; c.lineWidth = 3;
      c.fillRect(bx, by, bw, bh); c.strokeRect(bx, by, bw, bh);
      c.save(); c.translate(bx, by); c.scale(Math.cos(open * Math.PI), 1);
      c.fillStyle = pal.m.purple; c.fillRect(0, 0, bw, bh); c.strokeRect(0, 0, bw, bh);
      c.fillStyle = pal.paper; c.fillRect(bw * 0.15, bh * 0.15, bw * 0.7, bh * 0.2);
      c.fillStyle = pal.ink; c.font = `${Math.round(bh * 0.08)}px ${pal.font}`; c.textAlign = 'center'; c.fillText('Heft 2', bw / 2, bh * 0.28);
      c.restore();
      if (open > 0.6) {
        hero(c, bx + bw * 0.5, by + bh * 0.85, bh * 0.5, A.mix(A.POSES.idle, A.POSES.cheer, Math.min(1, (open - 0.6) * 3)));
        for (let i = 0; i < 8; i++) sparkle(c, bx + (i * 41 % 100) / 100 * bw, by + (i * 67 % 100) / 100 * bh, 7, pal.m.yellow);
      }
    },
    kiosk(c) {
      c.fillStyle = soft(pal.m.yellow, 0.3); c.fillRect(0, 0, W, H);
      c.fillStyle = soft(pal.m.red, 0.5); c.strokeStyle = pal.m.red; c.lineWidth = 3;
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? pal.paper : soft(pal.m.red, 0.6); c.fillRect(W * (0.4 + i * 0.09), H * 0.08, W * 0.09, H * 0.14); }
      c.strokeRect(W * 0.4, H * 0.08, W * 0.54, H * 0.14);
      c.fillStyle = soft(pal.m.brown, 0.5); c.fillRect(W * 0.42, H * 0.55, W * 0.5, H * 0.35); c.strokeStyle = pal.m.brown; c.strokeRect(W * 0.42, H * 0.55, W * 0.5, H * 0.35);
      const cols = ['purple', 'blue', 'green', 'orange', 'pink'];
      cols.forEach((col, i) => {
        const x = W * (0.47 + i * 0.09), y = H * 0.5 + Math.sin(t * 3 + i) * 3;
        c.fillStyle = pal.m[col]; c.strokeStyle = pal.ink; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x - 14, y); c.lineTo(x + 14, y); c.lineTo(x + 10, y - 40); c.lineTo(x - 10, y - 40); c.closePath(); c.fill(); c.stroke();
        A.star(c, x, y - 20, 6, pal.m.yellow);
      });
      c.fillStyle = pal.ink; c.font = `${Math.round(H * 0.08)}px ${pal.font}`; c.textAlign = 'center'; c.fillText('KIOSK', W * 0.67, H * 0.4);
      kid(c, W * 0.22, H * 0.95, H * 0.45, A.mix(A.POSES.idle, A.POSES.cheer, 0.5 + 0.5 * Math.sin(t * 2)), {});
      for (let i = 0; i < 5; i++) A.star(c, W * (0.12 + i * 0.05), H * 0.3 - Math.abs(Math.sin(t * 3 + i)) * H * 0.1, 8, pal.m.yellow);
    }
  };

  /* ---------- Ablauf ---------- */
  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, root.devicePixelRatio || 1);
    W = Math.max(200, r.width); H = Math.max(120, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  function panel() { return cur.panels[idx]; }
  function render() {
    if (!cur) return;
    const p = panel();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (SCENES[p.scene] || SCENES.ready)(ctx, p);
    ctx.restore();
    // Panel-Rahmen-Einblendung
    if (t < 0.25) { ctx.fillStyle = pal.paper; ctx.globalAlpha = 1 - t / 0.25; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  function loop(ts) {
    if (!cur) return;
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0.016; last = ts;
    t += dt;
    const txt = panel().text;
    if (shown < txt.length) { shown = Math.min(txt.length, shown + dt * 45); $('storyText').textContent = txt.slice(0, Math.floor(shown)); }
    $('storyNext').classList.toggle('ready', shown >= txt.length);
    render();
    raf = root.requestAnimationFrame(loop);
  }
  function showPanel() {
    t = 0; shown = 0; last = 0;
    $('storyText').textContent = '';
    const dots = cur.panels.map((_, i) => `<i class="${i === idx ? 'on' : i < idx ? 'done' : ''}"></i>`).join('');
    $('storyDots').innerHTML = dots;
    $('storyNext').textContent = idx === cur.panels.length - 1 ? 'Los geht’s!' : 'Weiter ›';
    if (root.KK_AUDIO) root.KK_AUDIO.play('page');
  }
  function next() {
    if (!cur) return;
    const txt = panel().text;
    if (shown < txt.length) { shown = txt.length; $('storyText').textContent = txt; return; }
    if (idx < cur.panels.length - 1) { idx++; showPanel(); return; }
    close();
  }
  function close() {
    const done = onDone;
    cur = null; onDone = null;
    root.cancelAnimationFrame(raf);
    $('story').hidden = true;
    if (done) done();
    if (queue.length) { const [id, cb] = queue.shift(); setTimeout(() => play(id, cb), 250); }
  }
  function play(id, cb) {
    const st = C.story.find(x => x.id === id);
    if (!st) { if (cb) cb(); return false; }
    if (cur) { queue.push([id, cb]); return true; }
    cur = st; idx = 0; onDone = cb || null;
    $('storyTitle').textContent = st.title;
    $('story').hidden = false;
    resize();
    showPanel();
    raf = root.requestAnimationFrame(loop);
    return true;
  }
  function init(palette) {
    pal = palette;
    cv = $('storyCanvas'); ctx = cv.getContext('2d');
    $('story').addEventListener('click', e => { if (e.target.closest('#storySkip')) return; next(); });
    $('storySkip').addEventListener('click', e => { e.stopPropagation(); close(); });
    root.addEventListener('resize', () => { if (cur) resize(); });
    document.addEventListener('keydown', e => {
      if (!cur) return;
      if (e.key === 'Escape') { close(); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { next(); e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
  }

  root.KK_STORY = { init, play, setPalette, get open() { return !!cur; } };
})(window);
