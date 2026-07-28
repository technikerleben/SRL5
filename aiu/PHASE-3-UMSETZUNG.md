# Phase 3 — Spielgefühl

Stand: 27.07.2026 · baut auf Phase 0 bis 2 auf
Zwei neue Schalter: `ui.juice` (Bewegung, Partikel, Merkstriche, Haptik) und `ui.sound` (Klang).
Beide stehen auf `false`. Zum Ansehen: `?ui=all` an die Adresse hängen.

Fast alles Neue liegt in einer einzigen Datei, `app-juice.js`. Die Anbindung an den Rest sind
sechs kurze Stellen.

---

## Zahlen laufen, statt zu springen

Die Ressourcenzahlen zählen in 700 ms zum neuen Wert hoch, mit weicher Verzögerung am Ende.
Möglich wurde das erst durch den Store aus Phase 1: der Zähler merkt sich den vorigen Wert und
läuft nach dem Neuzeichnen los. Vorher hätte jedes vollständige `render()` die Animation
abgeschnitten.

## Meilensteine sind sichtbar

An zwei Stellen, damit die Schwelle auch ohne 3D erkennbar bleibt:

- **Goldener Ring im Glasgefäß**, auf der Höhe, die der Stapel beim Erreichen des Ziels hätte
- **Merkstrich im Fortschrittsbalken** der Ressourcenkarte

Wird die Schwelle überschritten, gibt es Partikel in der Farbe der Ressource, einen Lichtakzent auf
der Karte, einen Zweiklang und die Belohnung als erzählerische Einblendung. Das passiert einmal je
Woche und Ressource, nicht bei jedem erneuten Zeichnen.

Meilensteine gibt es derzeit nur in den Wochen 2, 3 und 4.

## Freischaltung eines Ausbaus

Fanfare aus vier Tönen, Partikel und Lichtschein auf der betreffenden Karte, ein kurzes
Vibrationsmuster und die Meldung „… ist jetzt an Bord."

Erkannt wird das über einen Vergleich mit dem zuletzt bekannten Stand der Ausbauten — es feuert
also auch dann, wenn die Freischaltung von einem anderen Gerät kommt.

## Erzählerische Einblendung statt nüchterner Meldung

`toast()` bleibt als Funktion erhalten und leitet bei aktivem `ui.juice` auf eine Einblendung um:
Pergamentfarbener Zettel mit Goldrand, Symbol links, leicht schräg hereingekippt.
Ohne den Schalter erscheint die bisherige schlichte Meldung.

## Haptik

`navigator.vibrate` bei Abgabe eines Beitrags, bei Freischaltungen und beim Erreichen eines
Meilensteins — jeweils mit eigenem Muster. Fehlt die Schnittstelle, passiert schlicht nichts.

---

## Klang

**Es gibt keine Audiodateien.** Alle Geräusche werden mit der Web Audio API erzeugt:

| Klang | Auslöser | Aufbau |
|---|---|---|
| Wellen | Hintergrund, dauerhaft | braunes Rauschen durch ein Tiefpassfilter, dessen Grenzfrequenz alle 14 Sekunden wandert |
| Glasstein | Ressource steigt | Dreieckton 880 Hz mit fallender Tonhöhe, dazu ein kurzes Knacken |
| Holzknarren | Ortswechsel | gefiltertes Rauschen, Bandpass von 190 Hz abwärts |
| Stempel | Beitrag abgegeben | Sinus 130 Hz plus Anschlaggeräusch |
| Fanfare | Ausbau freigeschaltet | vier Töne, C–E–G–C |
| Meilenstein | Schwelle erreicht | Zweiklang E–A |

Das war eine bewusste Abweichung von der Roadmap, die „Klangdateien in den Service-Worker-Cache"
vorsah. Synthese hat hier nur Vorteile: nichts kann offline fehlen, der Cache wächst nicht, und die
Lautstärke ist im Code steuerbar statt in Dateien festgebrannt.

**Start erst nach einer Nutzergeste.** iOS blockiert Audio ohne Interaktion. Der erste Tipp oder
Tastendruck irgendwo in der App startet den Klang.

**Stummschalter** oben rechts neben der Verbindungsanzeige, 44 × 44 px, Zustand in `localStorage`
unter `kiu-v2-ton`. Ein stummgeschaltetes iPad bleibt vollständig bedienbar — es gibt keine
Rückmeldung, die nur akustisch wäre.

---

## Ruhige Variante bei `prefers-reduced-motion`

Kein bloßes Abschalten, sondern eigene Rückmeldungen:

| Normal | Ruhig |
|---|---|
| Zahl läuft hoch | Zahl steht sofort auf dem Zielwert |
| Partikel fliegen auseinander | ein weicher Lichtschein, etwas länger |
| Zettel kippt herein | Zettel erscheint ohne Bewegung |
| Merkstrich normal | Merkstrich etwas höher, dadurch deutlicher |

Der Klang bleibt unverändert: Bewegungsempfindlichkeit ist kein Grund, die Tonebene zu streichen.
Keine Information geht verloren — das prüft ein eigener Playwright-Test.

---

## Geänderte und neue Dateien

| Datei | Änderung |
|---|---|
| `app-juice.js` | **neu** — `AIU_JUICE` (Bewegung, Partikel, Haptik, Einblendung) und `AIU_SOUND` (Klang) |
| `app-core.js` | `toast()` leitet um; Holzknarren beim Ortswechsel |
| `app-input.js` | Stempelklang, Haptik und Partikel bei der Abgabe |
| `app-gems.js` | `gemsMilestones()` — goldener Ring im Glas |
| `index.html` | Stummschalter in der Kopfzeile |
| `styles.css` | Partikel, Merkstrich, Zettel, Stummschalter, ruhige Variante |
| `app.js`, `sw.js` | `app-juice.js` eingebunden, Cache-Version `v6-0-spielgefuehl` |
| `tests/` | Smoke-Test auf 57 Zusicherungen, zwei neue Playwright-Fälle |

---

## Prüfen

```bash
cd aiu/tests && npm run smoke     # 57 Zusicherungen in zwei Durchläufen
```

Neu geprüft wird unter anderem: im Auslieferungszustand kein Merkstrich, kein Tonschalter und die
schlichte Meldung; mit Schaltern der Merkstrich, der Zahlenlauf bis zum exakten Zielwert, die
Meilensteinmeldung, das Erzeugen **und Aufräumen** der Partikel, und dass ein Klangaufruf ohne
vorhandenen AudioContext nicht abbricht.

Playwright prüft zusätzlich die Größe des Stummschalters, dass er sich seinen Zustand über einen
Neustart merkt, und dass bei reduzierter Bewegung keine Partikel sichtbar sind, die Meldung aber
ankommt.

---

## Bitte gegenlesen

1. **Die Lautstärken.** Die Wellen liegen bei 5 %, die Effekte bei 20 bis 30 %. Im Klassenraum mit
   25 iPads klingt das anders als am Schreibtisch — vermutlich muss das Meer noch leiser.
2. **Die Bildrate auf dem ältesten iPad.** Drei WebGL-Kontexte laufen gleichzeitig: Schiffsszene,
   Schatzkammer, plus die Partikel im DOM. Das ist der Punkt, den ich hier nicht prüfen kann.
3. **Ob der Zahlenlauf zu langsam wirkt.** 700 ms ist ein Vorschlag, die Zahl steht in `app-juice.js`.

---

## Was bewusst offen bleibt

- **Kein Ton beim Öffnen einer Mission oder beim Tippen.** Bei 25 Geräten im Raum wäre das zu viel.
- Die Wellen laufen nur, solange die Seite im Vordergrund ist — der Browser hält den AudioContext
  im Hintergrund ohnehin an.
- **Phase 4 und 5** (durchgehende Szene, Kamerafahrten, Live-Ereignisse) bleiben wie geplant für
  nach dem Schulstart.
