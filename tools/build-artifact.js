#!/usr/bin/env node
/* Baut eine einzelne HTML-Datei (alles inline) – z. B. zum Teilen als claude.ai-Artifact.
 * Aufruf: node tools/build-artifact.js [ziel.html]   (Standard: dist/kritzelkrieg.html) */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'dist/kritzelkrieg.html'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const html = read('index.html');
const app = html.slice(html.indexOf('<!-- APP:START -->') + 18, html.indexOf('<!-- APP:END -->')).trim();
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = read('css/style.css');
const noClose = s => s.replace(/<\/script/gi, '<\\/script');

const page = [
  '<title>Kritzelkrieg</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Permanent+Marker&display=swap">',
  `<style>\n${css}\n</style>`,
  app,
  '<script>window.KK_NO_SW = true;</script>',
  ...scripts.map(src => `<script>\n${noClose(read(src))}\n</script>`)
].join('\n');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`${path.relative(process.cwd(), out)} (${(page.length / 1024).toFixed(1)} KB, ${scripts.length} Skripte)`);
