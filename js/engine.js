/* Kritzelkrieg – Spiellogik (ohne DOM, auch in Node lauffähig). */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./data.js') : root.KK_DATA;
  const B = D.BAL;
  const SAVE_VERSION = 1;
  const MAX_NUM = 1e300;

  const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));
  const F = byId(D.fighters), W = byId(D.workers), T = byId(D.talents), K = byId(D.skills);

  function clampNum(n) { return Number.isFinite(n) ? Math.min(n, MAX_NUM) : MAX_NUM; }

  /* ---------- Zustand ---------- */
  function newState(now) {
    now = now || Date.now();
    const s = {
      v: SAVE_VERSION,
      gold: 0, runGold: 0, lifeGold: 0,
      stage: 1, maxStage: 1, bestStage: 1, kills: 0, autoAdvance: true,
      enemy: null, spawnTimer: 0, bossTime: 0,
      hero: 1,
      fighters: {}, workers: {}, talents: {}, skills: {},
      level: 1, xp: 0, points: 0,
      souls: 0, ascensions: 0,
      ach: {},
      stats: { taps: 0, kills: 0, bossKills: 0, crits: 0, playTime: 0, bossFails: 0, maxHit: 0, offlineGold: 0, soulsEarned: 0 },
      settings: { sound: true, sci: false, buy: 1, theme: 'auto' },
      hints: {},
      lastTick: now, created: now, savedAt: 0,
      _ev: [], _clone: 0, _achTimer: 0, _ac: 0
    };
    for (const f of D.fighters) s.fighters[f.id] = 0;
    for (const w of D.workers) s.workers[w.id] = 0;
    for (const t of D.talents) s.talents[t.id] = 0;
    for (const k of D.skills) s.skills[k.id] = { readyAt: 0, activeUntil: 0 };
    spawnEnemy(s);
    return s;
  }

  function emit(s, ev) {
    if (s._noEvents) return;
    s._ev.push(ev);
    if (s._ev.length > 400) s._ev.splice(0, s._ev.length - 400);
  }

  /* ---------- Gegner ---------- */
  function isBoss(stage) { return stage % B.bossEvery === 0; }
  function enemyHp(stage, boss) {
    let hp = B.enemyBaseHp * Math.pow(B.enemyGrowth, stage - 1);
    if (stage > B.lateGrowthFrom) hp *= Math.pow(B.lateGrowth, stage - B.lateGrowthFrom);
    if (boss) hp *= B.bossHpMult;
    return clampNum(hp);
  }
  function bounty(stage, boss) { return enemyHp(stage, boss) * B.goldPerHp; }
  function xpFor(stage, boss) { return Math.max(1, Math.round(stage * (boss ? 5 : 1))); }
  function xpNeed(level) { return Math.round(B.xpBaseNeed * Math.pow(B.xpGrowth, level - 1)); }
  function bossDuration(s) { return B.bossTime + 2 * s.talents.endurance; }
  function bossName(stage) { return D.bossNames[(stage / B.bossEvery - 1) % D.bossNames.length]; }
  function zoneOf(stage) { return D.zones[Math.floor((stage - 1) / 10) % D.zones.length]; }

  function spawnEnemy(s) {
    const boss = isBoss(s.stage);
    const hp = enemyHp(s.stage, boss);
    s.enemy = { hp, maxHp: hp, boss, seed: (Math.random() * 1e9) | 0, name: boss ? bossName(s.stage) : '' };
    s.bossTime = boss ? bossDuration(s) : 0;
    s.spawnTimer = 0;
    emit(s, { t: 'spawn', boss });
  }

  /* ---------- Multiplikatoren ---------- */
  function active(s, id, now) { return now != null && s.skills[id].activeUntil > now; }
  function achCount(s) { return s._ac; }
  function recountAch(s) { let n = 0; for (const k in s.ach) if (s.ach[k]) n++; s._ac = n; return n; }
  function globalMult(s) {
    return (1 + B.soulBonus * s.souls) * Math.pow(B.levelBonus, s.level - 1) * (1 + B.achBonus * s._ac);
  }
  function dpsMult(s, now) {
    return globalMult(s) * (1 + 0.1 * s.talents.tactics) * (active(s, 'rage', now) ? 2 : 1);
  }
  function goldMult(s, now) {
    return globalMult(s) * (1 + 0.1 * s.talents.greed) * (active(s, 'goldrush', now) ? 3 : 1);
  }
  function fame(s) { return Math.pow(B.fameGrowth, s.maxStage - 1); }

  function fighterBaseDps(f, lvl) {
    if (lvl <= 0) return 0;
    return f.dps * lvl * Math.pow(B.fighterMilestoneMult, Math.floor(lvl / B.fighterMilestone));
  }
  function fighterDps(s, id, now) { return clampNum(fighterBaseDps(F[id], s.fighters[id]) * dpsMult(s, now)); }
  function totalDps(s, now) {
    let sum = 0;
    for (const f of D.fighters) sum += fighterBaseDps(f, s.fighters[f.id]);
    return clampNum(sum * dpsMult(s, now));
  }
  function heroBaseDmg(lvl) { return lvl * Math.pow(2, Math.floor(lvl / 25)); }
  function clickSynergy(s) { return 0.01 * s.talents.synergy + 0.01 * Math.floor(s.hero / 25); }
  function clickDamage(s, now) {
    const base = heroBaseDmg(s.hero) * (1 + 0.25 * s.talents.power) * globalMult(s) * (active(s, 'rage', now) ? 2 : 1);
    return clampNum(base + totalDps(s, now) * clickSynergy(s));
  }
  function critChance(s) { return Math.min(0.9, B.critBase + 0.02 * s.talents.precision); }
  function critMult(s) { return B.critMultBase + 0.5 * s.talents.force; }

  function workerMilestoneMult(count) {
    let m = 1;
    for (const x of B.workerMilestones) { if (count >= x) m *= 2; else break; }
    return m;
  }
  function workerBase(w, count) { return w.gps * count * workerMilestoneMult(count); }
  function workerMult(s, now) { return (1 + 0.15 * s.talents.foreman) * fame(s) * goldMult(s, now); }
  function workerGps(s, id, now) { return clampNum(workerBase(W[id], s.workers[id]) * workerMult(s, now)); }
  function workerIncome(s, now) {
    let sum = 0;
    for (const w of D.workers) sum += workerBase(w, s.workers[w.id]);
    return clampNum(sum * workerMult(s, now));
  }
  function nextWorkerMilestone(count) {
    for (const x of B.workerMilestones) if (count < x) return x;
    return null;
  }

  /* ---------- Kosten ---------- */
  function geoCost(base, r, owned, n) {
    if (n <= 0) return 0;
    return clampNum(base * Math.pow(r, owned) * (Math.pow(r, n) - 1) / (r - 1));
  }
  function geoMax(base, r, owned, gold) {
    const first = base * Math.pow(r, owned);
    if (gold < first) return 0;
    return Math.max(0, Math.floor(Math.log(gold * (r - 1) / first + 1) / Math.log(r)));
  }
  function resolveAmount(base, r, owned, gold, mode) {
    if (mode === 'max') return Math.max(1, geoMax(base, r, owned, gold));
    return mode;
  }
  function fighterPrice(s, id, mode) {
    const f = F[id], lvl = s.fighters[id];
    const n = resolveAmount(f.cost, B.fighterCostGrowth, lvl, s.gold, mode);
    return { n, cost: geoCost(f.cost, B.fighterCostGrowth, lvl, n) };
  }
  function workerPrice(s, id, mode) {
    const w = W[id], c = s.workers[id];
    const n = resolveAmount(w.cost, B.workerCostGrowth, c, s.gold, mode);
    return { n, cost: geoCost(w.cost, B.workerCostGrowth, c, n) };
  }
  function heroPrice(s, mode) {
    const n = resolveAmount(B.heroBaseCost, B.heroCostGrowth, s.hero - 1, s.gold, mode);
    return { n, cost: geoCost(B.heroBaseCost, B.heroCostGrowth, s.hero - 1, n) };
  }

  function buyFighter(s, id, mode) {
    const p = fighterPrice(s, id, mode);
    if (p.n <= 0 || s.gold < p.cost) return false;
    const before = s.fighters[id];
    s.gold -= p.cost; s.fighters[id] += p.n;
    emit(s, { t: 'buy', kind: 'fighter', id, first: before === 0 });
    return true;
  }
  function buyWorker(s, id, mode) {
    const p = workerPrice(s, id, mode);
    if (p.n <= 0 || s.gold < p.cost) return false;
    s.gold -= p.cost; s.workers[id] += p.n;
    emit(s, { t: 'buy', kind: 'worker', id });
    return true;
  }
  function buyHero(s, mode) {
    const p = heroPrice(s, mode);
    if (p.n <= 0 || s.gold < p.cost) return false;
    s.gold -= p.cost; s.hero += p.n;
    emit(s, { t: 'buy', kind: 'hero' });
    return true;
  }
  function buyTalent(s, id) {
    const t = T[id];
    if (!t || s.points <= 0) return false;
    if (t.max && s.talents[id] >= t.max) return false;
    s.talents[id]++; s.points--;
    return true;
  }

  /* ---------- Gold, XP, Level ---------- */
  function addGold(s, g) {
    s.gold = clampNum(s.gold + g); s.runGold = clampNum(s.runGold + g); s.lifeGold = clampNum(s.lifeGold + g);
  }
  function addXp(s, x) {
    s.xp += x;
    let guard = 0;
    while (s.xp >= xpNeed(s.level) && guard++ < 1000) {
      s.xp -= xpNeed(s.level);
      s.level++; s.points++;
      emit(s, { t: 'level', level: s.level });
    }
  }

  /* ---------- Kampf ---------- */
  function damage(s, amount, now) {
    const e = s.enemy;
    if (!e || s.spawnTimer > 0 || e.hp <= 0) return false;
    e.hp -= amount;
    if (e.hp <= 0) { killEnemy(s, now); return true; }
    return false;
  }

  function killEnemy(s, now) {
    const e = s.enemy;
    e.hp = 0;
    const g = bounty(s.stage, e.boss) * goldMult(s, now);
    addGold(s, g);
    addXp(s, xpFor(s.stage, e.boss));
    s.stats.kills++;
    if (e.boss) s.stats.bossKills++;
    emit(s, { t: 'kill', gold: g, boss: e.boss, seed: e.seed });

    if (s.stage >= s.maxStage) {
      s.kills++;
      if (e.boss || s.kills >= B.killsPerStage) {
        s.maxStage = s.stage + 1;
        if (s.maxStage > s.bestStage) s.bestStage = s.maxStage;
        s.kills = 0;
        emit(s, { t: 'cleared', stage: s.stage, boss: e.boss });
        if (s.autoAdvance) { s.stage++; emit(s, { t: 'stage', stage: s.stage }); }
      }
    } else if (s.autoAdvance) {
      s.stage++; s.kills = 0;
      emit(s, { t: 'stage', stage: s.stage });
    }
    s.spawnTimer = B.respawn;
  }

  function bossFail(s) {
    s.stats.bossFails++;
    s.autoAdvance = false;
    s.stage = Math.max(1, s.stage - 1);
    s.kills = 0;
    emit(s, { t: 'bossFail' });
    spawnEnemy(s);
  }

  function setStage(s, stage) {
    stage = Math.max(1, Math.min(s.maxStage, stage | 0));
    if (stage === s.stage) return;
    if (stage < s.stage) s.autoAdvance = false;
    s.stage = stage; s.kills = 0;
    emit(s, { t: 'stage', stage });
    spawnEnemy(s);
  }

  function challengeBoss(s) {
    s.autoAdvance = true;
    if (s.stage < s.maxStage) { s.stage = s.maxStage; s.kills = 0; emit(s, { t: 'stage', stage: s.stage }); spawnEnemy(s); }
  }

  function tap(s, now, auto) {
    if (!auto) s.stats.taps++;
    if (!s.enemy || s.spawnTimer > 0 || s.enemy.hp <= 0) { emit(s, { t: 'tap', dmg: 0, crit: false, auto: !!auto }); return 0; }
    let dmg = clickDamage(s, now);
    const crit = Math.random() < critChance(s);
    if (crit) { dmg = clampNum(dmg * critMult(s)); s.stats.crits++; }
    if (dmg > s.stats.maxHit) s.stats.maxHit = dmg;
    emit(s, { t: 'tap', dmg, crit, auto: !!auto });
    damage(s, dmg, now);
    return dmg;
  }

  function skillState(s, id, now) {
    const k = K[id], st = s.skills[id];
    return {
      unlocked: s.level >= k.unlock,
      active: st.activeUntil > now,
      ready: s.level >= k.unlock && st.readyAt <= now,
      left: Math.max(0, (st.activeUntil - now) / 1000),
      cdLeft: Math.max(0, (st.readyAt - now) / 1000)
    };
  }
  function useSkill(s, id, now) {
    const k = K[id];
    if (!k) return false;
    const st = skillState(s, id, now);
    if (!st.ready) return false;
    s.skills[id].readyAt = now + k.cd * 1000;
    s.skills[id].activeUntil = now + k.dur * 1000;
    emit(s, { t: 'skill', id });
    if (id === 'meteor') {
      const dmg = totalDps(s, now) * 60;
      if (dmg > s.stats.maxHit) s.stats.maxHit = dmg;
      emit(s, { t: 'meteor', dmg });
      damage(s, dmg, now);
    }
    return true;
  }

  function tick(s, dt, now) {
    s.stats.playTime += dt;
    const wg = workerIncome(s, now) * dt;
    if (wg > 0) addGold(s, wg);

    if (s.spawnTimer > 0) {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) spawnEnemy(s);
    } else if (s.enemy) {
      if (active(s, 'clones', now)) {
        s._clone += dt * 12;
        while (s._clone >= 1 && s.spawnTimer <= 0) { s._clone -= 1; tap(s, now, true); }
        if (s._clone > 3) s._clone = 0;
      }
      if (s.spawnTimer <= 0) {
        const dps = totalDps(s, now);
        if (dps > 0) damage(s, dps * dt, now);
      }
      if (s.spawnTimer <= 0 && s.enemy.boss && s.enemy.hp > 0) {
        s.bossTime -= dt;
        if (s.bossTime <= 0) bossFail(s);
      }
    }

    s._achTimer += dt;
    if (s._achTimer >= 1) { s._achTimer = 0; checkAchievements(s); }
  }

  function checkAchievements(s) {
    let changed = false;
    for (const a of D.achievements) {
      if (!s.ach[a.id] && a.test(s)) { s.ach[a.id] = true; changed = true; emit(s, { t: 'ach', id: a.id }); }
    }
    if (changed) recountAch(s);
    return changed;
  }

  /* ---------- Offline ---------- */
  function idleCombat(s) {
    let st = s.stage;
    if (isBoss(st)) st = Math.max(1, st - 1);
    const dps = totalDps(s, null);
    if (dps <= 0) return { rate: 0, gold: 0, xp: 0, stage: st };
    const hp = enemyHp(st, isBoss(st));
    const rate = 1 / (hp / dps + B.respawn);
    return { rate, gold: rate * bounty(st, isBoss(st)) * goldMult(s, null), xp: rate * xpFor(st, isBoss(st)), stage: st };
  }
  function offlineEff(s) { return Math.min(1, B.offlineBaseEff + 0.05 * s.talents.dreamer); }
  function offlineCap() { return B.offlineCapHours * 3600; }
  function computeOffline(s, seconds) {
    const t = Math.min(seconds, offlineCap());
    const eff = offlineEff(s);
    const ic = idleCombat(s);
    const gold = clampNum((workerIncome(s, null) + ic.gold) * t * eff);
    const kills = Math.floor(ic.rate * t * eff);
    const xp = Math.floor(ic.xp * t * eff);
    return { seconds, used: t, eff, gold, kills, xp };
  }
  function applyOffline(s, off) {
    const lvl = s.level;
    addGold(s, off.gold);
    addXp(s, off.xp);
    s.stats.kills += off.kills;
    s.stats.offlineGold += off.gold;
    checkAchievements(s);
    return s.level - lvl;
  }

  /* ---------- Aufstieg ---------- */
  function soulsForAscend(s) {
    if (s.maxStage < B.ascendMinStage) return 0;
    const x = s.maxStage - B.soulOffset;
    return Math.floor(Math.pow(x, B.soulPow) / B.soulDiv);
  }
  function ascend(s, now) {
    const gain = soulsForAscend(s);
    if (gain <= 0) return 0;
    s.souls += gain;
    s.stats.soulsEarned += gain;
    s.ascensions++;
    s.gold = 0; s.runGold = 0;
    s.stage = 1; s.maxStage = 1; s.kills = 0; s.autoAdvance = true;
    s.hero = 1;
    for (const f of D.fighters) s.fighters[f.id] = 0;
    for (const w of D.workers) s.workers[w.id] = 0;
    for (const k of D.skills) s.skills[k.id] = { readyAt: 0, activeUntil: 0 };
    emit(s, { t: 'ascend', gain });
    spawnEnemy(s);
    checkAchievements(s);
    return gain;
  }

  /* ---------- Speichern ---------- */
  function serialize(s) {
    const out = {};
    for (const k in s) if (k[0] !== '_') out[k] = s[k];
    return JSON.stringify(out);
  }
  function deserialize(json, now) {
    const raw = typeof json === 'string' ? JSON.parse(json) : json;
    if (!raw || typeof raw !== 'object' || typeof raw.gold !== 'number') throw new Error('Ungültiger Spielstand');
    const s = newState(now);
    for (const k of Object.keys(s)) {
      if (k[0] === '_' || !(k in raw)) continue;
      const v = raw[k];
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && v && typeof v === 'object') {
        if (k === 'enemy') { s.enemy = Object.assign({}, s.enemy, v); continue; }
        for (const kk of Object.keys(v)) {
          if (k === 'skills') { if (s.skills[kk]) s.skills[kk] = Object.assign({ readyAt: 0, activeUntil: 0 }, v[kk]); }
          else s[k][kk] = v[kk];
        }
      } else if (typeof s[k] === typeof v || s[k] === null) {
        s[k] = v;
      }
    }
    s.v = SAVE_VERSION;
    if (!Number.isFinite(s.gold) || s.gold < 0) s.gold = 0;
    s.stage = Math.max(1, Math.min(s.maxStage, s.stage | 0));
    if (!s.enemy || !(s.enemy.maxHp > 0)) spawnEnemy(s);
    if (s.spawnTimer > 0 || s.enemy.hp <= 0) spawnEnemy(s);
    recountAch(s);
    return s;
  }

  const ENGINE = {
    D, B, F, W, T, K, SAVE_VERSION,
    newState, emit, isBoss, enemyHp, bounty, xpFor, xpNeed, bossDuration, zoneOf,
    spawnEnemy, active, achCount, recountAch, globalMult, dpsMult, goldMult, fame,
    fighterBaseDps, fighterDps, totalDps, heroBaseDmg, clickSynergy, clickDamage, critChance, critMult,
    workerMilestoneMult, nextWorkerMilestone, workerGps, workerIncome, workerMult,
    geoCost, geoMax, fighterPrice, workerPrice, heroPrice,
    buyFighter, buyWorker, buyHero, buyTalent,
    addGold, addXp, damage, tap, setStage, challengeBoss, skillState, useSkill, tick,
    checkAchievements, idleCombat, offlineEff, offlineCap, computeOffline, applyOffline,
    soulsForAscend, ascend, serialize, deserialize
  };
  if (isNode) module.exports = ENGINE;
  else root.KK = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
