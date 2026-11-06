/* Kritzelkrieg – Spieldaten und Balancing-Konstanten.
 * Alle Zahlen, an denen man drehen möchte, stehen hier. */
(function (root) {
  'use strict';

  const BAL = {
    enemyBaseHp: 6,
    enemyGrowth: 1.5,       // HP-Wachstum pro Stufe
    lateGrowthFrom: 80,     // ab hier wird es zusätzlich zäher
    lateGrowth: 1.02,
    bossEvery: 5,
    bossHpMult: 7,
    bossTime: 30,
    killsPerStage: 10,
    goldPerHp: 0.35,
    respawn: 0.35,

    fighterCostGrowth: 1.08,
    fighterMilestone: 25,
    fighterMilestoneMult: 3,

    heroBaseCost: 6,
    heroCostGrowth: 1.07,

    workerCostGrowth: 1.15,
    workerMilestones: [10, 25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
    fameGrowth: 1.045,       // Ruhm: Arbeiter-Einkommen × fameGrowth^(Höchste Stufe − 1)

    xpBaseNeed: 25,
    xpGrowth: 1.22,
    levelBonus: 1.03,       // ×1.03 auf Gold und Schaden pro Level

    soulBonus: 0.10,        // +10 % pro Seele
    ascendMinStage: 40,
    soulOffset: 30,         // Seelen = (Höchste Stufe − 30)^2,5 / 40
    soulPow: 2.5,
    soulDiv: 40,

    offlineBaseEff: 0.5,
    offlineCapHours: 12,

    critBase: 0.05,
    critMultBase: 3,
    achBonus: 0.02
  };

  // Kämpfer: erzeugen Schaden pro Sekunde (DPS) gegen Gegner.
  const fighters = [
    { id: 'brawler', name: 'Raufbold',       cost: 15,     dps: 2,      shot: 'pow',      every: 0.9, look: 'brawler', desc: 'Prügelt mit bloßen Fäusten.' },
    { id: 'sword',   name: 'Schwertkämpfer', cost: 110,    dps: 10,     shot: 'slash',    every: 1.1, look: 'sword',   desc: 'Klinge aus Lineal, Schneide aus Ehrgeiz.' },
    { id: 'archer',  name: 'Bogenschützin',  cost: 850,    dps: 52,     shot: 'arrow',    every: 1.3, look: 'archer',  desc: 'Trifft jede Kästchenlinie.' },
    { id: 'spear',   name: 'Speerwerfer',    cost: 6800,   dps: 270,    shot: 'spear',    every: 1.5, look: 'spear',   desc: 'Wirft gespitzte Bleistifte.' },
    { id: 'ninja',   name: 'Ninja',          cost: 6.2e4,  dps: 1500,   shot: 'shuriken', every: 0.6, look: 'ninja',   desc: 'Schneller als ein Radiergummi.' },
    { id: 'mage',    name: 'Tintenmagier',   cost: 6e5,    dps: 9000,   shot: 'fireball', every: 1.6, look: 'mage',    desc: 'Zaubert Kleckse, die explodieren.' },
    { id: 'knight',  name: 'Ritter',         cost: 6.5e6,  dps: 6e4,    shot: 'wave',     every: 1.4, look: 'knight',  desc: 'Schild aus Pappe, Mut aus Stahl.' },
    { id: 'samurai', name: 'Samurai',        cost: 7.5e7,  dps: 4.2e5,  shot: 'slash2',   every: 1.0, look: 'samurai', desc: 'Ein Strich. Ein Treffer.' },
    { id: 'titan',   name: 'Kritzeltitan',   cost: 9e8,    dps: 3e6,    shot: 'boulder',  every: 2.0, look: 'titan',   desc: 'So groß, dass er über den Rand malt.' },
    { id: 'chrono',  name: 'Zeitwächter',    cost: 1.2e10, dps: 2.3e7,  shot: 'clock',    every: 1.2, look: 'chrono',  desc: 'Schlägt zu, bevor er ausholt.' },
    { id: 'dragon',  name: 'Drachenreiter',  cost: 1.8e11, dps: 1.9e8,  shot: 'fire',     every: 1.1, look: 'dragon',  desc: 'Reitet einen Drachen aus Kugelschreiber.' },
    { id: 'god',     name: 'Stiftgott',      cost: 3e12,   dps: 1.7e9,  shot: 'bolt',     every: 1.8, look: 'god',     desc: 'Der Stift, der alles gezeichnet hat.' },
    { id: 'robot',   name: 'Robostrich',     cost: 5.5e13, dps: 1.6e10, shot: 'laser',    every: 0.8, look: 'robot',   desc: 'Aus Lineal und Zirkel gebaut.' },
    { id: 'shadow',  name: 'Schattenkönig',  cost: 1e15,   dps: 1.5e11, shot: 'shadow',   every: 1.3, look: 'shadow',  desc: 'Der Fleck, der übrig bleibt, wenn man radiert.' },
    { id: 'star',    name: 'Sternenkrieger', cost: 2e16,   dps: 1.5e12, shot: 'star',     every: 1.0, look: 'star',    desc: 'Kam vom Rand der letzten Seite.' },
    { id: 'origin',  name: 'Urkritzler',     cost: 4.5e17, dps: 1.6e13, shot: 'ink',      every: 2.2, look: 'origin',  desc: 'Der erste Strich, den je jemand gezogen hat.' }
  ];

  // Arbeiter: passives Einkommen in Gold pro Sekunde, auch offline.
  const workers = [
    { id: 'gatherer', name: 'Sammler',       cost: 20,     gps: 0.5,   look: 'gatherer', desc: 'Sammelt Münzen am Heftrand.' },
    { id: 'lumber',   name: 'Holzfäller',    cost: 260,    gps: 4,     look: 'lumber',   desc: 'Fällt Bleistiftbäume.' },
    { id: 'miner',    name: 'Bergarbeiter',  cost: 3200,   gps: 28,    look: 'miner',    desc: 'Gräbt nach Graphit und Gold.' },
    { id: 'smith',    name: 'Schmied',       cost: 38000,  gps: 200,   look: 'smith',    desc: 'Schmiedet Klingen aus Büroklammern.' },
    { id: 'merchant', name: 'Händler',       cost: 4.8e5,  gps: 1500,  look: 'merchant', desc: 'Verkauft Kritzeleien als Kunst.' },
    { id: 'banker',   name: 'Bankier',       cost: 6.5e6,  gps: 11500, look: 'banker',   desc: 'Zinseszins? Zinseszinseszins.' },
    { id: 'alchemist',name: 'Alchemist',     cost: 9e7,    gps: 9e4,   look: 'alchemist',desc: 'Verwandelt Tinte in Gold.' },
    { id: 'portal',   name: 'Portalmeister', cost: 1.3e9,  gps: 7.2e5, look: 'portal',   desc: 'Holt Gold von der nächsten Seite.' },
    { id: 'printer',  name: 'Gelddrucker',   cost: 2.1e10, gps: 6e6,   look: 'printer',  desc: 'Druckt. Und druckt. Und druckt.' },
    { id: 'factory',  name: 'Tintenfabrik',  cost: 3.6e11, gps: 5.2e7, look: 'factory',  desc: 'Eine ganze Fabrik voller Strichmännchen.' }
  ];

  // Talente: 1 Talentpunkt pro Level-Aufstieg. max: 0 = unbegrenzt.
  const talents = [
    { id: 'power',    name: 'Muskelkraft',  max: 0,  desc: '+25 % Klickschaden' },
    { id: 'tactics',  name: 'Kriegskunst',  max: 0,  desc: '+10 % Kämpfer-DPS' },
    { id: 'greed',    name: 'Gier',         max: 0,  desc: '+10 % Gold aus allen Quellen' },
    { id: 'foreman',  name: 'Vorarbeiter',  max: 0,  desc: '+15 % Arbeiter-Einkommen' },
    { id: 'precision',name: 'Präzision',    max: 15, desc: '+2 % Krit-Chance' },
    { id: 'force',    name: 'Wucht',        max: 20, desc: '+50 % Krit-Schaden' },
    { id: 'synergy',  name: 'Synergie',     max: 20, desc: 'Klicks verursachen +1 % deiner DPS' },
    { id: 'endurance',name: 'Ausdauer',     max: 10, desc: '+2 s Zeit gegen Bosse' },
    { id: 'dreamer',  name: 'Träumer',      max: 10, desc: '+5 % Offline-Einkommen' }
  ];

  // Aktive Fähigkeiten, freigeschaltet über das Level.
  const skills = [
    { id: 'rage',     name: 'Wutanfall',      unlock: 2,  dur: 30, cd: 180, key: '1', desc: 'Doppelter Schaden für 30 s' },
    { id: 'goldrush', name: 'Goldrausch',     unlock: 5,  dur: 30, cd: 300, key: '2', desc: 'Dreifaches Gold für 30 s' },
    { id: 'clones',   name: 'Schattenklone',  unlock: 8,  dur: 30, cd: 420, key: '3', desc: 'Klone tippen 12× pro Sekunde, 30 s lang' },
    { id: 'meteor',   name: 'Tintenmeteor',   unlock: 12, dur: 0,  cd: 600, key: '4', desc: 'Sofort 60 Sekunden deiner DPS als Schaden' }
  ];

  const zones = [
    { name: 'Heftrand-Wiese',  props: 'meadow' },
    { name: 'Radiergummi-Wüste', props: 'desert' },
    { name: 'Spitzer-Gebirge', props: 'mountain' },
    { name: 'Tintenvulkan',    props: 'volcano' },
    { name: 'Pappburg',        props: 'castle' },
    { name: 'Klecks-Friedhof', props: 'graveyard' },
    { name: 'Seitenrand-All',  props: 'space' }
  ];

  const bossNames = [
    'Grobian', 'Klecksbart', 'Der Radierer', 'Knickohr', 'Tintenfass-Tom',
    'Lord Linienlos', 'Eselsohr', 'Der Spitzer', 'Kugelschreiber-Kurt', 'Kaffeefleck',
    'Herr Durchgestrichen', 'Die Korrektur', 'Fineliner-Fritz', 'Büroklammer-Baron', 'Tesafilm-Titan'
  ];

  // Erfolge: bleiben beim Aufstieg erhalten, jeder gibt +2 % auf alles.
  const achievements = [
    { id: 'tap1',     name: 'Erster Strich',      desc: 'Tippe zum ersten Mal',          test: s => s.stats.taps >= 1 },
    { id: 'tap1k',    name: 'Fingerübung',        desc: '1.000 Taps',                    test: s => s.stats.taps >= 1e3 },
    { id: 'tap10k',   name: 'Sehnenscheide',      desc: '10.000 Taps',                   test: s => s.stats.taps >= 1e4 },
    { id: 'kill100',  name: 'Aufräumer',          desc: '100 Gegner besiegt',            test: s => s.stats.kills >= 100 },
    { id: 'kill1k',   name: 'Radierkommando',     desc: '1.000 Gegner besiegt',          test: s => s.stats.kills >= 1e3 },
    { id: 'kill10k',  name: 'Seitenleerer',       desc: '10.000 Gegner besiegt',         test: s => s.stats.kills >= 1e4 },
    { id: 'kill100k', name: 'Heft voll',          desc: '100.000 Gegner besiegt',        test: s => s.stats.kills >= 1e5 },
    { id: 'boss10',   name: 'Bossjäger',          desc: '10 Bosse besiegt',              test: s => s.stats.bossKills >= 10 },
    { id: 'boss100',  name: 'Bossschreck',        desc: '100 Bosse besiegt',             test: s => s.stats.bossKills >= 100 },
    { id: 'st10',     name: 'Kapitel 2',          desc: 'Erreiche Stufe 10',             test: s => s.bestStage >= 10 },
    { id: 'st25',     name: 'Seitenwechsel',      desc: 'Erreiche Stufe 25',             test: s => s.bestStage >= 25 },
    { id: 'st50',     name: 'Halbes Heft',        desc: 'Erreiche Stufe 50',             test: s => s.bestStage >= 50 },
    { id: 'st100',    name: 'Hundert Seiten',     desc: 'Erreiche Stufe 100',            test: s => s.bestStage >= 100 },
    { id: 'st150',    name: 'Sammelband',         desc: 'Erreiche Stufe 150',            test: s => s.bestStage >= 150 },
    { id: 'st200',    name: 'Enzyklopädie',       desc: 'Erreiche Stufe 200',            test: s => s.bestStage >= 200 },
    { id: 'gold1m',   name: 'Millionär',          desc: '1 Mio. Gold insgesamt verdient', test: s => s.lifeGold >= 1e6 },
    { id: 'gold1b',   name: 'Milliardär',         desc: '1 Mrd. Gold insgesamt verdient', test: s => s.lifeGold >= 1e9 },
    { id: 'gold1t',   name: 'Tintenbaron',        desc: '1 Bio. Gold insgesamt verdient', test: s => s.lifeGold >= 1e12 },
    { id: 'gold1qa',  name: 'Goldenes Heft',      desc: '1 Brd. Gold insgesamt verdient', test: s => s.lifeGold >= 1e15 },
    { id: 'lvl10',    name: 'Lehrling',           desc: 'Erreiche Level 10',             test: s => s.level >= 10 },
    { id: 'lvl25',    name: 'Veteran',            desc: 'Erreiche Level 25',             test: s => s.level >= 25 },
    { id: 'lvl50',    name: 'Legende',            desc: 'Erreiche Level 50',             test: s => s.level >= 50 },
    { id: 'crit500',  name: 'Kritiker',           desc: '500 kritische Treffer',         test: s => s.stats.crits >= 500 },
    { id: 'squad',    name: 'Volle Truppe',       desc: 'Besitze jeden Kämpfertyp',      test: s => fighters.every(f => s.fighters[f.id] > 0) },
    { id: 'work100',  name: 'Gewerkschaft',       desc: '100 Arbeiter gleichzeitig',     test: s => workers.reduce((a, w) => a + s.workers[w.id], 0) >= 100 },
    { id: 'asc1',     name: 'Wiedergeboren',      desc: 'Steige zum ersten Mal auf',     test: s => s.ascensions >= 1 },
    { id: 'asc5',     name: 'Kreislauf',          desc: 'Steige 5-mal auf',              test: s => s.ascensions >= 5 },
    { id: 'asc10',    name: 'Ewiger Strich',      desc: 'Steige 10-mal auf',             test: s => s.ascensions >= 10 },
    { id: 'bigHit',   name: 'Volltreffer',        desc: 'Ein Treffer über 1 Mio.',       test: s => s.stats.maxHit >= 1e6 }
  ];

  const DATA = { BAL, fighters, workers, talents, skills, zones, bossNames, achievements };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.KK_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
