#!/usr/bin/env node
/* Erzeugt die App-Icons (PNG) mit derselben Zeichen-Engine wie das Spiel.
 * Aufruf: node tools/make-icons.js   (benötigt Playwright + Chromium) */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const art = fs.readFileSync(path.join(ROOT, 'js/art.js'), 'utf8');

const html = `<!doctype html><html><body style="margin:0"><canvas id="c"></canvas><script>${art}</script>
<script>
function draw(size, maskable) {
  const c = document.getElementById('c'); c.width = size; c.height = size;
  const x = c.getContext('2d');
  const pal = { paper: '#f7f5ec', paper2: '#ebe8dc', rule: '#c6d5ea', margin: '#e3a3a0', ink: '#1f2d63', pencil: '#5f6168', red: '#c4372f', gold: '#f2bd18', goldInk: '#946700' };
  x.fillStyle = pal.paper; x.fillRect(0, 0, size, size);
  x.strokeStyle = pal.rule; x.lineWidth = size / 160;
  for (let y = size * 0.12; y < size; y += size * 0.1) { x.beginPath(); x.moveTo(0, y); x.lineTo(size, y); x.stroke(); }
  x.strokeStyle = pal.margin; x.lineWidth = size / 110;
  x.beginPath(); x.moveTo(size * 0.14, 0); x.lineTo(size * 0.14, size); x.stroke();
  const s = maskable ? 0.72 : 0.9, o = (1 - s) / 2 * size;
  x.save(); x.translate(o, o); x.scale(s, s);
  const A = KK_ART;
  // Bodenstrich
  x.strokeStyle = pal.ink; x.lineWidth = size / 70; x.lineCap = 'round';
  x.beginPath(); x.moveTo(size * 0.08, size * 0.86); x.lineTo(size * 0.92, size * 0.86); x.stroke();
  // Gegner (rot) wird getroffen
  const en = Object.assign({ color: pal.red, fill: pal.paper, mood: 'angry', dir: -1, lw: size / 42 }, {});
  A.stick(x, size * 0.76, size * 0.86, size * 0.5, A.POSES.hurt, en);
  // Held (Tinte) schlägt zu
  const hero = A.looks('hero', pal); hero.dir = 1; hero.lw = size / 32;
  A.stick(x, size * 0.36, size * 0.86, size * 0.66, A.POSES.punch, hero);
  // Treffer-Stern
  x.lineWidth = size / 90; x.strokeStyle = pal.ink;
  A.star(x, size * 0.63, size * 0.4, size * 0.09, pal.gold);
  x.restore();
  return c.toDataURL('image/png');
}
</script></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const out = [['icon-512.png', 512, false], ['icon-192.png', 192, false], ['apple-touch-icon.png', 180, false], ['icon-maskable-512.png', 512, true]];
  for (const [name, size, mask] of out) {
    const url = await page.evaluate(([s, m]) => draw(s, m), [size, mask]);
    fs.writeFileSync(path.join(ROOT, 'icons', name), Buffer.from(url.split(',')[1], 'base64'));
    console.log('icons/' + name);
  }
  await browser.close();
})();
