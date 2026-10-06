# Territory – Browser-Spiel

Ein Territory-Control-Spiel mit Pergamentkarte, organischen Gebieten und Echtzeitkämpfen.

## Start und Steuerung

- `index.html` im Browser öffnen; keine Installation erforderlich.
- Vor Rundenbeginn Schwierigkeit und eine der drei Fähigkeiten wählen, dann „Spiel starten“ anklicken.
- Ein eigenes grünes Feld und anschließend ein beliebiges Zielfeld anklicken, oder zwischen den Feldern ziehen. Angriffe sind über die ganze Karte erlaubt. Der animierte Pfeil zeigt die Zugrichtung.
- Es werden 50 % der verfügbaren Soldaten entsendet. Die Runde läuft ohne Pause; „Neu starten“ führt zurück zur Rundenauswahl.
- Große Zahl: aktive Soldaten. „Kap.“: Feldkapazität. Das Symbol darunter kennzeichnet Spezialfelder.

## Fähigkeiten

Die aktuelle Oberfläche zeigt **Version 0.4.0**. Grafik und Skript werden mit dieser Versionskennung geladen.

Eine Fähigkeit wird für die Runde gewählt. Sie ist ab Start bereit und nach jedem erfolgreichen Einsatz 60 Sekunden gesperrt. Den Fähigkeitsknopf anklicken und danach ein passendes Zielfeld wählen. Bei jedem Einsatz darf ein anderes Feld gewählt werden. Ein erneuter Klick auf den Fähigkeitsknopf bricht die Zielauswahl ab.

- **Ausbau:** dauerhaft +15 Kapazität auf einem eigenen Feld.
- **Verstärkung:** +15 Soldaten auf einem eigenen Feld, auch über dessen Kapazität hinaus. Automatische Produktion setzt erst unterhalb der Kapazität wieder ein.
- **Schlag:** −15 Soldaten auf einem feindlichen Feld, mindestens 0. Das Feld wird dadurch nicht automatisch erobert.

## Felder und Schwierigkeit

- **Vulkan ♨:** verliert unabhängig vom Besitzer 1 Soldaten pro Sekunde bis 0 und produziert keine Soldaten.
- **Burg ♜:** vernichtet 2 angreifende Soldaten pro Sekunde während ihres Anmarschs. Eigene Verstärkungen und Teleportationen werden nicht beschossen.
- **Schrein ◎:** erlaubt Truppentransfers zu jedem anderen Schrein, unabhängig von Nachbarschaft und Besitzer. Ankunft nach einer kurzen Teleportanimation; am Ziel gelten die normalen Kampfregeln.
- **Grenzland:** 2 Schreine, langsamere KI.
- **Gefahrenland:** 2 Schreine, 1 Vulkan, 1 Burg.
- **Feuerland:** 2 Schreine, 3 Vulkane, 2 Burgen, schnellere KI.

Alle besetzten normalen Felder produzieren unabhängig von ihrer Kapazität 1 Soldaten alle 3 Sekunden. Neutrale Felder produzieren nicht. Automatische Produktion endet an der Kapazität.

Eigene Truppen verstärken eigene Felder bis zur Kapazität, ohne vorhandene überzählige Soldaten zu entfernen. Bei feindlichen oder neutralen Feldern werden Angreifer und Verteidiger gegeneinander verrechnet. Sieg: keine KI-Felder und keine KI-Truppen mehr vorhanden; Niederlage entsprechend für den Spieler.

Die KI erobert Gebiete in Richtung Spieler, verstärkt ihre Front aus dem Hinterland und greift auch stärkere Spielerfelder an, um ihre Verteidigung schrittweise abzubauen.

## Entwicklung und Tests

Optionaler lokaler Server: `python3 -m http.server 8000` im Projektordner.

Die Logiktests benötigen Node.js und keine weiteren Pakete:

```sh
node --test tests/game.test.cjs
```

Optionale Browserprüfungen für Maus und Touchscreen benötigen Python 3, Playwright und Chromium:

```sh
node tests/browser-smoke.cjs
```

`CHROMIUM_PATH` kann einen abweichenden Chromium-Pfad angeben. Diese Prüfungen testen echte Klicks, Touch-Gesten, Ziehpfeile und die Zielfeldwahl für Fähigkeiten.
