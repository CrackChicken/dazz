/* Kritzelkrieg – Strichmännchen zeichnen (Posen, Waffen, Accessoires). */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  /* Winkel: 0 = gerade nach unten, π/2 = waagerecht nach vorn, π = nach oben,
   * negative Werte zeigen nach hinten. "Vorn" ist die Blickrichtung (dir). */
  const POSES = {
    idle: { lean: 0.04, ua1: 0.35, la1: 0.75, ua2: -0.3, la2: -0.1, th1: 0.24, sh1: 0.1, th2: -0.22, sh2: -0.1 },
    guard: { lean: 0.1, ua1: 0.7, la1: 2.5, ua2: 0.35, la2: 2.7, th1: 0.4, sh1: 0.12, th2: -0.35, sh2: -0.12 },
    punch: { lean: 0.25, ua1: 1.55, la1: 1.6, ua2: 0.1, la2: 2.6, th1: 0.7, sh1: 0.15, th2: -0.55, sh2: -0.3 },
    raise: { lean: -0.05, ua1: 2.7, la1: 3.0, ua2: -0.4, la2: -0.2, th1: 0.3, sh1: 0.1, th2: -0.3, sh2: -0.1 },
    slash: { lean: 0.3, ua1: 1.1, la1: 0.9, ua2: -0.6, la2: -0.4, th1: 0.75, sh1: 0.2, th2: -0.5, sh2: -0.3 },
    aim: { lean: 0.02, ua1: 1.57, la1: 1.57, ua2: 1.3, la2: -1.4, th1: 0.35, sh1: 0.1, th2: -0.3, sh2: -0.1 },
    windup: { lean: -0.15, ua1: -2.3, la1: -2.8, ua2: 1.0, la2: 1.3, th1: 0.4, sh1: 0.1, th2: -0.45, sh2: -0.2 },
    throw: { lean: 0.3, ua1: 1.9, la1: 1.6, ua2: -0.8, la2: -0.6, th1: 0.75, sh1: 0.2, th2: -0.55, sh2: -0.35 },
    cast: { lean: 0.05, ua1: 2.0, la1: 2.4, ua2: 1.8, la2: 2.2, th1: 0.3, sh1: 0.1, th2: -0.3, sh2: -0.1 },
    hurt: { lean: -0.35, ua1: -0.6, la1: -1.2, ua2: -0.9, la2: -1.6, th1: 0.25, sh1: 0.35, th2: -0.15, sh2: 0.1 },
    cheer: { lean: 0, ua1: 2.6, la1: 2.9, ua2: -2.6, la2: -2.9, th1: 0.3, sh1: 0.1, th2: -0.3, sh2: -0.1 },
    work: { lean: 0.35, ua1: 1.2, la1: 0.6, ua2: 0.9, la2: 0.4, th1: 0.35, sh1: 0.05, th2: -0.3, sh2: -0.15 }
  };
  const KEYS = Object.keys(POSES.idle);

  function mix(a, b, k) {
    const o = {};
    for (const key of KEYS) o[key] = a[key] + (b[key] - a[key]) * k;
    return o;
  }
  function breathe(p, t, amt) {
    const s = Math.sin(t * TAU) * (amt || 0.05);
    const o = Object.assign({}, p);
    o.ua1 += s; o.ua2 -= s; o.la1 += s * 1.2; o.la2 -= s; o.lean += s * 0.3;
    o.bob = Math.sin(t * TAU) * 0.012;
    return o;
  }
  function v(a, dir) { return { x: Math.sin(a) * dir, y: Math.cos(a) }; }

  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  /* Strichmännchen. x/y = Fußpunkt auf dem Boden, h = Gesamthöhe. */
  function stick(ctx, x, y, h, pose, o) {
    o = o || {};
    const dir = o.dir || 1;
    const lw = o.lw || Math.max(1.4, h * 0.045);
    const headR = h * 0.105;
    const thigh = h * 0.23, shin = h * 0.23, ua = h * 0.18, la = h * 0.17, torso = h * 0.3;
    const legA = thigh * Math.cos(pose.th1) + shin * Math.cos(pose.sh1);
    const legB = thigh * Math.cos(pose.th2) + shin * Math.cos(pose.sh2);
    const hip = { x: x, y: y - Math.max(legA, legB) - (pose.bob || 0) * h };
    const tv = { x: Math.sin(pose.lean) * dir, y: -Math.cos(pose.lean) };
    const neck = { x: hip.x + tv.x * torso, y: hip.y + tv.y * torso };
    const sh = { x: hip.x + tv.x * torso * 0.88, y: hip.y + tv.y * torso * 0.88 };
    const head = { x: neck.x + tv.x * headR * 1.15, y: neck.y + tv.y * headR * 1.15, r: headR };

    const j = { hip, neck, sh, head, dir, h, lw };
    const d = (p, a, len) => { const u = v(a, dir); return { x: p.x + u.x * len, y: p.y + u.y * len }; };
    j.knee1 = d(hip, pose.th1, thigh); j.foot1 = d(j.knee1, pose.sh1, shin);
    j.knee2 = d(hip, pose.th2, thigh); j.foot2 = d(j.knee2, pose.sh2, shin);
    j.elb1 = d(sh, pose.ua1, ua); j.hand1 = d(j.elb1, pose.la1, la);
    j.elb2 = d(sh, pose.ua2, ua); j.hand2 = d(j.elb2, pose.la2, la);
    j.la1 = pose.la1; j.la2 = pose.la2;

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = o.color; ctx.lineWidth = lw;
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;

    const limb = (a, b, c) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke(); };
    if (o.behind) o.behind(ctx, j);
    limb(hip, j.knee2, j.foot2);
    limb(sh, j.elb2, j.hand2);
    if (o.bulky) { ctx.lineWidth = lw * 2.2; }
    line(ctx, hip.x, hip.y, neck.x, neck.y);
    ctx.lineWidth = lw;
    limb(hip, j.knee1, j.foot1);
    if (o.square) {
      ctx.fillStyle = o.fill;
      ctx.beginPath(); ctx.rect(head.x - headR, head.y - headR, headR * 2, headR * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = o.headFill || o.fill;
      ctx.beginPath(); ctx.arc(head.x, head.y, headR, 0, TAU); ctx.fill(); ctx.stroke();
    }
    if (o.face !== false) face(ctx, j, o);
    if (o.front) o.front(ctx, j);
    limb(sh, j.elb1, j.hand1);
    if (o.hand) o.hand(ctx, j);
    ctx.restore();
    return j;
  }

  function face(ctx, j, o) {
    const r = j.head.r, dir = j.dir;
    const ex = j.head.x + dir * r * 0.38, ey = j.head.y - r * 0.12;
    ctx.save();
    ctx.fillStyle = o.eyeColor || o.color;
    if (o.mood === 'angry') {
      ctx.lineWidth = Math.max(1, j.lw * 0.6);
      line(ctx, ex - dir * r * 0.32, ey - r * 0.32, ex + dir * r * 0.1, ey - r * 0.12);
    }
    ctx.beginPath(); ctx.arc(ex, ey, Math.max(0.9, r * 0.12), 0, TAU); ctx.fill();
    if (o.mood === 'dead') {
      ctx.lineWidth = Math.max(1, j.lw * 0.5);
      line(ctx, ex - r * 0.15, ey - r * 0.15, ex + r * 0.15, ey + r * 0.15);
      line(ctx, ex + r * 0.15, ey - r * 0.15, ex - r * 0.15, ey + r * 0.15);
    }
    ctx.restore();
  }

  /* ---------- Waffen ---------- */
  function sword(ctx, j, len, curved) {
    const u = v(j.la1, j.dir);
    const tip = { x: j.hand1.x + u.x * len, y: j.hand1.y + u.y * len };
    ctx.beginPath();
    ctx.moveTo(j.hand1.x, j.hand1.y);
    if (curved) ctx.quadraticCurveTo(j.hand1.x + u.x * len * 0.6 - u.y * len * 0.12 * j.dir, j.hand1.y + u.y * len * 0.6 + u.x * len * 0.12 * j.dir, tip.x, tip.y);
    else ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    const g = len * 0.14, px = -u.y, py = u.x;
    const gx = j.hand1.x + u.x * len * 0.1, gy = j.hand1.y + u.y * len * 0.1;
    line(ctx, gx - px * g, gy - py * g, gx + px * g, gy + py * g);
  }
  function spear(ctx, j, len) {
    const u = v(j.la1, j.dir);
    const a = { x: j.hand1.x - u.x * len * 0.3, y: j.hand1.y - u.y * len * 0.3 };
    const b = { x: j.hand1.x + u.x * len * 0.7, y: j.hand1.y + u.y * len * 0.7 };
    line(ctx, a.x, a.y, b.x, b.y);
    const px = -u.y, py = u.x, s = len * 0.07;
    ctx.beginPath();
    ctx.moveTo(b.x + u.x * s * 2.2, b.y + u.y * s * 2.2);
    ctx.lineTo(b.x + px * s, b.y + py * s);
    ctx.lineTo(b.x - px * s, b.y - py * s);
    ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
  }
  function bow(ctx, j, r) {
    const cx = j.hand1.x - j.dir * r * 0.55, cy = j.hand1.y;
    ctx.beginPath();
    if (j.dir > 0) ctx.arc(cx, cy, r, -1.15, 1.15); else ctx.arc(cx, cy, r, Math.PI - 1.15, Math.PI + 1.15);
    ctx.stroke();
    const top = { x: cx + j.dir * r * Math.cos(1.15), y: cy - r * Math.sin(1.15) };
    const bot = { x: top.x, y: cy + r * Math.sin(1.15) };
    ctx.save(); ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.4);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(j.hand2.x, j.hand2.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
    ctx.restore();
  }
  function staff(ctx, j, len, orb, orbColor) {
    const x = j.hand1.x, y = j.hand1.y;
    line(ctx, x, y + len * 0.45, x, y - len * 0.55);
    ctx.save(); ctx.fillStyle = orbColor; ctx.beginPath(); ctx.arc(x, y - len * 0.55 - orb * 0.6, orb, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function club(ctx, j, len, color) {
    const u = v(j.la1, j.dir);
    const b = { x: j.hand1.x + u.x * len, y: j.hand1.y + u.y * len };
    ctx.save(); ctx.lineWidth *= 1.6; line(ctx, j.hand1.x, j.hand1.y, b.x, b.y); ctx.restore();
    ctx.save(); ctx.fillStyle = color || ctx.strokeStyle; ctx.beginPath(); ctx.arc(b.x, b.y, len * 0.18, 0, TAU); ctx.fill(); ctx.restore();
  }
  function shield(ctx, j, r, fill) {
    ctx.save(); ctx.fillStyle = fill;
    const x = j.hand2.x + j.dir * r * 0.2, y = j.hand2.y - r * 0.2;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.75, r, 0, 0, TAU); ctx.fill(); ctx.stroke();
    line(ctx, x, y - r * 0.6, x, y + r * 0.6); line(ctx, x - r * 0.45, y, x + r * 0.45, y);
    ctx.restore();
  }
  function pen(ctx, j, len, color) {
    const u = v(j.la1, j.dir), px = -u.y, py = u.x, w = len * 0.09;
    const a = j.hand1, b = { x: a.x + u.x * len, y: a.y + u.y * len };
    ctx.save(); ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x - u.x * len * 0.2 + px * w, a.y - u.y * len * 0.2 + py * w);
    ctx.lineTo(b.x + px * w, b.y + py * w);
    ctx.lineTo(b.x + u.x * w * 2.5, b.y + u.y * w * 2.5);
    ctx.lineTo(b.x - px * w, b.y - py * w);
    ctx.lineTo(a.x - u.x * len * 0.2 - px * w, a.y - u.y * len * 0.2 - py * w);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* ---------- Kopfschmuck ---------- */
  function headband(ctx, j, color, tails) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, j.lw * 1.1);
    ctx.beginPath(); ctx.arc(x, y, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    if (tails) {
      const bx = x - j.dir * r, by = y - r * 0.4;
      ctx.lineWidth = Math.max(1, j.lw * 0.8);
      line(ctx, bx, by, bx - j.dir * r * 1.1, by + r * 0.2);
      line(ctx, bx, by, bx - j.dir * r * 0.9, by + r * 0.7);
    }
    ctx.restore();
  }
  function hatCone(ctx, j, fill) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.3, y - r * 0.55);
    ctx.lineTo(x - j.dir * r * 0.6, y - r * 2.9);
    ctx.lineTo(x + r * 1.3, y - r * 0.55);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function hatKasa(ctx, j, fill) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(x - r * 2, y - r * 0.5); ctx.lineTo(x, y - r * 1.7); ctx.lineTo(x + r * 2, y - r * 0.5); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function crown(ctx, j, fill) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.fillStyle = fill;
    const b = y - r * 0.75, t = y - r * 1.75;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, b); ctx.lineTo(x - r * 0.95, t); ctx.lineTo(x - r * 0.45, b - r * 0.5);
    ctx.lineTo(x, t - r * 0.1); ctx.lineTo(x + r * 0.45, b - r * 0.5); ctx.lineTo(x + r * 0.95, t); ctx.lineTo(x + r * 0.9, b);
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function helmet(ctx, j, fill) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y, r * 1.08, Math.PI, 0); ctx.lineTo(x + r * 1.08, y + r * 0.2); ctx.lineTo(x - r * 1.08, y + r * 0.2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    line(ctx, x + j.dir * r * 0.1, y - r * 0.15, x + j.dir * r * 1.05, y - r * 0.15);
    line(ctx, x, y - r * 1.08, x - j.dir * r * 0.5, y - r * 1.9);
    ctx.restore();
  }
  function mask(ctx, j, color, eye) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.fillStyle = color;
    ctx.beginPath(); ctx.rect(x - r, y - r * 0.38, r * 2, r * 0.5); ctx.fill();
    ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(x + j.dir * r * 0.42, y - r * 0.13, r * 0.13, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function halo(ctx, j, color) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.2, j.lw * 0.9);
    ctx.beginPath(); ctx.ellipse(x, y - r * 1.55, r * 0.95, r * 0.3, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function horns(ctx, j) {
    const { x, y, r } = j.head;
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.8); ctx.quadraticCurveTo(x - r * 1.3, y - r * 1.3, x - r * 0.9, y - r * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.6, y - r * 0.8); ctx.quadraticCurveTo(x + r * 1.3, y - r * 1.3, x + r * 0.9, y - r * 1.9); ctx.stroke();
  }
  function mohawk(ctx, j) {
    const { x, y, r } = j.head;
    for (let i = -2; i <= 2; i++) {
      const a = -Math.PI / 2 + i * 0.32;
      line(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * r * 1.7, y + Math.sin(a) * r * 1.7);
    }
  }
  function cap(ctx, j, fill) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y - r * 0.1, r, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    line(ctx, x, y - r * 0.1, x + j.dir * r * 1.7, y - r * 0.1);
    ctx.restore();
  }
  function patch(ctx, j) {
    const { x, y, r } = j.head;
    ctx.save(); ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(x + j.dir * r * 0.4, y - r * 0.12, r * 0.28, 0, TAU); ctx.fill();
    line(ctx, x - r, y - r * 0.5, x + r, y - r * 0.1);
    ctx.restore();
  }
  function beard(ctx, j) {
    const { x, y, r } = j.head;
    ctx.beginPath(); ctx.moveTo(x - j.dir * r * 0.2, y + r * 0.6); ctx.quadraticCurveTo(x + j.dir * r * 0.5, y + r * 1.8, x + j.dir * r * 0.95, y + r * 0.35); ctx.stroke();
  }
  function ponytail(ctx, j) {
    const { x, y, r } = j.head;
    ctx.beginPath(); ctx.moveTo(x - j.dir * r * 0.8, y - r * 0.6); ctx.quadraticCurveTo(x - j.dir * r * 2, y - r * 0.2, x - j.dir * r * 1.5, y + r * 1.2); ctx.stroke();
  }
  function antenna(ctx, j, color) {
    const { x, y, r } = j.head;
    line(ctx, x, y - r, x + j.dir * r * 0.3, y - r * 1.9);
    ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + j.dir * r * 0.3, y - r * 2.1, r * 0.25, 0, TAU); ctx.fill(); ctx.restore();
  }
  function star(ctx, x, y, r, fill) {
    ctx.save(); ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function wings(ctx, j) {
    const s = j.sh, r = j.h * 0.22, d = -j.dir;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(s.x + d * r, s.y - r * 1.1, s.x + d * r * 1.6, s.y - r * 0.4);
    ctx.quadraticCurveTo(s.x + d * r * 1.1, s.y - r * 0.2, s.x + d * r * 1.2, s.y + r * 0.2);
    ctx.quadraticCurveTo(s.x + d * r * 0.6, s.y, s.x, s.y + r * 0.15); ctx.stroke();
  }
  function cape(ctx, j, fill) {
    const s = j.sh, h = j.h, d = -j.dir;
    ctx.save(); ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(s.x + d * h * 0.18, s.y + h * 0.2, s.x + d * h * 0.28, s.y + h * 0.42);
    ctx.lineTo(s.x + d * h * 0.05, s.y + h * 0.36); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ---------- Looks ---------- */
  // Liefert Zeichenoptionen für einen Look. pal = Farbpalette aus CSS.
  function looks(look, pal, base) {
    const o = Object.assign({ fill: pal.paper, color: base || pal.pencil }, {});
    switch (look) {
      case 'hero':
        o.color = pal.ink; o.front = (c, j) => headband(c, j, pal.gold, true); break;
      case 'brawler':
        o.front = (c, j) => headband(c, j, o.color, false); break;
      case 'sword':
        o.hand = (c, j) => sword(c, j, j.h * 0.34); break;
      case 'archer':
        o.front = (c, j) => ponytail(c, j); o.hand = (c, j) => bow(c, j, j.h * 0.2); break;
      case 'spear':
        o.front = (c, j) => cap(c, j, pal.paper); o.hand = (c, j) => spear(c, j, j.h * 0.7); break;
      case 'ninja':
        o.headFill = o.color; o.face = false;
        o.front = (c, j) => { mask(c, j, pal.ink, pal.paper); headband(c, j, pal.red, true); };
        o.hand = (c, j) => sword(c, j, j.h * 0.22); break;
      case 'mage':
        o.front = (c, j) => { hatCone(c, j, pal.paper); beard(c, j); };
        o.hand = (c, j) => staff(c, j, j.h * 0.6, j.h * 0.06, pal.gold); break;
      case 'knight':
        o.front = (c, j) => helmet(c, j, pal.paper2); o.behind = (c, j) => shield(c, j, j.h * 0.14, pal.paper2);
        o.hand = (c, j) => sword(c, j, j.h * 0.32); break;
      case 'samurai':
        o.front = (c, j) => hatKasa(c, j, pal.paper2); o.hand = (c, j) => sword(c, j, j.h * 0.4, true); break;
      case 'titan':
        o.bulky = true; o.mood = 'angry'; o.hand = (c, j) => club(c, j, j.h * 0.32); break;
      case 'chrono':
        o.front = (c, j) => halo(c, j, pal.ink); o.hand = (c, j) => staff(c, j, j.h * 0.55, j.h * 0.07, pal.paper2); break;
      case 'dragon':
        o.behind = (c, j) => wings(c, j); o.front = (c, j) => horns(c, j); o.hand = (c, j) => spear(c, j, j.h * 0.62); break;
      case 'god':
        o.color = pal.gold;
        o.front = (c, j) => { halo(c, j, pal.gold); crown(c, j, pal.paper); };
        o.hand = (c, j) => staff(c, j, j.h * 0.6, j.h * 0.07, pal.gold); break;
      case 'robot':
        o.square = true; o.front = (c, j) => antenna(c, j, pal.red); o.hand = (c, j) => club(c, j, j.h * 0.16, pal.paper2); break;
      case 'shadow':
        o.color = pal.ink; o.headFill = pal.ink; o.bulky = true; o.eyeColor = pal.red; o.mood = 'angry';
        o.front = (c, j) => crown(c, j, pal.ink); o.hand = (c, j) => sword(c, j, j.h * 0.36, true); break;
      case 'star':
        o.behind = (c, j) => cape(c, j, pal.paper2); o.front = (c, j) => star(c, j.head.x, j.head.y - j.head.r * 1.6, j.head.r * 0.7, pal.gold);
        o.hand = (c, j) => sword(c, j, j.h * 0.34); break;
      case 'origin':
        o.color = pal.ink; o.bulky = true; o.front = (c, j) => halo(c, j, pal.gold); o.hand = (c, j) => pen(c, j, j.h * 0.5, pal.gold); break;

      // Arbeiter
      case 'gatherer': o.hand = (c, j) => { c.save(); c.fillStyle = pal.gold; c.beginPath(); c.arc(j.hand1.x, j.hand1.y, j.h * 0.05, 0, TAU); c.fill(); c.stroke(); c.restore(); }; break;
      case 'lumber': o.front = (c, j) => cap(c, j, pal.paper); o.hand = (c, j) => { sword(c, j, j.h * 0.25); }; break;
      case 'miner': o.front = (c, j) => helmet(c, j, pal.paper2); o.hand = (c, j) => club(c, j, j.h * 0.26, pal.pencil); break;
      case 'smith': o.bulky = true; o.front = (c, j) => beard(c, j); o.hand = (c, j) => club(c, j, j.h * 0.2, pal.ink); break;
      case 'merchant': o.front = (c, j) => hatKasa(c, j, pal.paper2); o.hand = (c, j) => { c.save(); c.fillStyle = pal.gold; c.beginPath(); c.arc(j.hand1.x, j.hand1.y + j.h * 0.06, j.h * 0.08, 0, TAU); c.fill(); c.stroke(); c.restore(); }; break;
      case 'banker': o.front = (c, j) => { const { x, y, r } = j.head; c.save(); c.fillStyle = c.strokeStyle; c.fillRect(x - r * 0.75, y - r * 2.2, r * 1.5, r * 1.3); c.fillRect(x - r * 1.2, y - r * 1, r * 2.4, r * 0.25); c.restore(); }; break;
      case 'alchemist': o.front = (c, j) => hatCone(c, j, pal.paper2); o.hand = (c, j) => { c.save(); c.fillStyle = pal.gold; c.beginPath(); c.arc(j.hand1.x, j.hand1.y, j.h * 0.06, 0, TAU); c.fill(); c.stroke(); c.restore(); }; break;
      case 'portal': o.front = (c, j) => halo(c, j, pal.ink); o.hand = (c, j) => staff(c, j, j.h * 0.5, j.h * 0.06, pal.paper2); break;
      case 'printer': o.square = true; o.front = (c, j) => antenna(c, j, pal.gold); break;
      case 'factory': o.bulky = true; o.front = (c, j) => helmet(c, j, pal.gold); o.hand = (c, j) => club(c, j, j.h * 0.2, pal.pencil); break;
    }
    return o;
  }

  // Gegner-Aussehen aus einem Seed
  function enemyLook(seed, boss, pal) {
    const o = { color: pal.red, fill: pal.paper, mood: 'angry' };
    const r = seed % 7;
    const extras = [];
    if (boss) {
      o.bulky = true;
      extras.push((c, j) => crown(c, j, pal.gold));
      o.hand = (c, j) => club(c, j, j.h * 0.34, pal.red);
    } else {
      if (r === 0) extras.push(horns);
      if (r === 1) extras.push(mohawk);
      if (r === 2) extras.push((c, j) => cap(c, j, pal.paper));
      if (r === 3) extras.push(patch);
      if (r === 4) extras.push(beard);
      if (r === 5) extras.push(horns, beard);
      const w = (seed >> 3) % 4;
      if (w === 0) o.hand = (c, j) => club(c, j, j.h * 0.26, pal.red);
      if (w === 1) o.hand = (c, j) => sword(c, j, j.h * 0.3);
    }
    o.front = (c, j) => { for (const e of extras) e(c, j); };
    return o;
  }

  // Porträt in ein kleines Canvas zeichnen
  function portrait(canvas, look, pal, opts) {
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    const w = canvas.clientWidth || 44, h = canvas.clientHeight || 44;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const o = looks(look, pal, opts && opts.locked ? pal.rule : pal.pencil);
    if (opts && opts.locked) { o.hand = null; o.front = null; o.behind = null; o.color = pal.rule; }
    if (opts && opts.ink) o.color = pal.ink;
    const pose = look === 'archer' ? POSES.aim : look === 'mage' || look === 'god' || look === 'chrono' ? POSES.cast :
      ['gatherer', 'lumber', 'miner', 'smith', 'factory'].includes(look) ? POSES.work : look === 'hero' ? POSES.guard : POSES.idle;
    stick(ctx, w * 0.5, h * 0.94, h * 0.7, pose, Object.assign(o, { dir: 1, lw: Math.max(1.4, h * 0.04) }));
  }

  const ART = { TAU, POSES, mix, breathe, stick, looks, enemyLook, portrait, star, line };
  root.KK_ART = ART;
})(typeof window !== 'undefined' ? window : globalThis);
