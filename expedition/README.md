# Expedition Otterbucht

Kooperatives Strategiespiel für zwei Kinder an einem Laptop (Klassen-AG 5.3).
Ziel: **Planung – Durchführung – Reflexion** spielerisch üben und den **Strategiebegriff** aus dem SRL verstehen.

- 12 Level in 4 Welten, jedes Level durchläuft Planung → Durchführung → Reflexion
- 6 Strategiekarten (Überblick, Rückwärts denken, Etappen, Aufgaben verteilen, Im Takt planen, Testen & anpassen)
- Vorhersage vor jedem Level (Stern für realistische Selbsteinschätzung)
- Lösungsleiter mit 3 Sprossen pro Level
- „👋 Wo stehen wir?“ für den Wiedereinstieg, wenn ein Kind kurz weg war
- Etappen-Reflexion nach jeder Welt, Logbuch (druckbar), Urkunde
- Übersicht für die Lehrkraft auf dem Startbildschirm
- Speicherung im localStorage des jeweiligen Laptops

## Technik
- `index.html`, `style.css`, `js/app.js` (Ablauf), `js/engine.js` (Spielregeln), `js/levels.js` (Karten), `js/scene.js` (3D)
- Bibliotheken lokal in `vendor/`: three.js r187, GSAP, canvas-confetti → läuft ohne CDN
- Testhilfe: `index.html?test=L5` öffnet ein Level direkt mit Testteam

## Level ändern
Karten in `js/levels.js` bearbeiten und danach prüfen:

```
cd expedition/tools && node solve.mjs        # alle Level
node solve.mjs L7                            # ein Level, mit Musterlösung
```
Der Löser zeigt die kürzeste Lösung und warnt, wenn `maxSteps` zu knapp ist.
