# Kritzelkrieg – Stickman Idle

Ein Idle-Clicker-Webspiel mit Strichmännchen, gezeichnet wie im Schulheft. Läuft im Browser auf **iPhone/iPad (Safari)** und **PC/Mac** – ohne Installation, ohne Build-Schritt, ohne Server-Code.

## Spielprinzip

- **Klicken / Tippen:** Tippe auf die Arena, dein Held schlägt zu. Mehrere Finger zählen einzeln, kritische Treffer machen Extraschaden.
- **Kämpfer (16 Typen):** Raufbold, Schwertkämpfer, Bogenschützin, Ninja, Tintenmagier, Ritter, Samurai, Drachenreiter, Stiftgott und mehr. Sie kämpfen automatisch, jeder mit eigener Waffe und Angriffsanimation. Alle 25 Level verdreifacht sich ihr Schaden.
- **Passives Einkommen:** Im **Lager** arbeiten 10 Arten von Strichmännchen (Sammler bis Tintenfabrik) und verdienen Gold pro Sekunde. Ihr Ruhm-Bonus wächst mit jeder Stufe, die deine Truppe erreicht. Bei Meilensteinen (10, 25, 50, 100 … Stück) verdoppelt sich ihr Einkommen.
- **Offline-Fortschritt:** Kämpfer und Arbeiter verdienen weiter, während du weg bist (50 %, bis zu 12 Stunden; mit dem Talent „Träumer“ bis 100 %).
- **Stufen & Bosse:** 10 Gegner pro Stufe, jede 5. Stufe ein Boss mit Zeitlimit. Alle 10 Stufen beginnt ein neues Kapitel mit eigener Kulisse (Wiese, Wüste, Gebirge, Vulkan, Burg, Friedhof, Weltall).
- **Level-System:** Besiegte Gegner geben EP. Jedes Level bringt ×1,03 auf Gold und Schaden und einen Talentpunkt für 9 Talente (Klickkraft, DPS, Gier, Krit-Chance, Synergie …).
- **Fähigkeiten:** Wutanfall (doppelter Schaden), Goldrausch (dreifaches Gold), Schattenklone (Auto-Klicks), Tintenmeteor (Sofortschaden) – freigeschaltet über das Level.
- **Aufstieg (Prestige):** Ab Stufe 40 kannst du neu anfangen und bekommst Seelen. Jede Seele gibt dauerhaft +10 % auf alles. Level, Talente und Erfolge bleiben.
- **29 Erfolge:** jeder gibt +2 % auf alles.
- **Exponentielles Wachstum:** Zahlen laufen von 1 bis weit über Dezillionen (K, M, B, T, Qa, Qi … oder wissenschaftliche Schreibweise).

## Steuerung

| | iPhone / iPad | PC / Mac |
|---|---|---|
| Angreifen | Tippen (mehrere Finger möglich) | Klicken oder **Leertaste** |
| Fähigkeiten | Knöpfe unten rechts in der Arena | Tasten **1–4** |
| Stufe wechseln | ‹ › über der Arena | **Pfeiltasten** |
| Mehrfach kaufen | Kaufknopf gedrückt halten, oder ×10 / ×25 / ×100 / Max | dito |

## Spielen

**Online (empfohlen):** GitHub Pages für dieses Repository aktivieren (*Settings → Pages → Deploy from a branch → `main` / root*). Danach ist das Spiel unter `https://<benutzer>.github.io/<repo>/` erreichbar.

**Auf dem iPhone wie eine App:** Seite in Safari öffnen → *Teilen* → *Zum Home-Bildschirm*. Dann startet Kritzelkrieg im Vollbild mit eigenem Icon und funktioniert dank Service Worker auch offline.

**Lokal:** `index.html` direkt im Browser öffnen funktioniert ebenfalls (ohne Offline-Cache).

## Spielstand

- Wird automatisch alle 10 Sekunden und beim Verlassen im Browser gespeichert (`localStorage`).
- **Geräte wechseln:** *Mehr → Spielstand → Code erzeugen & kopieren*, auf dem anderen Gerät einfügen und *Code laden*.
- Läuft das Spiel als claude.ai-Artifact, synchronisiert es den Stand zusätzlich automatisch über die Cloud des angemeldeten Kontos zwischen iPhone und PC.

## Projektstruktur

```
index.html            Markup, lädt alles
css/style.css         Layout (Telefon einspaltig, breit zweispaltig), Heft-/Tafel-Design
js/data.js            Alle Inhalte und Balancing-Konstanten
js/engine.js          Spiellogik ohne DOM (auch in Node lauffähig)
js/format.js          Zahlen- und Zeitformat
js/art.js             Strichmännchen-Zeichner: Posen, Waffen, Accessoires
js/arena.js           Kampfszene auf Canvas: Animationen, Projektile, Partikel
js/ui.js              Listen, Talente, Aufstieg, Erfolge, Einstellungen, Dialoge
js/audio.js           Synthetisierte Soundeffekte (WebAudio, keine Dateien)
js/cloud.js           Optionaler Cloud-Spielstand (nur als claude.ai-Artifact)
js/main.js            Start, Spielschleife, Eingabe, Speichern, Offline-Fortschritt
sw.js, manifest.webmanifest, icons/   PWA (Homescreen, offline)
tools/simulate.js     Balancing-Simulator mit Bot
tools/make-icons.js   Erzeugt die App-Icons mit der Spiel-Zeichenengine
tools/build-artifact.js  Baut eine einzelne HTML-Datei mit allem inline
```

## Balancing anpassen

Alle Stellschrauben stehen in `js/data.js` (`BAL`). Mit dem Simulator lässt sich prüfen, wie sich Änderungen auswirken:

```bash
node tools/simulate.js 6 4 5     # 6 Stunden, 4 Taps/s, bis zu 5 Aufstiege
QUIET=1 KK_BAL='{"enemyGrowth":1.55}' node tools/simulate.js 3 4 0   # Variante testen
```

Mit den aktuellen Werten (aktiver Spieler, optimal kaufend): Stufe 40 nach ~7 min, Stufe 60 nach ~18 min, erster Aufstieg nach ~50 min bei Stufe ~75. Danach Läufe von 35–50 min mit jeweils +15 bis +50 Stufen.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
