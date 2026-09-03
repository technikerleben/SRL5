# Visuelles System für Web, Präsentation, Druck und Klassenraum

Lies diese Referenz, wenn ein konkretes Layout, eine Benutzeroberfläche, eine Präsentation, ein Arbeitsblatt, ein PDF oder ein Schild gestaltet wird.

## Farbskalen

Die mit „Basis“ gekennzeichneten Werte sind die unveränderlichen Klassenfarben.

| Stufe | Blau | Minze | Orange |
|---:|---|---|---|
| 50 | `#EFF5FA` | `#EFFCFA` | `#FFF8F2` |
| 100 | `#DDEAF4` | `#D6F8F3` | `#FEEEDD` |
| 200 | `#BDD4E7` | `#ADEFE7` | `#FBD8B9` |
| 300 | `#91B6D4` | `#7AE7DA` | `#F6C18F` |
| 400 | `#5F91B7` | `#48DCCB` **Basis** | `#F0A66F` **Basis** |
| 500 | `#356D9C` | `#24B9AA` | `#E8833B` |
| 600 | `#245688` **Basis** | `#1B958A` | `#CF6320` |
| 700 | `#1F4770` | `#19766F` | `#A94A1A` |
| 800 | `#1C3D5E` | `#195E59` | `#893C1C` |
| 900 | `#19334E` | `#184E4A` | `#71331B` |
| 950 | `#0F2134` | `#082F2D` | `#3D180B` |

Neutrale Farben:

| Rolle | Wert |
|---|---|
| Weiß | `#FFFFFF` |
| Fast Weiß | `#F8FAFB` |
| Hellgrau | `#F2F4F6` |
| Linie hell | `#DFE5EA` |
| Linie kräftig | `#C5D0D9` |
| Sekundärtext | `#3D5061` |
| Standardtext | `#18324A` |

## Farbauswahl nach Aufgabe

- Stufen 50–100: große ruhige Hintergründe und Informationsflächen.
- Stufen 200–400: dekorative Flächen, Marker und freundliche Akzente.
- Stufen 500–700: Bedienelemente, kräftige Konturen und kleinere Vollflächen; Kontrast jeweils konkret prüfen.
- Stufen 800–950: dunkle Titelbereiche, Text und starke Orientierung.
- Verwende in einer einzelnen Ansicht meist nur eine dominante Akzentfarbe. Die zweite Akzentfarbe darf in kleineren Details auftreten.

Empfohlene Gesamtverteilung: 55–60 % Weiß/Hellgrau, 25–30 % Blau, 8–10 % Minze, 5–7 % Orange. Passe sie an das Medium an, ohne die Rangfolge zu verändern.

## Gradienten

Verwende pro Seite oder Folie normalerweise höchstens einen dominanten Verlauf.

```css
--gradient-tiefes-wasser:
  linear-gradient(135deg, #1C3D5E 0%, #245688 52%, #356D9C 100%);

--gradient-ruhige-bucht:
  linear-gradient(135deg, #EFF5FA 0%, #D6F8F3 100%);

--gradient-sonnenimpuls:
  linear-gradient(135deg, #FEEEDD 0%, #F0A66F 100%);

--gradient-klassenmoment:
  linear-gradient(120deg, #1F4770 0%, #245688 38%, #48DCCB 70%, #F0A66F 100%);
```

- **Tiefes Wasser:** Titel, Header, Navigation und feierliche Einstiege; weiße Schrift.
- **Ruhige Bucht:** Reflexion, Hilfen und große Lernflächen; dunkle Schrift.
- **Sonnenimpuls:** Aufgabenstart, Tagesziel und Handlungsaufforderung; dunkle Schrift.
- **Klassenmoment:** besondere Anlässe und dekorative Titelgrafik. Lege Text auf ein kontrastgesichertes Panel, nicht unmittelbar über den gesamten Verlauf.

## Typografie und Form

- Bevorzuge gut lesbare serifenlose Schriften: `Inter`, `Aptos`, `Segoe UI`, `Arial` oder eine vorhandene vergleichbare Hausschrift.
- Verwende für Fließtext mindestens 16 px digital. Regelmäßig benutzte Beschriftungen mindestens 14 px.
- Nutze klare, kurze Überschriften und deutliche Gewichtsunterschiede statt vieler Schriftarten.
- Runde Ecken mit 10, 16, 24 oder 32 px. Große Radien für zentrale Karten, kleine Radien für Bedienelemente.
- Arbeite mit einem 4-px-Grundraster. Häufige Abstände: 8, 12, 16, 24, 32, 48 und 72 px.
- Schatten bleiben weich und zurückhaltend; Struktur entsteht vorrangig durch Fläche, Kontur und Abstand.
- Symbole sind einfach, kräftig konturiert und stilistisch einheitlich. Mische nicht mehrere Icon-Stile.

## Wiederkehrende Komponenten

### Schaltflächen

- Hauptaktion: `#245688` mit weißer Schrift.
- Nebenaktion: Weiß mit blauem Rahmen und blauem Text.
- Aktivierender Impuls: `#F0A66F` mit `#18324A` und dunkler Kontur.
- Sichtbarer Fokusrahmen: mindestens 3 px, vorzugsweise Orange 500 oder ein gleichwertig kontrastreicher Ton.

### Informationsfelder

- Information: Blau 50, linke Kontur Blau 600, dunkler Text, `i`-Symbol.
- Erfolg/Fortschritt: Minze 50, linke Kontur Minze 600, dunkler Text, Häkchen.
- Aufgabe/Aufmerksamkeit: Orange 50, linke Kontur Orange 600, dunkler Text, Ausrufezeichen oder Aufgabensymbol.

### Lernphasen

- Planung: Blau plus Nummer 1 und Planungs-Symbol.
- Durchführung: Orange plus Nummer 2 und Aktions-Symbol.
- Reflexion: Minze plus Nummer 3 und Reflexions-Symbol.

Behalte Nummer und Begriff auch dann bei, wenn ein Material nur schwarz-weiß ausgegeben wird.

## Barrierefreiheit

- Weiß auf Klassenblau erreicht etwa `7,60:1`.
- `#18324A` auf Minze erreicht etwa `7,76:1`.
- `#18324A` auf Orange erreicht etwa `6,52:1`.
- Weiß auf Minze oder Orange ist für normalen Text ungeeignet.
- Links benötigen zusätzlich eine Unterstreichung oder ein anderes nichtfarbiges Merkmal.
- Diagramme und Statusanzeigen brauchen zusätzlich Beschriftung, Muster, Form oder Symbol.
- Prüfe konkrete Kombinationen insbesondere auf mittleren und dunklen Abstufungen; leite die Eignung nicht nur vom Namen der Stufe ab.

## Ausgabemedien

### Webseiten und Apps

- Baue responsiv, tastaturbedienbar und bei 200 % Textvergrößerung nutzbar.
- Verwende semantische HTML-Elemente, sichtbare Fokuszustände und mindestens 44 × 44 px große Hauptbedienelemente.
- Verwende die Farbskalen als CSS-Variablen und semantische Tokens, damit Komponenten nicht von einzelnen Rohfarben abhängen.

### Präsentationen und Beamer

- Verwende dunklere Blautöne, große Schrift und kräftige Konturen. Helle Minz- und Orangetöne bleichen bei Tageslicht schnell aus.
- Pro Folie eine Hauptbotschaft; Akzentflächen nur für die zentrale Orientierung.
- Sichere Text auf Bildern oder Verläufen mit einer ruhigen, kontrastreichen Fläche.

### Arbeitsblätter und PDFs

- Weißer Hintergrund; Farbe dient vor allem der Orientierung.
- Nutze helle Flächen kleinräumig und kräftige Farben für Überschrift, Linie, Nummer oder Symbol.
- Keine vollflächigen Seitenhintergründe. Linien sollten im Druck mindestens etwa 1–1,5 pt stark sein.
- Prüfe die Schwarz-Weiß-Ausgabe. Minze und Orange sind in Graustufen ähnlich hell und dürfen keine Kategorien allein unterscheiden.

### Klassenraum und Schilder

- Blau kennzeichnet dauerhafte Orientierung, Minze Hilfe/Fortschritt und Orange aktuelle oder wechselnde Impulse.
- Verwende matte Materialien und prüfe Lesbarkeit aus dem tatsächlichen Abstand sowie aus verschiedenen Blickwinkeln.
- Trenne große farbige Bereiche durch Weißraum, damit der Raum lebendig, aber nicht unruhig wirkt.

