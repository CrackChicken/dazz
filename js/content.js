/* Kritzelkrieg – Sammel-Inhalte und Lore: Seltenheiten, Items, Skins, Glücksrad, Geschichte. */
(function (root) {
  'use strict';

  // Seltenheiten (Reihenfolge = Rang). color = Filzstift-Name aus dem CSS (pencil = Grau).
  const rarities = [
    { id: 'common',    name: 'Gewöhnlich',  color: 'pencil', maxLvl: 5,  dup: 1,  pct: 10,  rank: 0 },
    { id: 'rare',      name: 'Selten',      color: 'green',  maxLvl: 6,  dup: 2,  pct: 20,  rank: 1 },
    { id: 'vrare',     name: 'Sehr selten', color: 'blue',   maxLvl: 7,  dup: 4,  pct: 40,  rank: 2 },
    { id: 'epic',      name: 'Episch',      color: 'purple', maxLvl: 8,  dup: 8,  pct: 80,  rank: 3 },
    { id: 'legendary', name: 'Legendär',    color: 'orange', maxLvl: 10, dup: 20, pct: 150, rank: 4 },
    { id: 'mythic',    name: 'Mythisch',    color: 'red',    maxLvl: 10, dup: 50, pct: 300, rank: 5 }
  ];

  // Spezialwerte für den Ranzen-Platz je Seltenheit
  const special = {
    crit:    { label: 'Krit-Chance',    unit: '%', vals: [1, 2, 3, 5, 8, 12] },
    critdmg: { label: 'Krit-Schaden',   unit: '×', vals: [0.25, 0.5, 1, 1.5, 2.5, 4] },
    combo:   { label: 'Combo-Zeit',     unit: 's', vals: [0.1, 0.2, 0.3, 0.5, 0.8, 1.2] },
    boss:    { label: 'Bosszeit',       unit: 's', vals: [1, 2, 3, 5, 8, 12] },
    offline: { label: 'Offline-Gold',   unit: '%', vals: [3, 5, 8, 12, 20, 30] }
  };

  const slots = [
    { id: 'waffe',    name: 'Waffe',    stat: 'click', label: 'Klickschaden' },
    { id: 'banner',   name: 'Banner',   stat: 'dps',   label: 'Kämpfer-DPS' },
    { id: 'talisman', name: 'Talisman', stat: 'gold',  label: 'Gold' },
    { id: 'ranzen',   name: 'Ranzen',   stat: null,    label: 'Spezial' }
  ];

  const items = [
    // Waffen: mehr Klickschaden
    { id: 'lineal',     slot: 'waffe', rarity: 'common',    name: 'Angekautes Lineal',      lore: 'Riecht nach Pausenbrot. Trifft trotzdem.' },
    { id: 'spitzer',    slot: 'waffe', rarity: 'rare',      name: 'Spitzer-Klinge',         lore: 'Aus einem Anspitzer, der zu viel gesehen hat.' },
    { id: 'geodreieck', slot: 'waffe', rarity: 'vrare',     name: 'Geodreieck-Axt',         lore: 'Exakt 90 Grad Wut.' },
    { id: 'marker',     slot: 'waffe', rarity: 'epic',      name: 'Doppel-Textmarker',      lore: 'Markiert das Wichtige. Und die Gegner.' },
    { id: 'fueller',    slot: 'waffe', rarity: 'legendary', name: 'Goldener Füller',        lore: 'Ein Geschenk von Oma. Schreibt nur Heldentaten.' },
    { id: 'erster',     slot: 'waffe', rarity: 'mythic',    name: 'Der Erste Stift',        lore: 'Mit ihm wurde der allererste Strich gezogen.' },
    // Banner: mehr DPS der Truppe
    { id: 'faehnchen',  slot: 'banner', rarity: 'common',    name: 'Kritzel-Fähnchen',       lore: 'Mit Kuli auf ein Kaugummipapier gemalt.' },
    { id: 'klassenfoto',slot: 'banner', rarity: 'rare',      name: 'Klassenfoto',            lore: 'Alle lächeln. Fast alle.' },
    { id: 'wimpel',     slot: 'banner', rarity: 'vrare',     name: 'Wimpel der 4b',          lore: 'Gewonnen beim Staffellauf 2019.' },
    { id: 'schulfahne', slot: 'banner', rarity: 'epic',      name: 'Schulfahne',             lore: 'Weht auch ohne Wind.' },
    { id: 'pokal',      slot: 'banner', rarity: 'legendary', name: 'Pokal vom Sportfest',    lore: 'Glänzt so sehr, dass die Truppe doppelt so mutig ist.' },
    { id: 'legenden',   slot: 'banner', rarity: 'mythic',    name: 'Banner der Pausenhof-Legenden', lore: 'Auf ihm stehen die Namen aller, die je Fangen gewonnen haben.' },
    // Talismane: mehr Gold
    { id: 'murmel',     slot: 'talisman', rarity: 'common',    name: 'Glücksmurmel',          lore: 'Rollt immer Richtung Geld.' },
    { id: 'muenze',     slot: 'talisman', rarity: 'rare',      name: 'Pausenbrot-Münze',      lore: 'Für den Kiosk gespart, dann doch behalten.' },
    { id: 'album',      slot: 'talisman', rarity: 'vrare',     name: 'Sammelbild-Album',      lore: 'Fast vollständig. Nur einer fehlt.' },
    { id: 'goldsticker',slot: 'talisman', rarity: 'epic',      name: 'Goldsticker-Bogen',     lore: 'Von Frau Dr. Rotstift. Ausnahmsweise.' },
    { id: 'sparschwein',slot: 'talisman', rarity: 'legendary', name: 'Sparschwein Gustav',    lore: 'Grunzt, wenn Gold in der Nähe ist.' },
    { id: 'fundkiste',  slot: 'talisman', rarity: 'mythic',    name: 'Schatz der Fundkiste',  lore: 'Was in der Fundkiste landet, kommt nie zurück. Außer hier.' },
    // Ranzen: Spezialwerte
    { id: 'turnbeutel', slot: 'ranzen', rarity: 'common',    name: 'Turnbeutel',            stat: 'offline', lore: 'Wurde seit Wochen nicht ausgeleert.' },
    { id: 'kreide',     slot: 'ranzen', rarity: 'rare',      name: 'Kreide-Amulett',        stat: 'crit',    lore: 'Quietscht bei jedem kritischen Treffer.' },
    { id: 'wackelzahn', slot: 'ranzen', rarity: 'vrare',     name: 'Wackelzahn',            stat: 'boss',    lore: 'Die Zahnfee zahlt in Bosszeit.' },
    { id: 'hausaufgabe',slot: 'ranzen', rarity: 'epic',      name: 'Hausaufgabenheft',      stat: 'critdmg', lore: 'Leer. Absolut gefürchtet.' },
    { id: 'glocke',     slot: 'ranzen', rarity: 'legendary', name: 'Pausenglocke',          stat: 'combo',   lore: 'Solange sie nicht läutet, hält die Combo.' },
    { id: 'zeitmaschine',slot: 'ranzen', rarity: 'mythic',   name: 'Zeitmaschine aus Pappe', stat: 'offline', lore: 'Toni hat sie in Kunst gebaut. Sie funktioniert. Irgendwie.' }
  ];

  const heroSkins = [
    { id: 'classic', name: 'Klassisch',            rarity: null },
    { id: 'pyjama',  name: 'Schlafanzug',          rarity: 'common' },
    { id: 'pirate',  name: 'Piratenkapitän',       rarity: 'rare' },
    { id: 'knight',  name: 'Ritter in Glanzrüstung', rarity: 'vrare' },
    { id: 'super',   name: 'Superheld',            rarity: 'epic' },
    { id: 'fire',    name: 'Feuerdämon',           rarity: 'legendary' },
    { id: 'unicorn', name: 'Regenbogen-Einhorn',   rarity: 'mythic' }
  ];
  const fighterStyles = [
    { id: 'bunt',    name: 'Bunt',            rarity: 'common' },
    { id: 'party',   name: 'Partyhut',        rarity: 'rare' },
    { id: 'neon',    name: 'Neon',            rarity: 'vrare' },
    { id: 'shadow',  name: 'Schatten',        rarity: 'epic' },
    { id: 'gold',    name: 'Goldene Edition', rarity: 'legendary' },
    { id: 'rainbow', name: 'Regenbogen',      rarity: 'mythic' }
  ];

  // Automaten
  const machines = {
    pack: { cost: 10, cost10: 90, rates: [30, 35, 22, 9.5, 3, 0.5], pity: 60, skinChance: 0.5 },
    gum:  { rates: [62, 27, 9, 1.8, 0.2, 0] }
  };

  // Glücksrad: Felder im Uhrzeigersinn
  const wheel = {
    freeEvery: 4 * 3600, spinCost: 5,
    segments: [
      { id: 'stars3',  label: '3 ★',        w: 22, color: 'yellow' },
      { id: 'gold',    label: 'Gold',       w: 20, color: 'orange' },
      { id: 'frenzy',  label: 'Raserei',    w: 14, color: 'red' },
      { id: 'stars10', label: '10 ★',       w: 9,  color: 'purple' },
      { id: 'stars1',  label: '1 ★',        w: 16, color: 'green' },
      { id: 'pack',    label: 'Tüte',       w: 8,  color: 'blue' },
      { id: 'gold4',   label: 'Gold ×4',    w: 8,  color: 'teal' },
      { id: 'jackpot', label: '25 ★',       w: 3,  color: 'pink' }
    ]
  };

  /* Geschichte: Szenen aus Comic-Panels. scene = Zeichenfunktion in story.js */
  const story = [
    { id: 'intro', title: 'Mathe, dritte Stunde', panels: [
      { scene: 'classroom', text: 'Montag, dritte Stunde, Mathe. Toni starrt an die Tafel. 7 × 8? Viel zu früh für so was.' },
      { scene: 'doodle', text: 'Also tut Toni, was alle tun: kritzeln. Ein kleiner Held mit gelbem Stirnband, ganz am Heftrand.' },
      { scene: 'awaken', text: 'Dann passiert es. Die Tinte glitzert, der Held blinzelt … und springt vom Papier auf!' },
      { scene: 'teacher', text: 'Aber Frau Dr. Rotstift hat alles gesehen. Ihr roter Stift fährt übers Heft, und jede Korrektur wird lebendig.' },
      { scene: 'ready', text: 'Die roten Kritzler wollen alles ausradieren. Nur einer kann das Heft retten. Tippe, um zuzuschlagen!' }
    ] },
    { id: 'ch2', title: 'Kapitel 2: Radiergummi-Wüste', zone: 1, panels: [
      { scene: 'zone', zone: 1, text: 'Toni blättert ins Erdkunde-Heft. Hier liegen überall Radiergummi-Krümel: die Radiergummi-Wüste.' },
      { scene: 'boss', boss: 'golem', text: 'Hinter den Dünen grollt der Kieselgolem. Er ist aus vergessenen Radiergummis gebaut. Und er ist sauer.' }
    ] },
    { id: 'ch3', title: 'Kapitel 3: Spitzer-Gebirge', zone: 2, panels: [
      { scene: 'zone', zone: 2, text: 'Im Zeichenblock türmen sich Berge aus Bleistiftspänen. Es schneit Radierkrümel.' },
      { scene: 'ink', text: 'Ganz oben auf dem Gipfel wackelt ein Tintenfass. Frau Dr. Rotstift lächelt. Das ist kein gutes Zeichen.' }
    ] },
    { id: 'mega', title: 'Der Urdrache', panels: [
      { scene: 'ink', spill: true, text: 'Das Tintenfass kippt. Der Klecks wird größer und größer und größer …' },
      { scene: 'boss', boss: 'dragon', mega: true, text: 'Aus der Tinte steigt der Urdrache Tintenschlund! Frau Dr. Rotstift ruft: „Den hat noch kein Strichmännchen besiegt!“' }
    ] },
    { id: 'ch4', title: 'Kapitel 4: Tintenvulkan', zone: 3, panels: [
      { scene: 'zone', zone: 3, text: 'Das Physik-Heft. Hier hat jemand Tinte verschüttet, und jetzt kocht sie.' },
      { scene: 'boss', boss: 'hydra', text: 'Die Hydra hat drei Köpfe. Toni hatte damals keinen Platz mehr für einen vierten.' }
    ] },
    { id: 'ch5', title: 'Kapitel 5: Pappburg', zone: 4, panels: [
      { scene: 'zone', zone: 4, text: 'Das Bastelheft: eine Burg aus Pappe, Kleber und viel zu viel Tesafilm.' },
      { scene: 'boss', boss: 'cyclops', text: 'Am Tor wartet der Zyklop. Toni hat ihm nur ein Auge gemalt. Aus Versehen. Er nimmt es persönlich.' }
    ] },
    { id: 'ch6', title: 'Kapitel 6: Klecks-Friedhof', zone: 5, panels: [
      { scene: 'zone', zone: 5, text: 'Hinten im Heft liegen die verworfenen Zeichnungen. Durchgestrichen, aber nicht vergessen.' },
      { scene: 'boss', boss: 'spider', text: 'Zwischen den Grabsteinen spinnt die Riesenspinne Netze aus Linien, die nie fertig wurden.' }
    ] },
    { id: 'ch7', title: 'Kapitel 7: Seitenrand-All', zone: 6, panels: [
      { scene: 'zone', zone: 6, text: 'Der Rand der letzten Seite. Dahinter gibt es nur noch Sterne und Weltraum-Gekritzel.' },
      { scene: 'teacher', text: 'Und irgendwo dort wartet Frau Dr. Rotstift selbst. Mit dem dicksten Rotstift der Welt.' }
    ] },
    { id: 'newbook', title: 'Ein neues Heft', panels: [
      { scene: 'newbook', text: 'Die Seiten sind voll. Toni zieht ein neues Heft aus dem Ranzen.' },
      { scene: 'ready', text: 'Aber die Helden sind nicht verschwunden. Sie haben zwischen den Seiten gewartet, stärker als zuvor.' }
    ] },
    { id: 'loot', title: 'Die Wundertüte', panels: [
      { scene: 'kiosk', text: 'Im Ranzen klimpern Goldsternchen. Toni hat sie für gute Arbeiten bekommen. Am Kiosk wartet die Wundertüte …' }
    ] },
    { id: 'finale', title: 'Die Pausenglocke', panels: [
      { scene: 'classroom', bell: true, text: 'Stufe 100! Die Pausenglocke läutet. Frau Dr. Rotstift klappt das Heft zu.' },
      { scene: 'ready', text: 'Doch in der nächsten Stunde geht der Kritzelkrieg weiter. Er geht immer weiter.' }
    ] }
  ];

  const CONTENT = { rarities, special, slots, items, heroSkins, fighterStyles, machines, wheel, story };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONTENT;
  else root.KK_CONTENT = CONTENT;
})(typeof window !== 'undefined' ? window : globalThis);
