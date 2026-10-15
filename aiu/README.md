# Aufbruch ins Unbekannte – Begleit-App

Dieser Ordner enthält die Begleit-App für das kooperative Klassenprojekt **Aufbruch ins Unbekannte**.

## Start und Vercel

Die App startet über `index.html` und benötigt kein lokales Build-System.

Für ein eigenes Vercel-Projekt:

1. Repository `technikerleben/SRL5` in Vercel importieren.
2. Als **Root Directory** den Ordner `aiu` auswählen.
3. Framework Preset: **Other**.
4. Build Command und Output Directory leer lassen.
5. Deploy starten.

Alternativ kann die App innerhalb einer bereits veröffentlichten statischen Website unter `/aiu/` aufgerufen werden.

## Lehrkräftebereich

Der Zugang ist mit einem 7-stelligen Code gesichert. In `config-base.json` steht nur ein PBKDF2-Hash des Codes, nie der Code selbst. Den Code bitte nicht ins Repository schreiben.

- Nach drei falschen Eingaben wartet die App 30 Sekunden, danach jeweils doppelt so lange (höchstens 5 Minuten).
- Nach 10 Minuten ohne Eingabe meldet sich die Kajüte automatisch ab. Der Kioskbetrieb meldet beim Rücksprung zum Deck ebenfalls ab.

Neuen Code einrichten (ersetzt `teacherAuth.salz` und `teacherAuth.hash` in `config-base.json`):

```bash
python3 -c "import hashlib,os,base64,getpass;c=getpass.getpass('Neuer Code: ').encode();s=os.urandom(16);print('salz:',base64.b64encode(s).decode());print('hash:',base64.b64encode(hashlib.pbkdf2_hmac('sha256',c,s,310000,32)).decode())"
```

Grenzen: Die App läuft ohne eigenen Server. Der Code hält Kinder zuverlässig fern, schützt aber nicht vor technisch versierten Angriffen. Für echten Schutz der zentral gespeicherten Daten braucht es bei aktiver Supabase-Synchronisierung ein Lehrerkonto (Supabase Auth) und strengere Datenbankregeln.

Im Lehrkräftebereich können Woche, Ressourcen, Schülerzugang, Abstimmungen und Schiffsausbauten verwaltet werden.

## Mehrere Laptops synchronisieren

Die App besitzt jetzt eine optionale Mehrgeräte-Synchronisierung über Supabase. Ohne Konfiguration arbeitet sie weiterhin lokal auf dem jeweiligen Gerät.

### 1. Supabase-Projekt anlegen

In Supabase ein neues Projekt erstellen. Danach im **SQL Editor** die Datei `supabase-setup.sql` vollständig ausführen.

Das Skript erstellt:

- `aiu_state` für Woche, Ressourcen, Freischaltungen und Sitzungsstatus
- `aiu_submissions` für Aufträge und Logbuchvorschläge
- `aiu_votes` für gemeinsame Abstimmungen
- den Storage-Bereich `aiu-media` für Zeichnungen, Fotos und Audio

### 2. Zugangsdaten eintragen

In `sync-config.js` eintragen:

```js
window.AIU_SYNC_CONFIG = {
  enabled: true,
  supabaseUrl: "https://DEIN-PROJEKT.supabase.co",
  supabaseAnonKey: "DEIN-ANON-PUBLIC-KEY",
  classCode: "SRL5-AIU",
  pollIntervalMs: 5000
};
```

Die Werte stehen in Supabase unter **Project Settings → API**. Verwendet wird ausschließlich der öffentliche `anon`-Schlüssel, niemals der `service_role`-Schlüssel.

### 3. Deployment abwarten

Nach dem Commit startet Vercel automatisch ein neues Deployment. In der Kopfzeile erscheint anschließend:

- `☁️ Geräte verbunden` bei aktiver Synchronisierung
- `💻 Nur dieses Gerät` ohne Supabase-Konfiguration
- `⚠️ Offline-Modus` bei einer Verbindungsstörung

## Was zwischen Geräten geteilt wird

- aktuelle Woche
- Ressourcenstände
- geöffneter Schülerzugang
- geöffneter Besatzungsrat
- Schiffsausbauten
- freigegebene Logbucheinträge
- eingereichte Texte, Zeichnungen, Fotos und Audiodateien
- Abstimmungen

Der gemeinsame Stand wird ungefähr alle fünf Sekunden aktualisiert.

## Offline-Verhalten

Jeder Beitrag wird zunächst lokal im Browser gespeichert. Bei aktiver Supabase-Verbindung wird er zusätzlich zentral hochgeladen. Die App behält damit einen lokalen Fallback, falls die Verbindung kurzfristig ausfällt.

## Konfiguration der Inhalte

Die Grundkonfiguration wurde zur besseren Wartbarkeit aufgeteilt:

- `config-base.json`
- `weeks-01-05.json`
- `weeks-06-10.json`
- `weeks-11-15.json`

`config-loader.js` führt diese Dateien beim Start zusammen.

## Wichtige Dateien

- `index.html` – Oberfläche
- `styles.css` und `gems.css` – Gestaltung
- `app.js` – lädt die Anwendungsmodule
- `app-core.js` – Darstellung und Navigation
- `app-sync.js` – Supabase-Synchronisierung und lokaler Fallback
- `sync-config.js` – Zugangsdaten und Klassencode
- `app-input.js` – Beiträge, Zeichnung, Foto und Audio
- `app-teacher.js` – Lehrkräftebereich, Moderation und Sicherungen
- `supabase-setup.sql` – Tabellen, Richtlinien und Medienspeicher
- `sw.js` – Offline-Unterstützung
- `app.webmanifest` und `icon.svg` – Installation auf dem iPad oder Laptop
- `karte.svg` – Karten-Fallback

## Datenschutz und Grenzen

Es sollten nur Vorname, Kürzel oder Teamname gespeichert werden. E-Mail-Adressen oder vollständige Schülerprofile sind nicht nötig.

Die mitgelieferte Supabase-Konfiguration ist für ein beaufsichtigtes Klassenprojekt gedacht. Der `classCode` trennt Daten logisch, ist aber kein geheimer Login. Beiträge werden erst nach Lehrkraftfreigabe in das Logbuch übernommen. Fotos und Audio sollten nur nach den schulischen Datenschutzregeln verwendet werden.
