# Phase 2 — Sichtbarer Kern

Stand: 27.07.2026 · baut auf Phase 0 und 1 auf
Punkte 2 (Schiff verändert sich), 4 (einheitliche Ästhetik) und 7 (SRL sichtbar).

**Alle vier Schalter stehen weiterhin auf `false`.** Ohne sie sieht die App exakt aus wie vorher —
das prüft der Smoke-Test in einem eigenen Durchlauf.

---

## Zum Ansehen, ohne etwas umzustellen

An die Adresse anhängen:

```
?ui=all                    alles einschalten
?ui=icons                  nur Symbole und Schriften
?ui=srlPhases              nur die SRL-Anzeige
?ui=shipLayers,mapRoute    Schiff und Reisekarte
```

Beispiel: `https://srl-5.vercel.app/aiu/?ui=all#/deck`

Die Übersteuerung wirkt nur auf die Anzeige. Spielstand, `config.json` und alles Gespeicherte
bleiben unberührt. Wenn eine Etappe abgenommen ist, wird der Schalter in `config-base.json`
dauerhaft auf `true` gesetzt.

---

## Punkt 2 — Das Schiff verändert sich

Das Schiff ist **keine CSS-Grafik**, wie die Roadmap ursprünglich annahm, sondern eine
Three.js-Szene in `segelschiff-header.html`, eingebettet als iframe. Statt SVG-Ebenen sind die
Ausbauten deshalb als echte 3D-Gruppen in der Szene gebaut:

| Ausbau | Was am Schiff erscheint |
|---|---|
| `kartenraum` | Kartentisch mit aufgerollter Seekarte und Laterne auf dem Achterdeck |
| `beiboot` | Beiboot an zwei Davits an der Steuerbordseite, mit Ruder |
| `ausguck` | erweiterte Plattform mit Geländer, Fernrohr und Laterne am Großmast |
| `werkstatt` | Verschlag mit Dach, Tür und Werkzeugbrett auf dem Vordeck |
| `lager` | vier gestapelte Kisten und zwei Fässer mittschiffs |
| `versammlung` | fünf Bänke im Halbkreis um den Großmast, dazu ein Wimpel |

Die Kopplung läuft über `postMessage`: `app-ship.js` schickt `runtime.upgrades` an die Szene,
sobald sie sich meldet und bei jeder Änderung des Themas `ship`. Die Szene blendet die Gruppen
weich ein und aus statt hart umzuschalten.

Ohne `ui.shipLayers` sendet die Brücke ein leeres Objekt — das Schiff sieht aus wie bisher.

**Nebenbefund:** `segelschiff-header.html` lud Three.js ebenfalls von cdnjs. Das war der letzte
verbliebene Offline-Blocker aus Phase 1 und ist jetzt behoben.

Die Hotspots wurden **nicht** verschoben. Die Szene ist ein Hintergrund, die vorhandenen Positionen
passen weiterhin; Umpositionieren hätte nur Risiko ohne Gewinn gebracht. Ergänzt wurde eine
Mindesthöhe von 52 px (48 px auf dem Telefon) für die Trefferflächen.

---

## Punkt 4 — Einheitliche Ästhetik

**Symbole.** 28 selbst gezeichnete SVG-Symbole liegen als Sprite direkt in `index.html`. Bewusst
inline und nicht als eigene Datei: externe `<use href="datei.svg#id">`-Verweise sind in Safari
unzuverlässig, und das ist die Zielumgebung.

Der Austausch läuft über eine einzige Funktion: `sym('🗺️')` liefert das Symbol, wenn `ui.icons` an
ist, und sonst unverändert das Emoji. Dadurch bleiben alle Aufrufstellen einzeilig. Fest im HTML
stehende Emoji (Navigation, Hotspots, Knöpfe, Stempel, PIN-Fenster, Verbindungsanzeige) ersetzt
`applyStaticIcons()` beim Aufbau.

Der Test prüft, dass in der Oberfläche danach kein Emoji mehr übrig ist.

**Schriften.** Zwei lokal eingebundene Webschriften, zusammen 92 KB:

- **Alegreya** für Überschriften, Kapitel, Logbuch und Zahlen — bücherhaft, passt zum Papierbild
- **Atkinson Hyperlegible** für den Fließtext — vom Braille Institute ausdrücklich auf
  Unterscheidbarkeit der Buchstaben hin entworfen, was für Klasse 5 mehr wiegt als Stilfragen

Georgia und `system-ui` bleiben als Rückfall im Font-Stack. Die Umschaltung hängt an `ui.icons`,
weil Symbole und Schriften zusammen den Gesamteindruck ausmachen.

---

## Punkt 7 — SRL sichtbar

- **Abzeichen** auf jeder Missionskarte: Planung, Durchführung oder Reflexion
- **Schwerpunkt der Woche** als Chip im Kapitelkopf, aus `srlFokus`
- **Phasenfilter** als zweite Reihe unter den Bereichsfiltern, kombinierbar mit diesen
- Farben aus dem vorhandenen System: Planung → Schieferblau, Durchführung → Rostorange,
  Reflexion → Salbeigrün

Der Test prüft den Wortlaut der vier Filterknöpfe zeichengenau gegen
`Alle Phasen | Planung | Durchführung | Reflexion`.

---

## Die Reisekarte

Neue Karte über dem eingebetteten Kartendesigner, gespeist aus dem neuen Feld `ort` je Woche:

- **Route** als gestrichelte Linie über alle bisher erreichten Orte
- **Nebel** über allem Übrigen, technisch als SVG-Maske mit Löchern an den besuchten Stellen
- **Aktuelle Position** als goldene Marke, ältere Orte in Schieferblau
- Grundlage ist die vorhandene `karte.svg`, der externe Kartendesigner bleibt unangetastet

Wochen 1 bis 5 liegen alle im Heimathafen — die Reise beginnt erzählerisch erst in Woche 6 mit der
Ausfahrt. Die Koordinaten sind ein Vorschlag und stehen in den `weeks-*.json`.

---

## Geänderte und neue Dateien

| Datei | Änderung |
|---|---|
| `index.html` | Symbol-Sprite, Schrift-Vorladung, Reisekarte, Phasenfilter, Schwerpunkt-Chip |
| `styles.css` | neuer Abschnitt am Ende: Schriften, Symbole, SRL-Farben, Reisekarte |
| `app-core.js` | `sym()`, `icon()`, `applyStaticIcons()`, `renderSrlFocus()`, `srlBadge()`, `renderRouteMap()`, Phasenfilter, Schalter-Übersteuerung |
| `app-input.js` | Symbole in Ausbauten und im Missionsfenster |
| `app-sync.js` | Symbol in der Verbindungsanzeige |
| `app-ship.js` | Brücke zur 3D-Szene |
| `segelschiff-header.html` | sechs Ausbaugruppen, Nachrichtenempfang, Three.js lokal |
| `weeks-*.json` | Feld `ort` je Woche |
| `config-base.json` | Hinweistext zu den Schaltern erweitert |
| `sw.js` | Version `v5-0-kern`, Schriften aufgenommen |
| `fonts/` | vier woff2-Dateien |
| `tests/` | Smoke-Test auf 44 Zusicherungen erweitert, Playwright um Phase 2 ergänzt |

---

## Prüfen

```bash
cd aiu/tests
npm install
npm run smoke     # 44 Zusicherungen in zwei Durchläufen
npm run visual    # Referenzbilder, davor einmalig visual:update
```

Der Smoke-Test fährt die App zweimal hoch: einmal im Auslieferungszustand und einmal mit `?ui=all`.
Der erste Durchlauf prüft ausdrücklich, dass Phase 2 **nichts** verändert.

Der Playwright-Test öffnet zusätzlich die 3D-Szene und liest über `window.aiuAusbauStatus()` aus,
welche Ausbauten tatsächlich sichtbar sind — freigeschaltete an, gesperrte aus, und ohne Schalter
alle aus.

---

## Bitte gegenlesen

1. **Die sechs Ausbauten am Schiff** — Position und Größe sind Augenmaß. Am besten mit
   `?ui=all` ansehen und alle sechs in der Kajüte durchschalten.
2. **Die Ortskoordinaten** der Reisekarte — passt der Weg zur erzählten Reise?
3. **Die Schriftwahl.** Falls Alegreya nicht zum HBG-Bild passt, ist der Austausch eine Zeile in
   `styles.css` plus zwei Dateien in `fonts/`.

---

## Was bewusst offen bleibt

- **Punkt 1 (durchgehende Szene, Kamerafahrten)** ist Phase 4 und bleibt bis nach dem Start liegen.
- Die Symbole sind schlicht gehalten. Wenn ein illustrierterer Stil gewünscht ist, betrifft das nur
  das Sprite in `index.html` — der Rest bleibt unverändert.
