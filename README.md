# Territory – Browser-Prototyp v0.1

Ein bewusst kleiner spielbarer Prototyp für ein Echtzeit-Territory-Control-Spiel, inspiriert vom beschriebenen Minigame-Prinzip.

## Start

1. Ordner entpacken.
2. `index.html` doppelklicken.
3. Das Spiel läuft direkt im Browser – kein Server und keine Installation nötig.
4. Auf „Spiel starten“ in der Kartenmitte klicken. Während der Partie gibt es keine Pause.

## Steuerung

- Eigene (grüne) Region anklicken, danach eine angrenzende Zielregion anklicken.
- Alternativ mit der Maus von einer grünen Region auf das Ziel ziehen.
- Es werden jeweils 50 % der aktuell sichtbaren Soldaten entsendet.

## Regeln v0.1

- Besetzte Regionen rekrutieren automatisch.
- Startfelder (Spieler und KI) produzieren 1 Soldaten alle 3 Sekunden bis zur Kapazität.
- Andere besetzte Felder rekrutieren pro Sekunde `Kapazität / 20`.
- Alle Felder zeigen aktive Soldaten und darunter „Kap.“ mit ihrer Kapazität.
- Neutrale Regionen rekrutieren nicht.
- Eigene Legion auf eigene Region = Verstärkung.
- Legion auf neutrale/feindliche Region = Kampf.
- Kampf: Angreifer minus Verteidiger; der Überlebende behält/erobert die Region.
- Sieg: Keine KI-Region und keine KI-Legion mehr vorhanden.
- Niederlage: Keine Spielerregion und keine Spielerlegion mehr vorhanden.

## Nächste sinnvolle Schritte

- Karten-/Levelsystem als JSON
- bessere KI und Schwierigkeitsgrade
- Spezialfelder: Schrein, Vulkan, Festung
- strategische Fähigkeiten
- mehrere KI-Spieler/Farben
- Sound, Effekte, organischere Kartenoptik
