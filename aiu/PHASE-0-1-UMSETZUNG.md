# Phase 0 und 1 — was umgesetzt wurde

Stand: 27.07.2026 · Grundlage: Commit vom 17.07.2026
Alle Änderungen sind **additiv oder verhaltensgleich**. Die Oberfläche sieht unverändert aus,
alle Feature-Schalter stehen auf `false`.

---

## Vor dem Übernehmen

```bash
git tag pre-modern-2026-07
git push origin pre-modern-2026-07
git checkout -b modern/01-fundament
# Dateien aus dem Paket in den Ordner aiu/ kopieren
git add -A && git commit -m "Fundament: Store, Router, lokale Bibliotheken, SRL-Felder"
git push -u origin modern/01-fundament
```

In Vercel ein Preview-Deployment für den Branch prüfen, bevor nach `main` gemerged wird.

---

## Neue Dateien

| Datei | Zweck |
|---|---|
| `app-store.js` | Zustandsspeicher mit Themen-Abonnements, gebündelter Aktualisierung und Fehlerisolierung |
| `vendor/three.min.js` | Three.js r128 lokal (vorher CDN) |
| `vendor/supabase.js` | supabase-js 2 lokal (vorher CDN) |
| `tests/smoke.mjs` | Startet die App in jsdom und prüft 23 Zusicherungen, ohne Browser-Download |
| `tests/visual.spec.js` | Playwright-Pixelvergleich für sieben Ansichten in zwei Auflösungen |
| `tests/playwright.config.js` | Testkonfiguration samt lokalem Server |
| `tests/package.json` | Prüfwerkzeuge, wird über `.vercelignore` nicht ausgeliefert |
| `.vercelignore` | schließt `tests/` vom Deployment aus |

## Geänderte Dateien

**`config-base.json`** — neuer Block `ui` mit neun Schaltern, alle `false`.

**`app-core.js`**
- `flag(name)` liest die Schalter defensiv aus
- `render()` heißt weiterhin `render()`, verteilt die Arbeit aber über den Store
- Kopfzeile und Kapitel sind als `renderChapter()` herausgelöst
- `runtimeTopics(vorher, nachher)` bestimmt, welche Bereiche nach einer Änderung neu zu zeichnen sind
- `gotoView()` nutzt die History-API, dazu `initRouter()`, `viewFromHash()`, `viewAllowed()`
- `updateSession()` meldet einen Wechsel des Freigabestatus selbst an den Store

**`app-gems.js`** — das Überschreiben von `render()` am Dateiende ist entfallen. Die Schatzkammer
hört jetzt auf die Themen `resources` und `locks`.

**`app-sync.js`** — `syncRefreshRuntime()` zeichnet nicht mehr die gesamte Oberfläche neu, sondern
vergleicht alten und neuen Spielstand und aktualisiert nur die betroffenen Bereiche. Das war die
Ursache des Flackerns im Fünf-Sekunden-Takt.

**`app-teacher.js`** — Aktionen melden gezielte Themen statt Sammelaufrufe; Start über `renderNow()`
und `initRouter()`; neuer Service-Worker-Ablauf mit Hinweis auf neue Versionen.

**`app.js`** — lädt `app-store.js` zuerst und Supabase lokal. Optionale Dateien dürfen fehlen, ohne
dass die App abbricht.

**`index.html`** — Three.js kommt aus `vendor/` statt von cdnjs.

**`sw.js`** — Cache-Name aus einer Versionskonstante (`v4-0-fundament`), neue Dateien aufgenommen.

**`weeks-01-05.json`, `weeks-06-10.json`, `weeks-11-15.json`** — jede Mission hat ein Feld `srl`,
jede Woche ein Feld `srlFokus`.

---

## Warum das Offline-Verhalten vorher nicht funktionierte

`app.js` lud Supabase von `cdn.jsdelivr.net`, `index.html` lud Three.js von `cdnjs.cloudflare.com`.
Beide Fehlschläge waren fatal: der Ladefehler beendete die Kette und führte zur Meldung
„Die Begleit-App konnte nicht vollständig geladen werden." Ohne Netz startete die App also nicht,
obwohl ein Service Worker vorhanden war. Beide Bibliotheken liegen jetzt lokal und sind im
Cache hinterlegt.

---

## Prüfen

```bash
cd aiu/tests
npm install
npm run smoke          # 23 Zusicherungen, kein Browser nötig
npm run install:browser
npm run visual:update  # Referenzbilder einmalig erzeugen
npm run visual         # danach bei jeder Änderung
```

Der Smoke-Test prüft unter anderem: Konfiguration geladen, alle zehn Themen haben Abonnenten,
Kopfzeile und Missionen gefüllt, Router setzt die Adresse, gesperrte Ansichten bleiben gesperrt,
Teilaktualisierung greift, Wochenwechsel zeichnet alles, und ein Fehler in einem Renderer reißt
die übrigen Bereiche nicht mit.

Die Referenzbilder blenden das animierte Schiff, die 3D-Schatzkammer und die eingebettete Karte aus,
weil diese Bereiche nicht bildgleich sind.

---

## Bitte gegenlesen

Die **SRL-Zuordnung** ist ein Vorschlag, kein Ergebnis. Grundregel: Kartenraum → Planung,
Werft → Durchführung, Logbuch → Reflexion, dazu acht begründete Einzelfälle
(`w2-hilfe`, `w3-prueftipp`, `w3-frage`, `w5-ausbau`, `w6-route`, `w13-check`, `w14-sichten`,
`w15-naechste`). Verteilung: 16 Planung, 19 Durchführung, 13 Reflexion.

Woche 6 hat `srlFokus: "zyklus"`, weil die Routine dort alle drei Phasen umfasst. Falls das nicht
passt, bitte auf eine der drei Phasen ändern.

Sichtbar wird all das erst in Phase 2 mit `ui.srlPhases`.

---

## Was bewusst offen bleibt

- **Kein automatischer Neustart** bei neuer Version. Ein Reload mitten in der Stunde könnte eine
  unfertige Zeichnung kosten; stattdessen erscheint ein Hinweis.
- **`app-ship.js` bleibt unverändert.** Das Schiff ist ein iframe auf `segelschiff-header.html` und
  wird erst in Phase 2 an die Ausbauten gekoppelt.
- **Das Thema `ship` hat noch keinen Abonnenten.** Es ist für Phase 2 vorbereitet.
- **Polling bleibt.** Realtime ist Phase 5.
