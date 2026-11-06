#!/usr/bin/env node
/* Balancing-Simulator: spielt Kritzelkrieg mit einem gierigen Bot durch.
 * Aufruf: node tools/simulate.js [stunden] [taps/s] [runs]
 */
'use strict';
const E = require('../js/engine.js');
const D = E.D;
if (process.env.KK_BAL) Object.assign(E.B, JSON.parse(process.env.KK_BAL));
const QUIET = !!process.env.QUIET;

const HOURS = parseFloat(process.argv[2] || '6');
const TAPS = parseFloat(process.argv[3] || '4');
const MAX_RUNS = parseInt(process.argv[4] || '4', 10);
const DT = 0.25;

const s = E.newState(0);
s._noEvents = true;
let now = 0;
let tapAcc = 0;
let bossFailDps = 0, bossFailAt = 0;
let lastProgressT = 0, lastMax = 1;
const marks = new Set();
const talentOrder = ['tactics', 'greed', 'synergy', 'power', 'foreman', 'precision', 'force', 'endurance', 'dreamer'];
let talentIdx = 0;
let runStart = 0;

function fmt(n) {
  if (n < 1000) return n.toFixed(n < 10 ? 1 : 0);
  const e = Math.floor(Math.log10(n) / 3);
  const sfx = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  return (n / Math.pow(1000, e)).toFixed(2) + (sfx[e] || 'e' + e * 3);
}
function hms(t) { const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = Math.floor(t % 60); return `${h}h${String(m).padStart(2, '0')}m${String(sec).padStart(2, '0')}s`; }

function shop() {
  for (let guard = 0; guard < 200; guard++) {
    const gpd = E.B.goldPerHp * E.goldMult(s, null);
    const cands = [];
    const dm = E.dpsMult(s, null);
    for (const f of D.fighters) {
      const lvl = s.fighters[f.id];
      const p = E.fighterPrice(s, f.id, 1);
      const dd = (E.fighterBaseDps(f, lvl + 1) - E.fighterBaseDps(f, lvl)) * dm;
      cands.push({ kind: 'f', id: f.id, cost: p.cost, val: dd * gpd * 1.6 });
    }
    for (const w of D.workers) {
      const c = s.workers[w.id];
      const p = E.workerPrice(s, w.id, 1);
      const before = E.workerGps(s, w.id, null);
      s.workers[w.id]++; const after = E.workerGps(s, w.id, null); s.workers[w.id]--;
      cands.push({ kind: 'w', id: w.id, cost: p.cost, val: after - before });
    }
    {
      const p = E.heroPrice(s, 1);
      const c0 = E.clickDamage(s, null); s.hero++; const c1 = E.clickDamage(s, null); s.hero--;
      cands.push({ kind: 'h', cost: p.cost, val: (c1 - c0) * TAPS * gpd * 1.6 });
    }
    for (const c of cands) c.ratio = c.val / c.cost;
    cands.sort((a, b) => b.ratio - a.ratio);
    const best = cands[0].ratio;
    const pick = cands.find(c => c.ratio >= best * 0.4 && c.cost <= s.gold);
    if (!pick) break;
    if (pick.kind === 'f') E.buyFighter(s, pick.id, 1);
    else if (pick.kind === 'w') E.buyWorker(s, pick.id, 1);
    else E.buyHero(s, 1);
  }
  while (s.points > 0) {
    for (let i = 0; i < talentOrder.length; i++) {
      const id = talentOrder[(talentIdx + i) % talentOrder.length];
      if (E.buyTalent(s, id)) { talentIdx = (talentIdx + i + 1) % talentOrder.length; break; }
      if (i === talentOrder.length - 1) s.points = 0;
    }
  }
}

let runs = 0;
const end = HOURS * 3600;
let t = 0;
let shopAcc = 0;
console.log(`Simulation: ${HOURS} h, ${TAPS} Taps/s`);
while (t < end) {
  now = t * 1000;
  tapAcc += DT * TAPS;
  while (tapAcc >= 1) { tapAcc--; E.tap(s, now, false); }
  for (const k of D.skills) E.useSkill(s, k.id, now);
  if (s.plane && s.plane.t > 2 && !s.plane.tried) { s.plane.tried = true; if (Math.random() < 0.7) E.catchPlane(s, now); }
  const failsBefore = s.stats.bossFails;
  E.tick(s, DT, now);
  if (s.stats.bossFails > failsBefore) { bossFailDps = E.totalDps(s, null); bossFailAt = t; }
  if (!s.autoAdvance && (E.totalDps(s, null) > bossFailDps * 1.3 || t - bossFailAt > 90)) E.challengeBoss(s);

  shopAcc += DT;
  if (shopAcc >= 1) { shopAcc = 0; shop(); }

  if (s.maxStage > lastMax) { lastMax = s.maxStage; lastProgressT = t; }
  const key = runs + ':' + Math.floor(s.maxStage / 10);
  if (s.maxStage % 10 === 0 && !marks.has(key)) {
    marks.add(key);
    const wi = E.workerIncome(s, null), ic = E.idleCombat(s).gold;
    if (!QUIET || s.maxStage % 20 === 0) console.log(`run ${runs} ${hms(t)} (run ${hms(t - runStart)}) Stufe ${s.maxStage} Lv ${s.level} DPS ${fmt(E.totalDps(s, null))} Klick ${fmt(E.clickDamage(s, null))} Held ${s.hero} Gold/s: Arbeiter ${fmt(wi)} Kampf ${fmt(ic)} Seelen ${s.souls} (+${E.soulsForAscend(s)})`);
  }
  // Aufstieg, wenn es stockt
  const gain = E.soulsForAscend(s);
  if (gain > 0 && runs < MAX_RUNS && (t - lastProgressT > 600 && gain >= Math.max(5, s.souls * 0.6))) {
    console.log(`>>> Aufstieg nach ${hms(t - runStart)} bei Stufe ${s.maxStage}: +${gain} Seelen (vorher ${s.souls})`);
    E.ascend(s, now); runs++; runStart = t; lastMax = 1; lastProgressT = t;
  }
  t += DT;
}
console.log(`Ende: ${hms(t)} Stufe ${s.maxStage} (beste ${s.bestStage}) Lv ${s.level} Seelen ${s.souls} Aufstiege ${s.ascensions} Erfolge ${s._ac}`);
console.log('Kämpfer:', D.fighters.map(f => f.id + '=' + s.fighters[f.id]).join(' '));
console.log('Arbeiter:', D.workers.map(w => w.id + '=' + s.workers[w.id]).join(' '));
