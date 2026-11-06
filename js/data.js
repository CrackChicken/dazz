/* Kritzelkrieg – Spieldaten und Balancing-Konstanten.
 * Alle Zahlen, an denen man drehen möchte, stehen hier. */
(function (root) {
  'use strict';

  const BAL = {
    enemyBaseHp: 15,
    enemyGrowth: 1.55,      // HP-Wachstum pro Stufe
    lateGrowthFrom: 80,     // ab hier wird es zusätzlich zäher
    lateGrowth: 1.02,
    bossEvery: 5,
    bossHpMult: 8,
    megaEvery: 25,          // jede 25. Stufe: Mega-Boss
    megaHpMult: 1.6,
    bossTime: 30,
    killsPerStage: 10,
    goldPerHp: 0.08,
    respawn: 0.5,

    fighterCostGrowth: 1.09,
    fighterMilestone: 25,
    fighterMilestoneMult: 3,

    heroBaseCost: 12,
    heroCostGrowth: 1.1,

    workerCostGrowth: 1.15,
    workerMilestones: [10, 25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
    workerScale: 0.4,        // Faktor auf alle Arbeiter-Einkommen
    fameGrowth: 1.04,       // Ruhm: Arbeiter-Einkommen × fameGrowth^(Höchste Stufe − 1)

    xpBaseNeed: 40,
    xpGrowth: 1.24,
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
    achBonus: 0.02,

    comboWindow: 1.0,       // Sekunden zwischen Taps, damit die Combo hält
    comboMax: 150,          // Combo 150 = doppelter Klickschaden
    planeFirst: 40,         // erster Goldflieger nach 40 s
    planeMin: 70, planeMax: 160,
    planeDur: 8
  };

  // Farben: Namen der Filzstift-Farben aus dem CSS (--m-<name>)
  const fighters = [
    { id: 'brawler', name: 'Raufbold',       cost: 15,     dps: 2,      shot: 'pow',      every: 0.9, color: 'orange', desc: 'Prügelt mit bloßen Fäusten.' },
    { id: 'sword',   name: 'Schwertkämpfer', cost: 110,    dps: 10,     shot: 'slash',    every: 1.1, color: 'blue',   desc: 'Klinge aus Lineal, Schneide aus Ehrgeiz.' },
    { id: 'archer',  name: 'Bogenschützin',  cost: 850,    dps: 52,     shot: 'arrow',    every: 1.3, color: 'green',  desc: 'Trifft jede Kästchenlinie.' },
    { id: 'spear',   name: 'Speerwerfer',    cost: 6800,   dps: 270,    shot: 'spear',    every: 1.5, color: 'brown',  desc: 'Wirft gespitzte Bleistifte.' },
    { id: 'ninja',   name: 'Ninja',          cost: 6.2e4,  dps: 1500,   shot: 'shuriken', every: 0.6, color: 'purple', desc: 'Schneller als ein Radiergummi.' },
    { id: 'mage',    name: 'Tintenmagier',   cost: 6e5,    dps: 9000,   shot: 'fireball', every: 1.6, color: 'pink',   desc: 'Zaubert Kleckse, die explodieren.' },
    { id: 'knight',  name: 'Ritter',         cost: 6.5e6,  dps: 6e4,    shot: 'wave',     every: 1.4, color: 'teal',   desc: 'Schild aus Pappe, Mut aus Stahl.' },
    { id: 'samurai', name: 'Samurai',        cost: 7.5e7,  dps: 4.2e5,  shot: 'slash2',   every: 1.0, color: 'red',    desc: 'Ein Strich. Ein Treffer.' },
    { id: 'titan',   name: 'Kritzeltitan',   cost: 9e8,    dps: 3e6,    shot: 'boulder',  every: 2.0, color: 'orange', desc: 'So groß, dass er über den Rand malt.' },
    { id: 'chrono',  name: 'Zeitwächter',    cost: 1.2e10, dps: 2.3e7,  shot: 'clock',    every: 1.2, color: 'blue',   desc: 'Schlägt zu, bevor er ausholt.' },
    { id: 'dragon',  name: 'Drachenreiter',  cost: 1.8e11, dps: 1.9e8,  shot: 'fire',     every: 1.1, color: 'green',  desc: 'Reitet einen Drachen aus Kugelschreiber.' },
    { id: 'god',     name: 'Stiftgott',      cost: 3e12,   dps: 1.7e9,  shot: 'bolt',     every: 1.8, color: 'yellow', desc: 'Der Stift, der alles gezeichnet hat.' },
    { id: 'robot',   name: 'Robostrich',     cost: 5.5e13, dps: 1.6e10, shot: 'laser',    every: 0.8, color: 'teal',   desc: 'Aus Lineal und Zirkel gebaut.' },
    { id: 'shadow',  name: 'Schattenkönig',  cost: 1e15,   dps: 1.5e11, shot: 'shadow',   every: 1.3, color: 'purple', desc: 'Der Fleck, der übrig bleibt, wenn man radiert.' },
    { id: 'star',    name: 'Sternenkrieger', cost: 2e16,   dps: 1.5e12, shot: 'star',     every: 1.0, color: 'yellow', desc: 'Kam vom Rand der letzten Seite.' },
    { id: 'origin',  name: 'Urkritzler',     cost: 4.5e17, dps: 1.6e13, shot: 'ink',      every: 2.2, color: 'red',    desc: 'Der erste Strich, den je jemand gezogen hat.' }
  ].map(f => Object.assign({ look: f.id }, f));

  // Arbeiter: passives Einkommen in Gold pro Sekunde, auch offline.
  const workers = [
    { id: 'gatherer', name: 'Sammler',       cost: 20,     gps: 0.5,   color: 'yellow', desc: 'Sammelt Münzen am Heftrand.' },
    { id: 'lumber',   name: 'Holzfäller',    cost: 260,    gps: 4,     color: 'brown',  desc: 'Fällt Bleistiftbäume.' },
    { id: 'miner',    name: 'Bergarbeiter',  cost: 3200,   gps: 28,    color: 'orange', desc: 'Gräbt nach Graphit und Gold.' },
    { id: 'smith',    name: 'Schmied',       cost: 38000,  gps: 200,   color: 'red',    desc: 'Schmiedet Klingen aus Büroklammern.' },
    { id: 'merchant', name: 'Händler',       cost: 4.8e5,  gps: 1500,  color: 'teal',   desc: 'Verkauft Kritzeleien als Kunst.' },
    { id: 'banker',   name: 'Bankier',       cost: 6.5e6,  gps: 11500, color: 'green',  desc: 'Zinseszins? Zinseszinseszins.' },
    { id: 'alchemist',name: 'Alchemist',     cost: 9e7,    gps: 9e4,   color: 'purple', desc: 'Verwandelt Tinte in Gold.' },
    { id: 'portal',   name: 'Portalmeister', cost: 1.3e9,  gps: 7.2e5, color: 'blue',   desc: 'Holt Gold von der nächsten Seite.' },
    { id: 'printer',  name: 'Gelddrucker',   cost: 2.1e10, gps: 6e6,   color: 'pink',   desc: 'Druckt. Und druckt. Und druckt.' },
    { id: 'factory',  name: 'Tintenfabrik',  cost: 3.6e11, gps: 5.2e7, color: 'orange', desc: 'Eine ganze Fabrik voller Strichmännchen.' }
  ].map(w => Object.assign({ look: w.id }, w));

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
    { id: 'rage',     name: 'Wutanfall',      unlock: 3,  dur: 30, cd: 180, key: '1', color: 'red',    desc: 'Doppelter Schaden für 30 s' },
    { id: 'goldrush', name: 'Goldrausch',     unlock: 6,  dur: 30, cd: 300, key: '2', color: 'yellow', desc: 'Dreifaches Gold für 30 s' },
    { id: 'clones',   name: 'Schattenklone',  unlock: 10, dur: 30, cd: 420, key: '3', color: 'purple', desc: 'Klone tippen 12× pro Sekunde, 30 s lang' },
    { id: 'meteor',   name: 'Tintenmeteor',   unlock: 14, dur: 0,  cd: 600, key: '4', color: 'blue',   desc: 'Sofort 60 Sekunden deiner DPS als Schaden' }
  ];

  // Kapitel: Name, Doodles, Wasserfarben (Himmel oben/unten, Boden), Gegnertypen
  const zones = [
    { name: 'Heftrand-Wiese',    props: 'meadow',    sky: ['blue', 'yellow'],  ground: 'green',  mobs: ['stick', 'slime', 'mushroom'] },
    { name: 'Radiergummi-Wüste', props: 'desert',    sky: ['orange', 'yellow'],ground: 'yellow', mobs: ['stick', 'goblin', 'slime'] },
    { name: 'Spitzer-Gebirge',   props: 'mountain',  sky: ['blue', 'teal'],    ground: 'teal',   mobs: ['goblin', 'bat', 'stick'] },
    { name: 'Tintenvulkan',      props: 'volcano',   sky: ['red', 'orange'],   ground: 'brown',  mobs: ['imp', 'slime', 'stick'] },
    { name: 'Pappburg',          props: 'castle',    sky: ['purple', 'blue'],  ground: 'green',  mobs: ['skeleton', 'goblin', 'stick'] },
    { name: 'Klecks-Friedhof',   props: 'graveyard', sky: ['purple', 'pink'],  ground: 'purple', mobs: ['ghost', 'skeleton', 'bat'] },
    { name: 'Seitenrand-All',    props: 'space',     sky: ['purple', 'blue'],  ground: 'blue',   mobs: ['alien', 'ghost', 'slime'] }
  ];

  // Bosse: alle 5 Stufen, Typ rotiert. Jede 25. Stufe ein Mega-Boss.
  const bosses = [
    { id: 'cyclops', title: 'der Zyklop',        color: 'brown',  names: ['Grobian', 'Klotzkopf', 'Knickohr'] },
    { id: 'spider',  title: 'die Riesenspinne',  color: 'purple', names: ['Lady Achtbein', 'Fadenzieherin', 'Netzmeisterin'] },
    { id: 'golem',   title: 'der Kieselgolem',   color: 'brown',  names: ['Felsbrocken', 'Granitgrind', 'Kiesel'] },
    { id: 'kraken',  title: 'die Tintenkrake',   color: 'blue',   names: ['Klecksarm', 'Tiefsee-Tinte', 'Saugnapf'] },
    { id: 'dragon',  title: 'der Feuerdrache',   color: 'red',    names: ['Glutzahn', 'Fineliner', 'Brandfleck'] },
    { id: 'lich',    title: 'der Knochenkönig',  color: 'purple', names: ['Klapperbein', 'Radierschädel', 'Graf Gerippe'] },
    { id: 'hydra',   title: 'die Hydra',         color: 'green',  names: ['Dreikopf', 'Vielhals', 'Zischzunge'] },
    { id: 'mecha',   title: 'der Robo-Radierer', color: 'teal',   names: ['RX-Radier', 'Zirkeltron', 'Lineal-9000'] }
  ];
  const megaBoss = { id: 'dragon', mega: true, title: 'der Urdrache', color: 'purple', names: ['Tintenschlund', 'Weltenfresser', 'Seitenbrand'] };

  // Erfolge: bleiben beim Aufstieg erhalten, jeder gibt +2 % auf alles.
  const achievements = [
    { id: 'tap1',     name: 'Erster Strich',      desc: 'Tippe zum ersten Mal',          test: s => s.stats.taps >= 1 },
    { id: 'tap1k',    name: 'Fingerübung',        desc: '1.000 Taps',                    test: s => s.stats.taps >= 1e3 },
    { id: 'tap10k',   name: 'Sehnenscheide',      desc: '10.000 Taps',                   test: s => s.stats.taps >= 1e4 },
    { id: 'combo50',  name: 'Im Flow',            desc: 'Combo von 50',                  test: s => s.stats.maxCombo >= 50 },
    { id: 'combo150', name: 'Unaufhaltsam',       desc: 'Combo von 150',                 test: s => s.stats.maxCombo >= 150 },
    { id: 'kill100',  name: 'Aufräumer',          desc: '100 Gegner besiegt',            test: s => s.stats.kills >= 100 },
    { id: 'kill1k',   name: 'Radierkommando',     desc: '1.000 Gegner besiegt',          test: s => s.stats.kills >= 1e3 },
    { id: 'kill10k',  name: 'Seitenleerer',       desc: '10.000 Gegner besiegt',         test: s => s.stats.kills >= 1e4 },
    { id: 'kill100k', name: 'Heft voll',          desc: '100.000 Gegner besiegt',        test: s => s.stats.kills >= 1e5 },
    { id: 'boss10',   name: 'Bossjäger',          desc: '10 Bosse besiegt',              test: s => s.stats.bossKills >= 10 },
    { id: 'boss100',  name: 'Bossschreck',        desc: '100 Bosse besiegt',             test: s => s.stats.bossKills >= 100 },
    { id: 'dragon1',  name: 'Drachentöter',       desc: 'Besiege einen Feuerdrachen',    test: s => s.stats.dragons >= 1 },
    { id: 'mega1',    name: 'Urgewalt',           desc: 'Besiege einen Mega-Boss',       test: s => s.stats.megaKills >= 1 },
    { id: 'jackpot',  name: 'Jackpot!',           desc: '×10 aus einer Boss-Truhe',      test: s => s.stats.jackpots >= 1 },
    { id: 'plane10',  name: 'Fliegerfänger',      desc: '10 Goldflieger gefangen',       test: s => s.stats.planes >= 10 },
    { id: 'daily7',   name: 'Stammgast',          desc: '7 Tage in Folge gespielt',      test: s => s.daily.streak >= 7 },
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

  const DATA = { BAL, fighters, workers, talents, skills, zones, bosses, megaBoss, achievements };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.KK_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
