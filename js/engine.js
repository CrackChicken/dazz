/* Kritzelkrieg – Spiellogik (ohne DOM, auch in Node lauffähig). */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./data.js') : root.KK_DATA;
  const C = isNode ? require('./content.js') : root.KK_CONTENT;
  const RAR = C.rarities;
  const RI = Object.fromEntries(RAR.map((r, i) => [r.id, i]));
  const B = D.BAL;
  const SAVE_VERSION = 1;
  const MAX_NUM = 1e300;

  const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));
  const F = byId(D.fighters), W = byId(D.workers), T = byId(D.talents), K = byId(D.skills), IT = byId(C.items);
  const SLOT_STAT = Object.fromEntries(C.slots.map(x => [x.id, x.stat]));

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
      stats: { taps: 0, kills: 0, bossKills: 0, crits: 0, playTime: 0, bossFails: 0, maxHit: 0, offlineGold: 0, soulsEarned: 0,
        maxCombo: 0, planes: 0, chests: 0, jackpots: 0, dragons: 0, megaKills: 0, starsEarned: 0, legendaries: 0, mythics: 0, pulls: 0 },
      stars: 0,
      inv: { items: {}, skins: {} },
      equip: { waffe: null, banner: null, talisman: null, ranzen: null },
      wear: { hero: 'classic' },
      gacha: { pity: 0, gumRun: 0 },
      wheel: { next: 0 },
      story: { seen: {} },
      settings: { sound: true, music: true, sci: false, buy: 1, theme: 'auto' },
      combo: 0, comboT: 0,
      buffs: { frenzy: 0, clickstorm: 0 },
      plane: null, planeIn: B.planeFirst,
      daily: { day: '', streak: 0 },
      hints: {},
      lastTick: now, created: now, savedAt: 0,
      _ev: [], _clone: 0, _achTimer: 0, _ac: 0, _gear: null
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
  // Sanfter Einstieg: die ersten Stufen haben weniger HP und geben mehr Gold
  function earlyHpMult(stage) { return stage >= 6 ? 1 : [0.35, 0.5, 0.65, 0.8, 0.9][stage - 1]; }
  function earlyGoldMult(stage) { return 1 + 6 * Math.pow(0.55, stage - 1); }
  function enemyHp(stage, boss) {
    let hp = B.enemyBaseHp * Math.pow(B.enemyGrowth, stage - 1) * earlyHpMult(stage);
    if (stage > B.lateGrowthFrom) hp *= Math.pow(B.lateGrowth, stage - B.lateGrowthFrom);
    if (boss) hp *= B.bossHpMult;
    return clampNum(hp);
  }
  function bounty(stage, boss) { return enemyHp(stage, boss) * B.goldPerHp * earlyGoldMult(stage); }
  function xpFor(stage, boss) { return Math.max(1, Math.round(stage * (boss ? 5 : 1))); }
  function xpNeed(level) { return Math.round(B.xpBaseNeed * Math.pow(B.xpGrowth, level - 1)); }
  function bossDuration(s) { return B.bossTime + 2 * s.talents.endurance + (s._gear ? s._gear.boss : 0); }
  function isMega(stage) { return stage % B.megaEvery === 0; }
  function bossInfo(stage) {
    const n = stage / B.bossEvery - 1;
    const b = isMega(stage) ? D.megaBoss : D.bosses[n % D.bosses.length];
    const round = isMega(stage) ? Math.floor(stage / B.megaEvery) - 1 : Math.floor(n / D.bosses.length);
    return { type: b.id, mega: !!b.mega, name: b.names[round % b.names.length] + ' ' + b.title, color: b.color };
  }
  function zoneIndex(stage) { return Math.floor((stage - 1) / 10) % D.zones.length; }
  function zoneOf(stage) { return D.zones[zoneIndex(stage)]; }

  function spawnEnemy(s) {
    const boss = isBoss(s.stage);
    let hp = enemyHp(s.stage, boss);
    const seed = (Math.random() * 1e9) | 0;
    let info;
    if (boss) {
      info = bossInfo(s.stage);
      if (info.mega) hp = clampNum(hp * B.megaHpMult);
    } else {
      const mobs = zoneOf(s.stage).mobs;
      info = { type: mobs[seed % mobs.length], mega: false, name: '' };
    }
    s.enemy = { hp, maxHp: hp, boss, seed, type: info.type, mega: info.mega, name: info.name };
    s.bossTime = boss ? bossDuration(s) : 0;
    s.spawnTimer = 0;
    emit(s, { t: 'spawn', boss, mega: info.mega, type: info.type, name: info.name });
  }

  /* ---------- Multiplikatoren ---------- */
  function active(s, id, now) { return now != null && s.skills[id].activeUntil > now; }
  function achCount(s) { return s._ac; }
  function recountAch(s) { let n = 0; for (const k in s.ach) if (s.ach[k]) n++; s._ac = n; return n; }
  function globalMult(s) {
    return (1 + B.soulBonus * s.souls) * Math.pow(B.levelBonus, s.level - 1) * (1 + B.achBonus * s._ac);
  }
  function buff(s, id, now) { return now != null && s.buffs[id] > now; }
  function gear(s) { return s._gear || recalcGear(s); }
  function dpsMult(s, now) {
    const g = gear(s);
    return globalMult(s) * (1 + 0.1 * s.talents.tactics) * (active(s, 'rage', now) ? 2 : 1) * (buff(s, 'frenzy', now) ? 3 : 1) *
      (1 + g.dps / 100) * (1 + 0.01 * (g.nItems + g.nSkins));
  }
  function goldMult(s, now) {
    const g = gear(s);
    return globalMult(s) * (1 + 0.1 * s.talents.greed) * (active(s, 'goldrush', now) ? 3 : 1) * (1 + g.gold / 100) * (1 + 0.01 * g.nItems);
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
  function comboMult(s) { return 1 + Math.min(s.combo, B.comboMax) / B.comboMax; }
  function clickDamage(s, now) {
    const base = heroBaseDmg(s.hero) * (1 + 0.25 * s.talents.power) * globalMult(s) * (active(s, 'rage', now) ? 2 : 1);
    return clampNum((base + totalDps(s, now) * clickSynergy(s)) * comboMult(s) * (buff(s, 'clickstorm', now) ? 5 : 1) * (1 + gear(s).click / 100));
  }
  function critChance(s) { return Math.min(0.9, B.critBase + 0.02 * s.talents.precision + gear(s).crit / 100); }
  function critMult(s) { return B.critMultBase + 0.5 * s.talents.force + gear(s).critdmg; }
  function comboWindow(s) { return B.comboWindow + gear(s).combo; }

  function workerMilestoneMult(count) {
    let m = 1;
    for (const x of B.workerMilestones) { if (count >= x) m *= 2; else break; }
    return m;
  }
  function workerBase(w, count) { return w.gps * B.workerScale * count * workerMilestoneMult(count); }
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
    const ms = Math.floor(s.fighters[id] / B.fighterMilestone) > Math.floor(before / B.fighterMilestone);
    emit(s, { t: 'buy', kind: 'fighter', id, first: before === 0, milestone: ms });
    return true;
  }
  function buyWorker(s, id, mode) {
    const p = workerPrice(s, id, mode);
    if (p.n <= 0 || s.gold < p.cost) return false;
    const before = s.workers[id];
    s.gold -= p.cost; s.workers[id] += p.n;
    const ms = workerMilestoneMult(s.workers[id]) > workerMilestoneMult(before);
    emit(s, { t: 'buy', kind: 'worker', id, first: before === 0, milestone: ms });
    return true;
  }
  function buyHero(s, mode) {
    const p = heroPrice(s, mode);
    if (p.n <= 0 || s.gold < p.cost) return false;
    const before = s.hero;
    s.gold -= p.cost; s.hero += p.n;
    emit(s, { t: 'buy', kind: 'hero', milestone: Math.floor(s.hero / 25) > Math.floor(before / 25) });
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
      if (s.level % 5 === 0) addStars(s, 2, 'level');
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
    const g = clampNum(e.maxHp * B.goldPerHp * earlyGoldMult(s.stage) * goldMult(s, now));
    addGold(s, g);
    addXp(s, xpFor(s.stage, e.boss) * (e.mega ? 3 : 1));
    s.stats.kills++;
    if (e.boss) {
      s.stats.bossKills++;
      if (e.type === 'dragon') s.stats.dragons++;
      if (e.mega) s.stats.megaKills++;
    }
    emit(s, { t: 'kill', gold: g, boss: e.boss, mega: e.mega, type: e.type, seed: e.seed });
    if (e.boss) openChest(s, g, e.mega);
    if (e.boss && s.stage >= s.maxStage) addStars(s, e.mega ? 5 : 1, 'boss');

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

  // Boss-Truhe: zufälliger Gold-Multiplikator auf die Boss-Beute
  function openChest(s, bossGold, mega) {
    const r = Math.random();
    const roll = mega ? (r < 0.6 ? 5 : 10) : r < 0.5 ? 2 : r < 0.78 ? 3 : r < 0.93 ? 5 : 10;
    const gold = clampNum(bossGold * (roll - 1));
    addGold(s, gold);
    s.stats.chests++;
    if (roll >= 10) { s.stats.jackpots++; addStars(s, 2, 'jackpot'); }
    emit(s, { t: 'chest', roll, gold });
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
    if (!auto) {
      s.stats.taps++;
      s.combo = s.comboT > 0 ? s.combo + 1 : 1;
      s.comboT = comboWindow(s);
      if (s.combo > s.stats.maxCombo) s.stats.maxCombo = s.combo;
      if (s.combo === 10 || s.combo % 25 === 0) emit(s, { t: 'combo', n: s.combo });
    }
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
    if (s.comboT > 0) { s.comboT -= dt; if (s.comboT <= 0) { if (s.combo >= 10) emit(s, { t: 'comboEnd', n: s.combo }); s.combo = 0; } }
    if (s.plane) {
      s.plane.t += dt;
      if (s.plane.t >= s.plane.dur) { s.plane = null; s.planeIn = B.planeMin + Math.random() * (B.planeMax - B.planeMin); }
    } else if ((s.planeIn -= dt) <= 0) {
      s.plane = { t: 0, dur: B.planeDur, seed: (Math.random() * 1e9) | 0, dir: Math.random() < 0.5 ? 1 : -1 };
      emit(s, { t: 'plane' });
    }
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
      if (!s.ach[a.id] && a.test(s)) { s.ach[a.id] = true; changed = true; emit(s, { t: 'ach', id: a.id }); addStars(s, 5, 'ach'); }
    }
    if (changed) recountAch(s);
    return changed;
  }

  /* ---------- Goldflieger & Tagesbonus ---------- */
  function incomePerSec(s, now) { return workerIncome(s, now) + idleCombat(s).gold; }
  function catchPlane(s, now) {
    if (!s.plane) return null;
    s.plane = null;
    s.planeIn = B.planeMin + Math.random() * (B.planeMax - B.planeMin);
    s.stats.planes++;
    const inc = incomePerSec(s, null);
    const kill = s.enemy ? enemyHp(s.stage, false) * B.goldPerHp * goldMult(s, null) : 0;
    const r = Math.random();
    let res;
    if (r < 0.36) res = { kind: 'gold', gold: Math.max(inc * 90, kill * 15, 25) };
    else if (r < 0.55) { s.buffs.frenzy = now + 30000; res = { kind: 'frenzy' }; }
    else if (r < 0.72) { s.buffs.clickstorm = now + 20000; res = { kind: 'clickstorm' }; }
    else if (r < 0.85) { addStars(s, 3, 'plane'); res = { kind: 'stars', stars: 3 }; }
    else if (r < 0.95) res = { kind: 'jackpot', gold: Math.max(inc * 600, kill * 80, 150) };
    else { for (const k of D.skills) s.skills[k.id].readyAt = 0; res = { kind: 'cooldown' }; }
    if (res.gold) { res.gold = clampNum(res.gold); addGold(s, res.gold); }
    emit(s, Object.assign({ t: 'planeCatch' }, res));
    return res;
  }
  function dayKey(ms) { const d = new Date(ms); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function claimDaily(s, now) {
    const today = dayKey(now);
    if (s.daily.day === today) return null;
    const yesterday = dayKey(now - 86400000);
    s.daily.streak = s.daily.day === yesterday ? s.daily.streak + 1 : 1;
    s.daily.day = today;
    const day = Math.min(s.daily.streak, 7);
    const kill = enemyHp(Math.max(1, s.maxStage - 1), false) * B.goldPerHp * goldMult(s, null);
    const gold = clampNum(Math.max(incomePerSec(s, null) * 300, kill * 20, 50) * (1 + 0.5 * (day - 1)));
    addGold(s, gold);
    const stars = 5 + 2 * day;
    addStars(s, stars, 'daily');
    checkAchievements(s);
    return { streak: s.daily.streak, day, gold, stars };
  }

  /* ---------- Sternchen, Ausrüstung, Ziehungen ---------- */
  function addStars(s, n, why) { s.stars += n; s.stats.starsEarned += n; emit(s, { t: 'stars', n, why }); }
  function itemStatId(it) { return it.stat || SLOT_STAT[it.slot]; }
  function itemValue(it, lvl) {
    const r = RI[it.rarity], st = itemStatId(it);
    if (C.special[st]) return C.special[st].vals[r] * (1 + 0.15 * (lvl - 1));
    return RAR[r].pct * (1 + 0.25 * (lvl - 1));
  }
  function recalcGear(s) {
    const g = { click: 0, dps: 0, gold: 0, crit: 0, critdmg: 0, combo: 0, boss: 0, offline: 0, nItems: 0, nSkins: 0 };
    for (const slot in s.equip) {
      const id = s.equip[slot], it = IT[id], lvl = s.inv.items[id];
      if (it && lvl) g[itemStatId(it)] += itemValue(it, lvl);
    }
    for (const id in s.inv.items) if (IT[id] && s.inv.items[id] > 0) g.nItems++;
    for (const k in s.inv.skins) if (s.inv.skins[k]) g.nSkins++;
    s._gear = g;
    return g;
  }
  function equipItem(s, id) {
    const it = IT[id];
    if (!it || !s.inv.items[id]) return false;
    s.equip[it.slot] = s.equip[it.slot] === id ? null : id;
    recalcGear(s);
    emit(s, { t: 'equip', id });
    return true;
  }
  function wearSkin(s, target, style) {
    if (style !== 'classic' && style !== 'base' && !s.inv.skins[target + ':' + style]) return false;
    s.wear[target] = style === 'base' ? undefined : style;
    if (s.wear[target] === undefined) delete s.wear[target];
    emit(s, { t: 'wear', target, style });
    return true;
  }
  function rollRarity(rates) {
    let tot = 0; for (const r of rates) tot += r;
    let x = Math.random() * tot;
    for (let i = 0; i < rates.length; i++) { x -= rates[i]; if (x < 0) return i; }
    return 0;
  }
  function grant(s, ri, allowSkins) {
    const rar = RAR[ri];
    if (ri >= 4) s.stats.legendaries++;
    if (ri >= 5) s.stats.mythics++;
    if (allowSkins && Math.random() < C.machines.pack.skinChance) {
      const hs = C.heroSkins.find(h => h.rarity === rar.id);
      let target, style;
      if (hs && Math.random() < 0.22) { target = 'hero'; style = hs.id; }
      else { target = D.fighters[Math.floor(Math.random() * D.fighters.length)].id; style = C.fighterStyles.find(f => f.rarity === rar.id).id; }
      const key = target + ':' + style;
      if (s.inv.skins[key]) { addStars(s, rar.dup, 'dup'); return { kind: 'skin', target, style, rank: ri, dup: true, refund: rar.dup }; }
      s.inv.skins[key] = true;
      return { kind: 'skin', target, style, rank: ri, isNew: true };
    }
    const pool = C.items.filter(i => i.rarity === rar.id);
    const it = pool[Math.floor(Math.random() * pool.length)];
    const lvl = s.inv.items[it.id] || 0;
    if (!lvl) {
      s.inv.items[it.id] = 1;
      if (!s.equip[it.slot]) s.equip[it.slot] = it.id;
      else { const cur = IT[s.equip[it.slot]]; if (cur && RI[cur.rarity] < ri) s.equip[it.slot] = it.id; }
      return { kind: 'item', id: it.id, rank: ri, isNew: true, lvl: 1 };
    }
    if (lvl < rar.maxLvl) { s.inv.items[it.id] = lvl + 1; return { kind: 'item', id: it.id, rank: ri, up: true, lvl: lvl + 1 }; }
    addStars(s, rar.dup, 'dup');
    return { kind: 'item', id: it.id, rank: ri, dup: true, refund: rar.dup, lvl };
  }
  function pullPack(s, n, free) {
    const M = C.machines.pack;
    const cost = free ? 0 : n === 10 ? M.cost10 : M.cost * n;
    if (s.stars < cost) return null;
    s.stars -= cost;
    const res = [];
    for (let i = 0; i < n; i++) {
      s.gacha.pity++;
      let ri = rollRarity(M.rates);
      if (s.gacha.pity >= M.pity) ri = Math.max(ri, 4);
      if (n === 10 && i === n - 1 && !res.some(r => r.rank >= 2)) ri = Math.max(ri, 2);
      if (ri >= 4) s.gacha.pity = 0;
      res.push(grant(s, ri, true));
    }
    s.stats.pulls += n;
    recalcGear(s);
    emit(s, { t: 'pull', machine: 'pack', n, best: Math.max(...res.map(r => r.rank)) });
    checkAchievements(s);
    return res;
  }
  function gumPrice(s) {
    const kill = enemyHp(Math.max(1, s.maxStage - 1), false) * B.goldPerHp * goldMult(s, null);
    return clampNum(Math.max(60, kill * 25) * Math.pow(1.15, s.gacha.gumRun));
  }
  function pullGum(s) {
    const cost = gumPrice(s);
    if (s.gold < cost) return null;
    s.gold -= cost;
    s.gacha.gumRun++;
    const r = grant(s, rollRarity(C.machines.gum.rates), false);
    s.stats.pulls++;
    recalcGear(s);
    emit(s, { t: 'pull', machine: 'gum', n: 1, best: r.rank });
    checkAchievements(s);
    return [r];
  }
  function wheelReady(s, now) { return now >= s.wheel.next; }
  function spinWheel(s, now, paid) {
    const Wh = C.wheel;
    if (paid) { if (s.stars < Wh.spinCost) return null; s.stars -= Wh.spinCost; }
    else { if (!wheelReady(s, now)) return null; s.wheel.next = now + Wh.freeEvery * 1000; }
    const idx = rollRarity(Wh.segments.map(x => x.w));
    const seg = Wh.segments[idx];
    const inc = incomePerSec(s, null);
    const kill = enemyHp(Math.max(1, s.maxStage - 1), false) * B.goldPerHp * goldMult(s, null);
    const res = { index: idx, id: seg.id };
    switch (seg.id) {
      case 'stars1': addStars(s, 1, 'wheel'); res.stars = 1; break;
      case 'stars3': addStars(s, 3, 'wheel'); res.stars = 3; break;
      case 'stars10': addStars(s, 10, 'wheel'); res.stars = 10; break;
      case 'jackpot': addStars(s, 25, 'wheel'); res.stars = 25; break;
      case 'gold': res.gold = clampNum(Math.max(inc * 300, kill * 20, 100)); addGold(s, res.gold); break;
      case 'gold4': res.gold = clampNum(Math.max(inc * 1200, kill * 80, 400)); addGold(s, res.gold); break;
      case 'frenzy': s.buffs.frenzy = now + 60000; break;
      case 'pack': res.pack = pullPack(s, 1, true); break;
    }
    emit(s, { t: 'wheel', id: seg.id });
    return res;
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
  function offlineEff(s) { return Math.min(1.5, B.offlineBaseEff + 0.05 * s.talents.dreamer + gear(s).offline / 100); }
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
    s.buffs = { frenzy: 0, clickstorm: 0 }; s.combo = 0; s.comboT = 0;
    s.gacha.gumRun = 0;
    addStars(s, 10, 'ascend');
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
    if (s.spawnTimer > 0 || s.enemy.hp <= 0 || !s.enemy.type) spawnEnemy(s);
    recountAch(s);
    recalcGear(s);
    return s;
  }

  const ENGINE = {
    D, B, F, W, T, K, SAVE_VERSION,
    C, RAR, RI, IT, addStars, itemValue, itemStatId, recalcGear, gear, equipItem, wearSkin, pullPack, pullGum, gumPrice, spinWheel, wheelReady, comboWindow,
    newState, emit, isBoss, isMega, bossInfo, zoneIndex, buff, comboMult, openChest, incomePerSec, catchPlane, claimDaily, dayKey,
    enemyHp, bounty, xpFor, xpNeed, bossDuration, zoneOf,
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
