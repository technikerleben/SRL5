# Modernisierung der Begleit-App „Kurs ins Unbekannte"

> **Stand 27.07.2026:** Phase 0 bis 3 sind umgesetzt und geprüft.
> Einzelheiten in `PHASE-0-1-UMSETZUNG.md`, `PHASE-2-UMSETZUNG.md` und `PHASE-3-UMSETZUNG.md`. Offene Punkte in Phase 0 sind die,
> die nur im Repository oder in Vercel erledigt werden können.

Arbeitsplan für den Ordner `aiu`. Ziel: gleiche Funktionen, deutlich stärkeres Spielgefühl,
ohne den Einsatz im Unterricht zu gefährden.

**Ausgangsstand:** Commit vom 17.07.2026
**Spielstart Klasse 5:** 01.09.2026 (`config-base.json` → `game.startDate`)
**Zeitfenster bis Start:** 5 Wochen

---

## Leitregeln

1. Ein Punkt pro Branch. Nie zwei Baustellen gleichzeitig.
2. Alles Neue liegt hinter einem Feature-Flag. Merge nach `main` ist erlaubt, Aktivierung nicht.
3. `main` ist zu jedem Zeitpunkt unterrichtstauglich.
4. Kein Schritt gilt als fertig ohne Test auf dem echten Klassen-iPad.
5. Im Zweifel: Flag aus, Reihe läuft weiter.

---

## Feature-Flags

Alle Schalter kommen nach `config-base.json` unter `ui`. Standard beim Anlegen: `false`.

| Flag | Steuert | Phase |
|---|---|---|
| `ui.shipLayers` | Schiff reagiert auf Ausbauten | 2 |
| `ui.mapRoute` | Route und Nebel auf der Karte | 2 |
| `ui.icons` | SVG-Icons statt Emoji | 2 |
| `ui.srlPhases` | SRL-Phasen an Missionen und Woche | 2 |
| `ui.juice` | Zahlen-Rollup, Partikel, Haptik | 3 |
| `ui.sound` | Klang (zusätzlich Mute im UI) | 3 |
| `ui.scene` | Parallax-Deck und Kamerafahrten | 4 |
| `ui.realtime` | Supabase Realtime statt Polling | 5 |
| `ui.stageMode` | Bühnenmodus für Apple TV | 6 |

---

## Nicht anfassen ohne Migration

Diese Verträge sind heute produktiv. Jede Änderung braucht einen Migrationspfad **und** einen Test
mit einer alten Datei.

- [ ] `localStorage` Schlüssel `kiu-v2-runtime` und `kiu-v2-teacher-auth`
- [ ] Sicherungsformat aus `app-teacher.js` (Export **und** Import einer alten Sicherung)
- [ ] Supabase-Tabellen `aiu_state`, `aiu_submissions`, `aiu_votes`, Bucket `aiu-media`
- [ ] Zusammenbau von `config.json` aus `config-base.json` + `weeks-*.json` über `config-loader.js`
- [ ] Lehrkräfte-PIN-Ablauf und `sessionStorage`-Auth

---

## Phase 0 — Absicherung

**Aufwand:** ca. ½ Tag · **Ziel:** bis Fr 31.07.2026 · **Branch:** `modern/00-setup`

- [ ] Git-Tag `pre-modern-2026-07` auf den aktuellen Stand setzen
- [ ] Branch `modern` anlegen, Vercel-Preview-Deployment mit eigener URL prüfen
- [x] `ui`-Block mit allen Flags (alle `false`) in `config-base.json` ergänzen
- [x] Kleine Hilfsfunktion `flag('scene')` in `app-core.js`, defensiv gegen fehlende Werte
- [x] Playwright-Setup: Screenshots von Deck, Aufträge, Karte, Logbuch, Rat, Kajüte
- [x] Zwei Viewports festlegen: iPad quer (1180×820) und iPhone (390×844)
- [ ] Referenzbilder committen (`tests/baseline/`)
- [ ] Sicherung aus dem laufenden Betrieb exportieren und als Testdatei ablegen

**Fertig, wenn:** Pixel-Diff läuft grün gegen den unveränderten Stand.

---

## Phase 1 — Fundament (unsichtbar)

**Aufwand:** ca. 4 Tage · **Ziel:** bis Mi 12.08.2026 · **Branch:** `modern/01-fundament`

Ohne diesen Schritt bauen alle späteren Animationen auf einem Full-Rerender auf und flackern.

### Store und Rendering
- [x] `render()` in `app-core.js` behutsam zerlegen; die Teil-Renderer existieren bereits
      (`renderResources`, `renderMissions`, `renderMap`, `renderLogbook`, `renderCouncil`,
      `renderUpgrades`, `renderLocks`, `renderWeekDots`)
- [x] Dünner Store mit `subscribe(bereich, fn)` davorsetzen; Änderungen melden nur betroffene Bereiche
- [ ] `saveRuntimeLocal()` löst Store-Update aus statt direkter DOM-Schreibzugriffe
- [x] Der Monkey-Patch am Ende von `app-gems.js` (`render = function(...)`) wird durch ein
      sauberes Abo auf `resources` ersetzt

### Router
- [x] `gotoView()` auf History-API umstellen, Ansicht in der URL (`/aiu/#/karte` oder Pfad)
- [ ] Zurück-Geste und Deep Links testen, auch aus dem PWA-Vollbild heraus
- [x] Sperrlogik (`unlocked()`) beim Direktaufruf weiterhin greifen lassen

### Offline und Auslieferung
- [x] `sw.js` versionieren, alten Cache beim Aktivieren löschen
- [x] Update-Hinweis in der App, wenn eine neue Version bereitsteht
- [x] Three.js lokal ablegen statt CDN r128 (CDN funktioniert im Flugmodus nicht)
- [ ] Prüfen, ob der Wechsel auf ein aktuelles Three.js als Modul lohnt oder r128 lokal reicht

### SRL-Schema (Vorbereitung für Phase 2)
- [x] Feld `srl` je Mission in `weeks-01-05.json`, `weeks-06-10.json`, `weeks-11-15.json`
      mit genau den Werten `planung`, `durchfuehrung`, `reflexion`
- [x] Feld `srlFokus` je Woche ergänzen
- [x] Fallback: fehlt das Feld, verhält sich die App wie bisher

**Fertig, wenn:**
- [ ] Pixel-Diff grün (die App sieht identisch aus)
- [ ] Alte Sicherung importiert fehlerfrei
- [ ] App startet im Flugmodus als installierte PWA
- [ ] Wochenwechsel in der Kajüte aktualisiert nur die betroffenen Bereiche

---

## Phase 2 — Sichtbarer Kern

**Aufwand:** ca. 5 Tage · **Ziel:** bis Do 20.08.2026 · **Branch:** `modern/02-kern`
**Punkte 2, 4 und 7 · rein additiv**

### Das Schiff verändert sich
- [x] `.ship-board` von CSS-Formen auf gestapelte SVG-Ebenen umstellen
- [x] Je Ausbau eine Ebene: `kartenraum`, `beiboot`, `ausguck`, `werkstatt`, `lager`, `versammlung`
- [x] Ebenen an `runtime.upgrades` koppeln, Einblendung mit kurzer Animation
- [x] Hotspots auf den neuen Ebenen neu positionieren, Trefferflächen mindestens 44 px
- [x] Gesperrte Bereiche bleiben erkennbar gesperrt (heutiges Verhalten beibehalten)

### Karte
- [x] Bisher besuchte Orte als Route zeichnen
- [x] Nebel über nicht besuchten Gebieten
- [x] Verhalten prüfen, wenn der externe Kartendesigner im iframe nicht lädt (Fallback existiert)

### Einheitliche Ästhetik
- [x] SVG-Icon-Set anlegen für Navigation, Hotspots, Ressourcen, Ausgabearten, Bereiche
- [x] Emoji in `OUTPUT`, `AREA` und `config-base.json` durch Icon-Kennungen ersetzen
- [x] Zwei Webfonts lokal einbinden: eine erzählerische Display-Schrift, eine gut lesbare Textschrift
- [x] `system-ui` und Georgia als Fallback in der Font-Stack belassen
- [x] Farbtokens in `:root` prüfen und dokumentieren

### SRL sichtbar
- [x] Phasen-Markierung auf Missionskarten
- [x] Wochenkopf zeigt den Phasenschwerpunkt
- [x] Filter nach Phase ergänzend zu den bestehenden Bereichs-Tabs
- [x] Wortlaut strikt: **Planung – Durchführung – Reflexion**

**Fertig, wenn:**
- [x] Ein Ausbau in der Kajüte verändert sichtbar das Schiff auf einem zweiten Gerät
- [x] Kein Emoji mehr in der Oberfläche (Inhalte der Kinder ausgenommen)
- [ ] Ansicht auf iPad quer und iPhone geprüft

---

## Phase 3 — Game Feel

**Aufwand:** ca. 4 Tage · **Ziel:** bis Do 27.08.2026 · **Branch:** `modern/03-juice`
**Punkt 3 · alles hinter `ui.juice` und `ui.sound`**

- [x] Ressourcenzahlen zählen hoch statt zu springen
- [x] Meilensteinschwellen als Markierung im Glasgefäß sichtbar (`week.milestones`)
- [x] Partikel und Lichtakzent beim Freischalten eines Ausbaus
- [x] Stempel-Animation erweitern, Toast durch eine erzählerische Einblendung ersetzen
- [x] Haptik über `navigator.vibrate` bei Abgabe und Freischaltung
- [x] Klangebene: Wellen leise im Hintergrund, Glasstein, Holzknarren, Fanfare
- [x] Ton startet **erst nach einer Nutzergeste**, Mute-Schalter dauerhaft sichtbar und gespeichert
- [x] `prefers-reduced-motion`: echte ruhige Variante, nicht nur „Animationen aus"
- [~] Klangdateien in den Service-Worker-Cache aufnehmen — entfällt: der Klang ist synthetisiert, es gibt keine Dateien

**Fertig, wenn:**
- [ ] Ein Klassensatz iPads mit stummgeschaltetem Ton bleibt vollständig bedienbar
- [ ] Reduced-Motion-Durchlauf ohne Informationsverlust
- [ ] Bildrate auf dem ältesten vorhandenen iPad geprüft

---

## Abnahme vor dem Start

**Zeitraum:** 28.–31.08.2026 · **kein neuer Code**

- [ ] Vollständiger Durchlauf Woche 1 bis 3 auf dem Klassen-iPad
- [ ] Sechs bis acht Geräte gleichzeitig im Schul-WLAN
- [ ] Abgabe in allen vier Formen: Text, Zeichnung, Foto, Audio
- [ ] Freigabe, Besatzungsrat, Sicherung exportieren und wieder importieren
- [ ] Beamer- beziehungsweise Apple-TV-Darstellung geprüft
- [ ] Rückfallweg dokumentiert: welche Flags im Notfall auf `false`
- [ ] Herr Wegemann kennt PIN, Ablauf und Notfallweg

---

## Nach dem Start

Bewusst **in die laufende Reihe** gelegt. Ein Navigationsumbau kurz vor dem Start ist genau das
Risiko, das dieser Plan vermeiden soll.

### Phase 4 — Szene und Navigation (Punkt 1, Herbstferien, ca. 6 Tage)
- [ ] Deck als durchgehende Szene mit Parallax-Ebenen
- [ ] Kamerafahrt zum Ort über die View-Transition-API
- [ ] Diegetische Bereiche: Logbuch als Buch, Auftragstafel als Korkbrett
- [ ] Bottom-Nav bleibt vollständig funktionsfähig als Alternative und Rückfallweg
- [ ] Fokusführung für Tastatur und VoiceOver ist Abnahmekriterium, nicht Beiwerk

### Phase 5 — Live-Ereignisse (Punkt 5, ca. 3 Tage)
- [ ] Supabase Realtime statt Polling, Polling bleibt als Fallback im Code
- [ ] Presence-Anzeige „x an Bord"
- [ ] Rat mit Countdown und gestaffeltem Ergebnis-Reveal
- [ ] Wochenstart als kurze Cutscene
- [ ] Ereignisse durch die Lehrkraft auslösbar, auf allen Geräten gleichzeitig sichtbar
- [ ] Lasttest mit der vollen Klasse, nicht am Schreibtisch

### Phase 6 — Kommandobrücke (Punkt 6, ca. 3 Tage)
- [ ] Beitragsfreigabe als Kartenstapel zum Durchwischen
- [ ] Bühnenmodus: Vollbild ohne Bedienelemente für Apple TV
- [ ] Wochen-Vorschau ohne Änderung am echten Spielstand
- [ ] Wochen-Editor statt JSON von Hand
- [ ] Jahrgangs-Reset bei erhaltener Konfiguration

---

## Definition of Done (gilt für jeden Schritt)

- [ ] Läuft offline als installierte PWA
- [ ] `prefers-reduced-motion` sauber bedient
- [ ] Auf iPad quer und iPhone geprüft
- [ ] Alte Sicherung importierbar
- [ ] Pixel-Diff grün oder Abweichung bewusst abgenommen
- [ ] Flag dokumentiert und standardmäßig aus
