# Aufbruch ins Unbekannte – Begleit-App

Dieser Ordner enthält die Begleit-App für das kooperative Klassenprojekt **Aufbruch ins Unbekannte**.

## Start

Die App startet über `index.html` und benötigt kein Build-System und keine npm-Pakete.

Für ein eigenes Vercel-Projekt:

1. Repository `technikerleben/SRL5` in Vercel importieren.
2. Als **Root Directory** den Ordner `aiu` auswählen.
3. Framework Preset: **Other**.
4. Build Command und Output Directory leer lassen.
5. Deploy starten.

Alternativ kann die App innerhalb einer bereits veröffentlichten statischen Website unter `/aiu/` aufgerufen werden.

## Lehrkräftebereich

Die voreingestellte PIN lautet `2468`.

Im Lehrkräftebereich können Woche, Ressourcen, Schülerzugang, Abstimmungen und Schiffsausbauten verwaltet werden. Der laufende Spielstand sowie Schülerbeiträge werden lokal auf dem Klassen-iPad gespeichert.

## Konfiguration

Die Grundkonfiguration wurde zur besseren Wartbarkeit aufgeteilt:

- `config-base.json`
- `weeks-01-05.json`
- `weeks-06-10.json`
- `weeks-11-15.json`

`config-loader.js` führt diese Dateien beim Start zusammen.

## Wichtige Dateien

- `index.html` – Oberfläche
- `styles.css` – Gestaltung
- `app.js` – lädt die Anwendungsmodule
- `app-core.js` – Darstellung und Navigation
- `app-input.js` – Beiträge, Zeichnung, Foto und Audio
- `app-teacher.js` – Lehrkräftebereich, IndexedDB und Sicherungen
- `sw.js` – Offline-Unterstützung
- `app.webmanifest` und `icon.svg` – Installation auf dem iPad
- `karte.svg` – Karten-Fallback

## Daten und Datenschutz

Texte, Zeichnungen, Fotos und Audiodateien werden standardmäßig nur lokal im Browser beziehungsweise in IndexedDB des verwendeten Geräts gespeichert. Regelmäßige Sicherungen können im Lehrkräftebereich heruntergeladen werden.
