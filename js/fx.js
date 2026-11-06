/* Kritzelkrieg – Effekt-Ebene über der ganzen App: Münzen fliegen in den Goldzähler, Konfetti. */
(function (root) {
  'use strict';
  let cv = null, ctx = null, dpr = 1, W = 0, H = 0;
  let parts = [], targetEl = null, arrive = null, pal = {}, dirty = false, reduced = false;
  const TAU = Math.PI * 2;

  function init(canvas, target, onArrive) {
    cv = canvas; ctx = cv.getContext('2d'); targetEl = target; arrive = onArrive;
    reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resize();
    root.addEventListener('resize', resize);
  }
  function resize() {
    if (!cv) return;
    dpr = Math.min(2, root.devicePixelRatio || 1);
    W = root.innerWidth; H = root.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  function setPalette(p) { pal = p; }
  function targetPos() {
    if (!targetEl) return { x: 20, y: 20 };
    const r = targetEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function coins(x, y, n, big) {
    n = Math.min(n, reduced ? 3 : 14);
    for (let i = 0; i < n; i++) {
      if (parts.length > 160) break;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 140 + Math.random() * (big ? 360 : 200);
      parts.push({ k: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, home: 0.28 + Math.random() * 0.25 + i * 0.02, r: big ? 7 : 5.5, spin: Math.random() * 6 });
    }
  }
  function confetti(x, y, n, spread) {
    const cols = pal.m ? [pal.m.red, pal.m.orange, pal.m.yellow, pal.m.green, pal.m.teal, pal.m.blue, pal.m.purple, pal.m.pink] : ['#e2453c', '#f2bd18', '#2f7ad6'];
    n = reduced ? Math.min(n, 12) : n;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * (spread || 2.4), sp = 250 + Math.random() * 450;
      parts.push({ k: 'conf', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 1.6 + Math.random() * 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: cols[i % cols.length] });
    }
  }
  function rain(n) { for (let i = 0; i < n; i++) confetti(Math.random() * W, -10, 1, 0.6); }
  function sparkles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 200;
      parts.push({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.5 + Math.random() * 0.4, c: color || pal.gold });
    }
  }

  function frame(dt) {
    if (!ctx) return;
    if (!parts.length) { if (dirty) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); dirty = false; } return; }
    dirty = true;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const tp = targetPos();
    let arrived = 0;
    for (const p of parts) {
      p.t += dt;
      if (p.k === 'coin') {
        if (p.t < p.home) { p.vy += 900 * dt; p.vx *= 0.98; p.x += p.vx * dt; p.y += p.vy * dt; }
        else {
          const k = Math.min(1, (p.t - p.home) * 5);
          p.x += (tp.x - p.x) * k * 0.35; p.y += (tp.y - p.y) * k * 0.35;
          if (Math.hypot(tp.x - p.x, tp.y - p.y) < 12) { p.dead = true; arrived++; continue; }
        }
        const sx = Math.abs(Math.cos(p.t * 10 + p.spin));
        ctx.fillStyle = pal.gold || '#f2bd18'; ctx.strokeStyle = pal.goldInk || '#946700'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (0.3 + sx * 0.7), p.r, 0, 0, TAU); ctx.fill(); ctx.stroke();
        if (p.t > 2.5) p.dead = true;
      } else if (p.k === 'conf') {
        p.vy += 520 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const a = Math.max(0, 1 - Math.max(0, p.t - p.life * 0.7) / (p.life * 0.3));
        ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.cos(p.t * 8 + p.rot)) + 0.2);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        if (p.t > p.life || p.y > H + 20) p.dead = true;
      } else if (p.k === 'spark') {
        p.vx *= 0.92; p.vy *= 0.92; p.x += p.vx * dt; p.y += p.vy * dt;
        const a = 1 - p.t / p.life;
        ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4); ctx.stroke(); ctx.restore();
        if (p.t > p.life) p.dead = true;
      }
    }
    parts = parts.filter(p => !p.dead);
    if (arrived && arrive) arrive(arrived);
  }

  root.KK_FX = { init, resize, setPalette, coins, confetti, rain, sparkles, frame, get busy() { return parts.length; } };
})(window);
