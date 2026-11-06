/* Kritzelkrieg – Monster und Bosse (Canvas-Doodles mit Filzstift-Farben).
 * Alle Monster schauen nach links (zum Helden). x = Mitte, g = Bodenlinie, h = Höhe.
 * o = { t: Zeit, atk: 0..1 Angriffsfortschritt, pal, color, mega, seed }
 * Rückgabe: { box: {x,y,w,h}, mouth: {x,y}, eye: {x,y}, hand: {x,y} } für Effekte. */
(function (root) {
  'use strict';
  const A = root.KK_ART;
  const TAU = Math.PI * 2;

  function rgba(hex, a) {
    if (!hex || hex[0] !== '#') return hex;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }
  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = sh => Math.round(((pa >> sh) & 255) * t + ((pb >> sh) & 255) * (1 - t));
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }
  function tint(col, paper, t) { return /^#[0-9a-f]{6}$/i.test(col) && /^#[0-9a-f]{6}$/i.test(paper) ? mixHex(col, paper, t) : rgba(col, t); }
  function pen(c, color, lw) { c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; }
  function blob(c, fill, stroke) { if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) c.stroke(); }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.5, r), 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot || 0, 0, TAU); }
  function eye(c, x, y, r, pal, look, angry) {
    circle(c, x, y, r); blob(c, pal.paper, true);
    c.save(); c.fillStyle = pal.ink; circle(c, x + (look || -0.35) * r, y + r * 0.1, r * 0.45); c.fill(); c.restore();
    if (angry) { c.save(); c.lineWidth *= 0.9; A.line(c, x - r * 1.1, y - r * 1.3, x + r * 1.1, y - r * 0.7); c.restore(); }
  }
  function glowEye(c, x, y, r, color) {
    c.save(); c.fillStyle = color; c.shadowColor = color; c.shadowBlur = r * 3; circle(c, x, y, r); c.fill(); c.restore();
  }
  function teeth(c, x1, y, x2, n, sz, pal) {
    c.save(); c.fillStyle = pal.paper; c.beginPath();
    const w = (x2 - x1) / n;
    for (let i = 0; i < n; i++) { c.moveTo(x1 + i * w, y); c.lineTo(x1 + (i + 0.5) * w, y + sz); c.lineTo(x1 + (i + 1) * w, y); }
    c.fill(); c.stroke(); c.restore();
  }
  function crownOn(c, x, y, w, pal) {
    c.save(); c.fillStyle = pal.m.yellow; c.strokeStyle = pal.m.orange;
    c.beginPath(); c.moveTo(x - w, y); c.lineTo(x - w, y - w * 0.9); c.lineTo(x - w * 0.5, y - w * 0.4); c.lineTo(x, y - w * 1.1);
    c.lineTo(x + w * 0.5, y - w * 0.4); c.lineTo(x + w, y - w * 0.9); c.lineTo(x + w, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = pal.m.red; circle(c, x, y - w * 0.35, w * 0.16); c.fill();
    c.restore();
  }

  /* ================= Bosse ================= */
  const BOSS = {};

  BOSS.cyclops = (c, x, g, h, o) => {
    const p = o.pal, col = o.col, t = o.t, bob = Math.sin(t * 3) * h * 0.012;
    const lw = Math.max(2.5, h * 0.025);
    pen(c, col, lw);
    const bodyY = g - h * 0.42 + bob;
    // Beine
    A.line(c, x - h * 0.1, bodyY + h * 0.2, x - h * 0.13, g); A.line(c, x + h * 0.1, bodyY + h * 0.2, x + h * 0.13, g);
    // hinterer Arm
    A.line(c, x + h * 0.18, bodyY - h * 0.1, x + h * 0.32, bodyY + h * 0.12);
    // Körper
    ell(c, x, bodyY, h * 0.24, h * 0.27); blob(c, o.fill, true);
    pen(c, rgba(col, 0.5), lw * 0.7); A.line(c, x - h * 0.1, bodyY + h * 0.05, x + h * 0.08, bodyY + h * 0.12);
    pen(c, col, lw);
    // Gürtel
    c.save(); c.fillStyle = p.m.brown; c.fillRect(x - h * 0.23, bodyY + h * 0.06, h * 0.46, h * 0.05); c.restore();
    // Kopf
    const hy = bodyY - h * 0.33;
    circle(c, x - h * 0.02, hy, h * 0.15); blob(c, o.fill, true);
    eye(c, x - h * 0.05, hy - h * 0.02, h * 0.07, p, -0.5, true);
    c.beginPath(); c.moveTo(x - h * 0.02, hy - h * 0.14); c.lineTo(x + h * 0.02, hy - h * 0.27); c.lineTo(x + h * 0.06, hy - h * 0.13); blob(c, p.paper, true);
    c.beginPath(); c.arc(x - h * 0.06, hy + h * 0.08, h * 0.05, 0.2, Math.PI - 0.2); c.stroke();
    // vorderer Arm mit Keule (Angriff: von oben nach unten)
    const a = o.atk > 0 ? (o.atk < 0.5 ? -2.4 + o.atk * 1.4 : -1.7 + (o.atk - 0.5) * 4.4) : -1.2 + Math.sin(t * 2) * 0.1;
    const sx = x - h * 0.17, sy = bodyY - h * 0.12;
    const hx = sx + Math.cos(a + Math.PI) * h * 0.28, hy2 = sy + Math.sin(a + Math.PI) * -h * 0.28;
    A.line(c, sx, sy, hx, hy2);
    const cx2 = hx + Math.cos(a + Math.PI) * h * 0.3, cy2 = hy2 - Math.sin(a + Math.PI) * h * 0.3;
    c.save(); c.lineWidth = lw * 2.2; c.strokeStyle = p.m.brown; A.line(c, hx, hy2, cx2, cy2); c.restore();
    circle(c, cx2, cy2, h * 0.07); blob(c, p.m.brown, true);
    return { box: { x: x - h * 0.3, y: hy - h * 0.25, w: h * 0.6, h: g - hy + h * 0.25 }, mouth: { x: x - h * 0.08, y: hy + h * 0.08 }, eye: { x: x - h * 0.05, y: hy }, hand: { x: cx2, y: cy2 } };
  };

  BOSS.spider = (c, x, g, h, o) => {
    const p = o.pal, col = o.col, t = o.t;
    const lw = Math.max(2.5, h * 0.022);
    pen(c, col, lw);
    const by = g - h * 0.38 + Math.sin(t * 4) * h * 0.01;
    // Beine (4 pro Seite)
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const ph = t * 6 + i * 1.3 + (side > 0 ? 0.6 : 0);
        const ax = x + side * h * 0.05 + (i - 1.5) * h * 0.06, ay = by;
        const lift = o.atk > 0 && i === 0 && side < 0 ? Math.sin(o.atk * Math.PI) * h * 0.3 : 0;
        const kx = ax + side * h * (0.18 + i * 0.05) + (i - 1.5) * h * 0.08, ky = ay - h * 0.22 - Math.sin(ph) * h * 0.03 - lift;
        const fx = kx + side * h * 0.12 + (i - 1.5) * h * 0.04 - (lift ? h * 0.2 : 0), fy = lift ? ky + h * 0.1 : g;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
      }
    }
    // Hinterleib
    ell(c, x + h * 0.2, by - h * 0.06, h * 0.25, h * 0.2); blob(c, o.fill, true);
    c.save(); c.fillStyle = p.m.red; c.beginPath(); c.moveTo(x + h * 0.2, by - h * 0.16); c.lineTo(x + h * 0.25, by - h * 0.06); c.lineTo(x + h * 0.2, by + h * 0.04); c.lineTo(x + h * 0.15, by - h * 0.06); c.closePath(); c.fill(); c.restore();
    // Kopf-Brust
    circle(c, x - h * 0.1, by, h * 0.14); blob(c, o.fill, true);
    for (let i = 0; i < 6; i++) glowEye(c, x - h * 0.17 + (i % 3) * h * 0.045, by - h * 0.05 + Math.floor(i / 3) * h * 0.045, h * 0.018, p.m.red);
    // Beißzangen
    const op = o.atk > 0 ? Math.sin(o.atk * Math.PI) * 0.5 : 0;
    c.beginPath(); c.moveTo(x - h * 0.2, by + h * 0.07); c.quadraticCurveTo(x - h * 0.3, by + h * 0.12, x - h * 0.26, by + h * (0.2 + op * 0.1)); c.stroke();
    c.beginPath(); c.moveTo(x - h * 0.15, by + h * 0.1); c.quadraticCurveTo(x - h * 0.2, by + h * 0.18, x - h * 0.15, by + h * (0.22 + op * 0.1)); c.stroke();
    return { box: { x: x - h * 0.5, y: by - h * 0.35, w: h, h: g - by + h * 0.35 }, mouth: { x: x - h * 0.24, y: by + h * 0.12 }, eye: { x: x - h * 0.15, y: by - h * 0.03 } };
  };

  BOSS.golem = (c, x, g, h, o) => {
    const p = o.pal, col = o.col, t = o.t;
    const lw = Math.max(2.5, h * 0.022);
    pen(c, col, lw);
    const rock = (cx, cy, r, seed) => {
      c.beginPath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = r * (0.82 + ((seed * 13 + i * 7) % 10) / 40); c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9); }
      c.closePath(); blob(c, o.fill, true);
    };
    const bob = Math.sin(t * 2) * h * 0.01;
    rock(x - h * 0.1, g - h * 0.08, h * 0.1, 1); rock(x + h * 0.12, g - h * 0.08, h * 0.1, 2);
    rock(x + h * 0.26, g - h * 0.5 + bob, h * 0.1, 3); rock(x + h * 0.3, g - h * 0.32 + bob, h * 0.09, 4);
    rock(x, g - h * 0.42 + bob, h * 0.26, 5);
    pen(c, rgba(col, 0.6), lw * 0.7);
    A.line(c, x - h * 0.08, g - h * 0.5, x + h * 0.02, g - h * 0.38); A.line(c, x + h * 0.02, g - h * 0.38, x - h * 0.02, g - h * 0.3);
    pen(c, col, lw);
    rock(x - h * 0.03, g - h * 0.75 + bob, h * 0.12, 6);
    glowEye(c, x - h * 0.08, g - h * 0.77 + bob, h * 0.025, p.m.yellow); glowEye(c, x, g - h * 0.77 + bob, h * 0.025, p.m.yellow);
    // Faust (Angriff: Schlag nach vorn)
    const k = o.atk > 0 ? Math.sin(o.atk * Math.PI) : 0;
    const fx = x - h * 0.3 - k * h * 0.25, fy = g - h * 0.45 + bob + k * h * 0.2;
    rock(x - h * 0.24, g - h * 0.55 + bob, h * 0.08, 7);
    rock(fx, fy, h * 0.11, 8);
    return { box: { x: x - h * 0.42, y: g - h * 0.9, w: h * 0.82, h: h * 0.9 }, mouth: { x: x - h * 0.05, y: g - h * 0.7 }, eye: { x: x - h * 0.04, y: g - h * 0.77 }, hand: { x: fx, y: fy } };
  };

  BOSS.kraken = (c, x, g, h, o) => {
    const p = o.pal, col = o.col, t = o.t;
    const lw = Math.max(2.5, h * 0.022);
    pen(c, col, lw);
    const hy = g - h * 0.62 + Math.sin(t * 2) * h * 0.03;
    // Tentakel
    for (let i = 0; i < 7; i++) {
      const bx = x - h * 0.2 + i * h * 0.065;
      const ph = t * 3 + i;
      const whip = o.atk > 0 && i === 1 ? Math.sin(o.atk * Math.PI) : 0;
      const ex = bx - h * 0.1 + Math.sin(ph) * h * 0.1 - whip * h * 0.6, ey = g - h * 0.02 - whip * h * 0.25;
      c.save(); c.lineWidth = lw * 2.4; c.strokeStyle = col;
      c.beginPath(); c.moveTo(bx, hy + h * 0.12); c.quadraticCurveTo(bx + Math.cos(ph) * h * 0.15, (hy + g) / 2, ex, ey); c.stroke();
      c.lineWidth = lw * 1.4; c.strokeStyle = o.fill2;
      c.beginPath(); c.moveTo(bx, hy + h * 0.12); c.quadraticCurveTo(bx + Math.cos(ph) * h * 0.15, (hy + g) / 2, ex, ey); c.stroke();
      c.restore();
    }
    // Mantel
    c.beginPath(); c.moveTo(x - h * 0.24, hy + h * 0.12);
    c.bezierCurveTo(x - h * 0.3, hy - h * 0.3, x - h * 0.05, hy - h * 0.42, x + h * 0.12, hy - h * 0.3);
    c.bezierCurveTo(x + h * 0.3, hy - h * 0.18, x + h * 0.24, hy + h * 0.05, x + h * 0.22, hy + h * 0.12);
    c.closePath(); blob(c, o.fill, true);
    c.save(); c.fillStyle = rgba(col, 0.45);
    for (let i = 0; i < 5; i++) { circle(c, x - h * 0.05 + i * h * 0.06, hy - h * 0.18 + (i % 2) * h * 0.05, h * 0.018); c.fill(); }
    c.restore();
    eye(c, x - h * 0.14, hy, h * 0.06, p, -0.5, true); eye(c, x - h * 0.01, hy + h * 0.01, h * 0.05, p, -0.5, true);
    return { box: { x: x - h * 0.45, y: hy - h * 0.4, w: h * 0.75, h: g - hy + h * 0.4 }, mouth: { x: x - h * 0.1, y: hy + h * 0.1 }, eye: { x: x - h * 0.14, y: hy } };
  };

  BOSS.dragon = (c, x, g, h, o) => {
    const p = o.pal, col = o.col, t = o.t, mega = o.mega;
    const lw = Math.max(2.5, h * 0.02);
    pen(c, col, lw);
    const flap = Math.sin(t * (o.atk > 0 ? 9 : 4));
    const by = g - h * 0.32 + Math.sin(t * 4) * h * 0.01;
    // Flügel hinten
    const wing = (dx, s) => {
      const f = flap * s;
      const sx = x + dx, sy = by - h * 0.1;
      const ex = sx + h * 0.12, ey = by - h * (0.48 + f * 0.14);
      const tx = sx + h * 0.42, ty = by - h * (0.56 + f * 0.2);
      const fingers = [[sx + h * 0.44, by - h * (0.3 + f * 0.1)], [sx + h * 0.33, by - h * (0.16 + f * 0.05)], [sx + h * 0.18, by - h * 0.06]];
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(tx, ty);
      let px = tx, py = ty;
      for (const [fx, fy] of fingers) { c.quadraticCurveTo((px + fx) / 2 - h * 0.04, (py + fy) / 2 + h * 0.03, fx, fy); px = fx; py = fy; }
      c.quadraticCurveTo(px - h * 0.08, py + h * 0.02, sx, sy);
      c.closePath(); blob(c, o.fill2, true);
      for (const [fx, fy] of fingers) A.line(c, ex, ey, fx, fy);
    };
    wing(h * 0.05, 1);
    // Schwanz
    c.beginPath(); c.moveTo(x + h * 0.2, by);
    c.quadraticCurveTo(x + h * 0.45, by + h * 0.05 + Math.sin(t * 3) * h * 0.05, x + h * 0.55, by - h * 0.15);
    c.stroke();
    c.beginPath(); c.moveTo(x + h * 0.55, by - h * 0.22); c.lineTo(x + h * 0.6, by - h * 0.12); c.lineTo(x + h * 0.5, by - h * 0.12); c.closePath(); blob(c, col, true);
    // Beine
    c.save(); c.lineWidth = lw * 2.2;
    A.line(c, x + h * 0.14, by + h * 0.08, x + h * 0.18, g - h * 0.02); A.line(c, x - h * 0.08, by + h * 0.08, x - h * 0.12, g - h * 0.02);
    c.restore();
    A.line(c, x + h * 0.18, g, x + h * 0.12, g); A.line(c, x - h * 0.12, g, x - h * 0.18, g);
    // Körper
    ell(c, x + h * 0.04, by, h * 0.27, h * 0.17); blob(c, o.fill, true);
    pen(c, p.m.yellow, lw * 0.8);
    for (let i = 0; i < 4; i++) A.line(c, x - h * 0.12 + i * h * 0.07, by + h * 0.08, x - h * 0.1 + i * h * 0.07, by + h * 0.13);
    pen(c, col, lw);
    // Hals + Kopf (Angriff: Kopf nach vorn)
    const lunge = o.atk > 0 ? Math.sin(Math.min(1, o.atk * 1.3) * Math.PI) : 0;
    const hx = x - h * 0.3 - lunge * h * 0.08, hy = by - h * 0.32 + Math.sin(t * 2.5) * h * 0.02 + lunge * h * 0.05;
    c.save(); c.lineWidth = lw * 3.2; c.strokeStyle = col;
    c.beginPath(); c.moveTo(x - h * 0.12, by - h * 0.05); c.quadraticCurveTo(x - h * 0.2, by - h * 0.3, hx + h * 0.08, hy); c.stroke();
    c.lineWidth = lw * 1.8; c.strokeStyle = o.fill2;
    c.beginPath(); c.moveTo(x - h * 0.12, by - h * 0.05); c.quadraticCurveTo(x - h * 0.2, by - h * 0.3, hx + h * 0.08, hy); c.stroke();
    c.restore();
    // Rückenzacken
    c.save(); c.fillStyle = p.m.yellow;
    for (let i = 0; i < 5; i++) { const sx = x - h * 0.1 + i * h * 0.07, sy = by - h * 0.14 + Math.abs(i - 2) * h * 0.01; c.beginPath(); c.moveTo(sx - h * 0.025, sy); c.lineTo(sx, sy - h * 0.06); c.lineTo(sx + h * 0.025, sy); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
    // Kopf
    const jaw = o.atk > 0 ? 0.25 + lunge * 0.35 : 0.08 + Math.max(0, Math.sin(t * 1.5)) * 0.08;
    c.beginPath(); c.moveTo(hx + h * 0.1, hy - h * 0.07); c.lineTo(hx - h * 0.12, hy - h * 0.03); c.lineTo(hx - h * 0.13, hy + h * 0.01); c.lineTo(hx + h * 0.1, hy + h * 0.04); c.closePath(); blob(c, o.fill, true);
    c.save(); c.translate(hx + h * 0.08, hy + h * 0.03); c.rotate(-jaw);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-h * 0.2, h * 0.01); c.lineTo(-h * 0.18, h * 0.05); c.lineTo(0, h * 0.05); c.closePath(); blob(c, o.fill, true);
    teeth(c, -h * 0.18, h * 0.01, -h * 0.04, 4, -h * 0.02, p);
    c.restore();
    teeth(c, hx - h * 0.11, hy + h * 0.005, hx + h * 0.02, 4, h * 0.022, p);
    // Hörner
    c.save(); c.fillStyle = p.paper;
    c.beginPath(); c.moveTo(hx + h * 0.06, hy - h * 0.07); c.quadraticCurveTo(hx + h * 0.14, hy - h * 0.16, hx + h * 0.2, hy - h * 0.15); c.lineTo(hx + h * 0.1, hy - h * 0.05); c.closePath(); c.fill(); c.stroke();
    c.restore();
    glowEye(c, hx - h * 0.02, hy - h * 0.04, h * 0.018, p.m.yellow);
    // vorderer Flügel
    wing(-h * 0.02, -1);
    if (mega) crownOn(c, hx + h * 0.02, hy - h * 0.08, h * 0.05, p);
    return { box: { x: x - h * 0.45, y: by - h * 0.65, w: h, h: g - by + h * 0.65 }, mouth: { x: hx - h * 0.14, y: hy + h * 0.02 }, eye: { x: hx - h * 0.02, y: hy - h * 0.04 } };
  };

  BOSS.lich = (c, x, g, h, o) => {
    const p = o.pal, col = o.col, t = o.t;
    const lw = Math.max(2.5, h * 0.022);
    pen(c, col, lw);
    const fy = Math.sin(t * 2) * h * 0.03 - h * 0.05;
    // Robe
    c.beginPath(); c.moveTo(x - h * 0.12, g - h * 0.62 + fy); c.lineTo(x - h * 0.26, g - h * 0.05 + fy);
    for (let i = 0; i <= 6; i++) c.lineTo(x - h * 0.26 + i * h * 0.087, g - h * (i % 2 ? 0.0 : 0.06) + fy + Math.sin(t * 5 + i) * h * 0.01);
    c.lineTo(x + h * 0.12, g - h * 0.62 + fy); c.closePath(); blob(c, o.fill, true);
    // Stab
    const cast = o.atk > 0 ? Math.sin(o.atk * Math.PI) : 0;
    const sx = x - h * 0.3 - cast * h * 0.05;
    c.save(); c.strokeStyle = p.m.brown; A.line(c, sx, g - h * 0.05 + fy, sx + h * 0.02, g - h * 0.85 + fy); c.restore();
    glowEye(c, sx + h * 0.02, g - h * 0.9 + fy, h * (0.035 + cast * 0.03), p.m.green);
    // knochige Arme
    c.save(); c.strokeStyle = p.ink; c.lineWidth = lw * 0.8;
    A.line(c, x - h * 0.1, g - h * 0.55 + fy, sx + h * 0.01, g - h * 0.55 + fy - cast * h * 0.1);
    c.restore();
    // Schädel
    const hy = g - h * 0.72 + fy;
    c.save(); c.strokeStyle = p.ink;
    circle(c, x, hy, h * 0.1); blob(c, p.paper, true);
    c.fillStyle = p.ink; circle(c, x - h * 0.05, hy, h * 0.028); c.fill(); circle(c, x + h * 0.02, hy, h * 0.025); c.fill();
    A.line(c, x - h * 0.05, hy + h * 0.06, x + h * 0.03, hy + h * 0.06);
    for (let i = 0; i < 4; i++) A.line(c, x - h * 0.04 + i * h * 0.022, hy + h * 0.045, x - h * 0.04 + i * h * 0.022, hy + h * 0.075);
    c.restore();
    glowEye(c, x - h * 0.05, hy, h * 0.012, p.m.green); glowEye(c, x + h * 0.02, hy, h * 0.011, p.m.green);
    crownOn(c, x, hy - h * 0.08, h * 0.07, p);
    return { box: { x: x - h * 0.3, y: hy - h * 0.2, w: h * 0.6, h: g - hy + h * 0.2 }, mouth: { x: x - h * 0.02, y: hy + h * 0.06 }, eye: { x: x - h * 0.05, y: hy }, hand: { x: sx + h * 0.02, y: g - h * 0.9 + fy } };
  };

  BOSS.hydra = (c, x, g, h, o) => {
    const p = o.pal, col = o.col, t = o.t;
    const lw = Math.max(2.5, h * 0.022);
    pen(c, col, lw);
    const by = g - h * 0.22;
    A.line(c, x - h * 0.08, by + h * 0.1, x - h * 0.1, g); A.line(c, x + h * 0.12, by + h * 0.1, x + h * 0.14, g);
    c.beginPath(); c.moveTo(x + h * 0.2, by); c.quadraticCurveTo(x + h * 0.45, by + h * 0.1, x + h * 0.5, by - h * 0.1); c.stroke();
    let mouth = null;
    const heads = [[-0.32, -0.55, 0], [-0.12, -0.72, 1.7], [0.08, -0.6, 3.3]];
    heads.forEach(([dx, dy, ph], i) => {
      const lunge = o.atk > 0 && i === 1 ? Math.sin(o.atk * Math.PI) : 0;
      const hx = x + h * dx + Math.sin(t * 2 + ph) * h * 0.04 - lunge * h * 0.25;
      const hy = g + h * dy + Math.cos(t * 2.3 + ph) * h * 0.03 + lunge * h * 0.15;
      c.save(); c.lineWidth = lw * 2.6; c.strokeStyle = col;
      c.beginPath(); c.moveTo(x + h * (dx * 0.3), by - h * 0.05); c.quadraticCurveTo(x + h * dx * 0.6 + h * 0.05, (by + hy) / 2, hx + h * 0.04, hy + h * 0.02); c.stroke();
      c.lineWidth = lw * 1.4; c.strokeStyle = o.fill2;
      c.beginPath(); c.moveTo(x + h * (dx * 0.3), by - h * 0.05); c.quadraticCurveTo(x + h * dx * 0.6 + h * 0.05, (by + hy) / 2, hx + h * 0.04, hy + h * 0.02); c.stroke();
      c.restore();
      ell(c, hx - h * 0.03, hy, h * 0.1, h * 0.065, -0.15); blob(c, o.fill, true);
      teeth(c, hx - h * 0.11, hy + h * 0.02, hx - h * 0.01, 3, h * 0.018, p);
      glowEye(c, hx - h * 0.04, hy - h * 0.02, h * 0.012, p.m.yellow);
      c.save(); c.strokeStyle = p.m.red; c.lineWidth = lw * 0.6;
      A.line(c, hx - h * 0.1, hy + h * 0.01, hx - h * 0.15, hy + h * 0.02 + Math.sin(t * 12 + ph) * h * 0.01);
      c.restore();
      if (i === 1) mouth = { x: hx - h * 0.1, y: hy };
    });
    ell(c, x + h * 0.03, by, h * 0.22, h * 0.14); blob(c, o.fill, true);
    return { box: { x: x - h * 0.45, y: g - h * 0.8, w: h * 0.9, h: h * 0.8 }, mouth, eye: mouth };
  };

  BOSS.mecha = (c, x, g, h, o) => {
    const p = o.pal, col = o.col, t = o.t;
    const lw = Math.max(2.5, h * 0.02);
    pen(c, col, lw);
    const bob = Math.abs(Math.sin(t * 4)) * h * 0.01;
    // Beine
    c.save(); c.fillStyle = o.fill2;
    c.fillRect(x - h * 0.14, g - h * 0.28, h * 0.08, h * 0.28); c.strokeRect(x - h * 0.14, g - h * 0.28, h * 0.08, h * 0.28);
    c.fillRect(x + h * 0.06, g - h * 0.28, h * 0.08, h * 0.28); c.strokeRect(x + h * 0.06, g - h * 0.28, h * 0.08, h * 0.28);
    c.restore();
    // Rumpf
    const ty = g - h * 0.68 - bob;
    c.save(); c.fillStyle = o.fill; c.beginPath(); c.rect(x - h * 0.22, ty, h * 0.44, h * 0.4); c.fill(); c.stroke();
    pen(c, rgba(col, 0.6), lw * 0.6);
    A.line(c, x - h * 0.22, ty + h * 0.14, x + h * 0.22, ty + h * 0.14);
    circle(c, x, ty + h * 0.26, h * 0.06); c.stroke();
    c.restore();
    glowEye(c, x, ty + h * 0.26, h * 0.03, p.m.red);
    // Arme (Kanone vorn)
    const k = o.atk > 0 ? Math.sin(o.atk * Math.PI) : 0;
    c.save(); c.fillStyle = o.fill2;
    c.translate(x - h * 0.22, ty + h * 0.08); c.rotate(-0.2 - k * 0.3);
    c.fillRect(-h * 0.3, -h * 0.04, h * 0.3, h * 0.08); c.strokeRect(-h * 0.3, -h * 0.04, h * 0.3, h * 0.08);
    c.restore();
    c.save(); c.fillStyle = o.fill2; c.fillRect(x + h * 0.22, ty + h * 0.05, h * 0.07, h * 0.25); c.strokeRect(x + h * 0.22, ty + h * 0.05, h * 0.07, h * 0.25); c.restore();
    // Kopf
    const hy = ty - h * 0.18;
    c.save(); c.fillStyle = o.fill; c.fillRect(x - h * 0.12, hy, h * 0.24, h * 0.16); c.strokeRect(x - h * 0.12, hy, h * 0.24, h * 0.16); c.restore();
    c.save(); c.fillStyle = p.ink; c.fillRect(x - h * 0.1, hy + h * 0.05, h * 0.16, h * 0.04); c.restore();
    glowEye(c, x - h * 0.06 + Math.sin(t * 3) * h * 0.03, hy + h * 0.07, h * 0.018, p.m.red);
    A.line(c, x + h * 0.06, hy, x + h * 0.1, hy - h * 0.1);
    glowEye(c, x + h * 0.1, hy - h * 0.11, h * 0.015, t % 1 < 0.5 ? p.m.red : p.m.yellow);
    return { box: { x: x - h * 0.4, y: hy - h * 0.12, w: h * 0.75, h: g - hy + h * 0.12 }, mouth: { x: x - h * 0.06, y: hy + h * 0.07 }, eye: { x: x - h * 0.06, y: hy + h * 0.07 }, hand: { x: x - h * 0.5, y: ty + h * 0.12 } };
  };

  /* ================= Normale Monster ================= */
  const MOB = {};
  MOB.slime = (c, x, g, h, o) => {
    const t = o.t, sq = Math.sin(t * 5) * 0.08, w = h * 0.42 * (1 + sq), hh = h * 0.45 * (1 - sq);
    pen(c, o.col, Math.max(2, h * 0.04));
    c.beginPath(); c.moveTo(x - w, g);
    c.bezierCurveTo(x - w, g - hh * 1.3, x + w, g - hh * 1.3, x + w, g); c.closePath(); blob(c, o.fill, true);
    c.save(); c.strokeStyle = o.pal.paper; c.lineWidth = Math.max(1.5, h * 0.03); c.beginPath(); c.arc(x + w * 0.35, g - hh * 0.7, w * 0.25, -1.2, -0.3); c.stroke(); c.restore();
    eye(c, x - w * 0.35, g - hh * 0.55, h * 0.07, o.pal, -0.5, true); eye(c, x - w * 0.05, g - hh * 0.55, h * 0.06, o.pal, -0.5, true);
    return { box: { x: x - w, y: g - hh, w: w * 2, h: hh } };
  };
  MOB.mushroom = (c, x, g, h, o) => {
    const t = o.t, hop = Math.abs(Math.sin(t * 4)) * h * 0.05;
    pen(c, o.col, Math.max(2, h * 0.04));
    const y = g - hop;
    c.beginPath(); c.rect(x - h * 0.12, y - h * 0.4, h * 0.24, h * 0.38); blob(c, o.pal.paper, true);
    eye(c, x - h * 0.06, y - h * 0.24, h * 0.04, o.pal, -0.5, true); eye(c, x + h * 0.04, y - h * 0.24, h * 0.035, o.pal, -0.5, true);
    c.beginPath(); c.ellipse(x, y - h * 0.42, h * 0.32, h * 0.26, 0, Math.PI, 0); c.closePath(); blob(c, o.fill, true);
    c.save(); c.fillStyle = o.pal.paper; [[-0.15, -0.55], [0.1, -0.6], [0.2, -0.47], [-0.02, -0.48]].forEach(([dx, dy]) => { circle(c, x + h * dx, y + h * dy, h * 0.04); c.fill(); }); c.restore();
    A.line(c, x - h * 0.08, y - h * 0.02, x - h * 0.1, g); A.line(c, x + h * 0.08, y - h * 0.02, x + h * 0.1, g);
    return { box: { x: x - h * 0.32, y: y - h * 0.68, w: h * 0.64, h: h * 0.68 } };
  };
  MOB.bat = (c, x, g, h, o) => {
    const t = o.t, flap = Math.sin(t * 14), y = g - h * 0.6 + Math.sin(t * 3) * h * 0.06;
    pen(c, o.col, Math.max(2, h * 0.04));
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(x, y);
      c.lineTo(x + s * h * 0.25, y - h * 0.18 * flap); c.lineTo(x + s * h * 0.45, y - h * 0.05 * flap);
      c.lineTo(x + s * h * 0.35, y + h * 0.05); c.lineTo(x + s * h * 0.22, y); c.closePath(); blob(c, o.fill2, true);
    }
    ell(c, x, y, h * 0.12, h * 0.14); blob(c, o.fill, true);
    c.beginPath(); c.moveTo(x - h * 0.09, y - h * 0.1); c.lineTo(x - h * 0.1, y - h * 0.22); c.lineTo(x - h * 0.03, y - h * 0.12); c.stroke();
    c.beginPath(); c.moveTo(x + h * 0.09, y - h * 0.1); c.lineTo(x + h * 0.1, y - h * 0.22); c.lineTo(x + h * 0.03, y - h * 0.12); c.stroke();
    glowEye(c, x - h * 0.05, y - h * 0.03, h * 0.025, o.pal.m.red); glowEye(c, x + h * 0.03, y - h * 0.03, h * 0.022, o.pal.m.red);
    return { box: { x: x - h * 0.4, y: y - h * 0.25, w: h * 0.8, h: h * 0.4 } };
  };
  MOB.ghost = (c, x, g, h, o) => {
    const t = o.t, y = g - h * 0.15 + Math.sin(t * 2.5) * h * 0.05;
    pen(c, o.col, Math.max(2, h * 0.035));
    c.save(); c.globalAlpha *= 0.85;
    c.beginPath(); c.moveTo(x - h * 0.25, y);
    c.lineTo(x - h * 0.25, y - h * 0.45); c.arc(x, y - h * 0.45, h * 0.25, Math.PI, 0); c.lineTo(x + h * 0.25, y);
    for (let i = 0; i <= 5; i++) c.lineTo(x + h * 0.25 - i * h * 0.1, y + (i % 2 ? -h * 0.06 : 0) + Math.sin(t * 6 + i) * h * 0.02);
    c.closePath(); blob(c, o.fill, true); c.restore();
    c.save(); c.fillStyle = o.pal.ink;
    ell(c, x - h * 0.1, y - h * 0.48, h * 0.04, h * 0.06); c.fill(); ell(c, x + h * 0.03, y - h * 0.48, h * 0.035, h * 0.055); c.fill();
    ell(c, x - h * 0.04, y - h * 0.32, h * 0.04, h * 0.05 + Math.abs(Math.sin(t * 3)) * h * 0.02); c.fill();
    c.restore();
    return { box: { x: x - h * 0.25, y: y - h * 0.7, w: h * 0.5, h: h * 0.7 } };
  };
  MOB.alien = (c, x, g, h, o) => {
    const t = o.t;
    pen(c, o.col, Math.max(2, h * 0.04));
    A.line(c, x - h * 0.06, g - h * 0.3, x - h * 0.08, g); A.line(c, x + h * 0.06, g - h * 0.3, x + h * 0.08, g);
    ell(c, x, g - h * 0.38, h * 0.1, h * 0.14); blob(c, o.fill, true);
    A.line(c, x - h * 0.08, g - h * 0.4, x - h * 0.24, g - h * 0.38);
    c.save(); c.fillStyle = o.pal.m.pink; c.fillRect(x - h * 0.32, g - h * 0.42, h * 0.1, h * 0.05); c.restore();
    ell(c, x, g - h * 0.68, h * 0.2, h * 0.17); blob(c, o.fill, true);
    for (let i = 0; i < 3; i++) eye(c, x - h * 0.1 + i * h * 0.08, g - h * 0.7 + (i === 1 ? -h * 0.04 : 0), h * 0.04, o.pal, -0.5);
    A.line(c, x, g - h * 0.85, x + Math.sin(t * 4) * h * 0.06, g - h * 0.98);
    glowEye(c, x + Math.sin(t * 4) * h * 0.06, g - h * 1.0, h * 0.025, o.pal.m.yellow);
    return { box: { x: x - h * 0.3, y: g - h * 0.98, w: h * 0.55, h: h * 0.98 } };
  };

  // Strichmännchen-Varianten (nutzen art.js)
  function stickMob(kind) {
    return (c, x, g, h, o) => {
      const look = A.enemyLook(o.seed, false, o.pal);
      look.color = o.col; look.dir = -1; look.lw = Math.max(1.8, h * 0.05);
      const p = o.pal;
      if (kind === 'goblin') {
        look.fill = o.fill;
        const old = look.front;
        look.front = (cx, j) => {
          const { x: hx, y: hy, r } = j.head;
          cx.save(); cx.fillStyle = o.fill;
          for (const s of [-1, 1]) { cx.beginPath(); cx.moveTo(hx + s * r * 0.8, hy - r * 0.2); cx.lineTo(hx + s * r * 2, hy - r * 1); cx.lineTo(hx + s * r * 0.9, hy + r * 0.3); cx.closePath(); cx.fill(); cx.stroke(); }
          cx.restore();
          A.line(cx, hx - r * 0.9, hy + r * 0.1, hx - r * 1.4, hy + r * 0.35);
          void old;
        };
        h *= 0.82;
      }
      if (kind === 'skeleton') {
        look.color = p.ink; look.fill = p.paper; look.eyeColor = p.m.red;
        look.front = (cx, j) => {
          cx.save(); cx.lineWidth = Math.max(1, j.lw * 0.6);
          const mx = (j.hip.x + j.neck.x) / 2, my = (j.hip.y + j.neck.y) / 2;
          for (let i = -1; i <= 1; i++) A.line(cx, mx - j.h * 0.07, my + i * j.h * 0.05, mx + j.h * 0.07, my + i * j.h * 0.05);
          cx.restore();
        };
      }
      if (kind === 'imp') {
        look.fill = o.fill;
        look.behind = (cx, j) => {
          cx.beginPath(); cx.moveTo(j.hip.x, j.hip.y); cx.quadraticCurveTo(j.hip.x + j.h * 0.35, j.hip.y + j.h * 0.1, j.hip.x + j.h * 0.3, j.hip.y - j.h * 0.15); cx.stroke();
          cx.save(); cx.fillStyle = o.col; cx.beginPath(); cx.moveTo(j.hip.x + j.h * 0.3, j.hip.y - j.h * 0.22); cx.lineTo(j.hip.x + j.h * 0.36, j.hip.y - j.h * 0.12); cx.lineTo(j.hip.x + j.h * 0.24, j.hip.y - j.h * 0.13); cx.closePath(); cx.fill(); cx.restore();
        };
        look.front = (cx, j) => {
          const { x: hx, y: hy, r } = j.head;
          cx.beginPath(); cx.moveTo(hx - r * 0.6, hy - r * 0.7); cx.lineTo(hx - r * 0.9, hy - r * 1.7); cx.lineTo(hx - r * 0.1, hy - r * 0.95); cx.stroke();
          cx.beginPath(); cx.moveTo(hx + r * 0.6, hy - r * 0.7); cx.lineTo(hx + r * 0.9, hy - r * 1.7); cx.lineTo(hx + r * 0.1, hy - r * 0.95); cx.stroke();
        };
        look.hand = (cx, j) => {
          const u = { x: Math.sin(j.la1) * j.dir, y: Math.cos(j.la1) };
          cx.save(); cx.strokeStyle = p.m.brown; A.line(cx, j.hand1.x - u.x * j.h * 0.3, j.hand1.y - u.y * j.h * 0.3, j.hand1.x + u.x * j.h * 0.3, j.hand1.y + u.y * j.h * 0.3); cx.restore();
          const tx = j.hand1.x + u.x * j.h * 0.3, ty = j.hand1.y + u.y * j.h * 0.3;
          for (let i = -1; i <= 1; i++) A.line(cx, tx, ty, tx + u.x * j.h * 0.08 - u.y * i * j.h * 0.05, ty + u.y * j.h * 0.08 + u.x * i * j.h * 0.05);
        };
        h *= 0.85;
      }
      let pose = A.breathe(A.POSES.idle, o.t * 0.7 + 0.3, 0.05);
      if (o.hurt > 0) pose = A.mix(pose, A.POSES.hurt, Math.min(1, o.hurt));
      const j = A.stick(c, x, g, h, pose, look);
      return { box: { x: x - h * 0.3, y: g - h, w: h * 0.6, h }, joints: j };
    };
  }
  MOB.stick = stickMob('stick'); MOB.goblin = stickMob('goblin'); MOB.skeleton = stickMob('skeleton'); MOB.imp = stickMob('imp');

  const MOB_COLOR = { stick: null, slime: 'green', mushroom: 'red', goblin: 'green', bat: 'purple', imp: 'red', skeleton: 'purple', ghost: 'blue', alien: 'teal' };

  function draw(c, e, x, g, h, o) {
    const pal = o.pal;
    const colName = e.boss ? o.color : (MOB_COLOR[e.type] || o.zoneColor || 'red');
    const col = pal.m[colName] || pal.red;
    const opts = Object.assign({}, o, { col, fill: tint(col, pal.paper, 0.3), fill2: tint(col, pal.paper, 0.55), mega: e.mega, seed: e.seed });
    // Weißer Untergrund, damit Heftlinien nicht durch das Monster scheinen
    const fn = e.boss ? (BOSS[e.type] || BOSS.cyclops) : (MOB[e.type] || MOB.stick);
    c.save();
    const res = fn(c, x, g, h, opts) || {};
    c.restore();
    res.color = col;
    return res;
  }

  root.KK_MON = { draw, rgba, tint, BOSS_TYPES: Object.keys(BOSS), MOB_TYPES: Object.keys(MOB) };
})(typeof window !== 'undefined' ? window : globalThis);
