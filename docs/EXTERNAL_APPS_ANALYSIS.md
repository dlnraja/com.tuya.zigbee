# 🔍 Analyse des apps Homey Tuya/Zigbee — import intelligent des bonnes pratiques

> 2026-07-30. Politique d'import : **données factuelles et patterns uniquement**
> (empreintes, DPs, clusters, intervalles de reporting — non copyrightables).
> **Jamais de copie de code** — toute implémentation est réécrite dans notre
> architecture, avec nos tests.

## Sources analysées et licences

| Source | Licence | Usage chez nous |
|---|---|---|
| JohanBendz/com.tuya.zigbee (upstream) | MIT | Origine du fork ; empreintes cross-référencées (dump complet 2026-07-29 : 1241 issues, 234 PRs, 110 forks) |
| Koenkk/zigbee-herdsman-converters (Z2M) | MIT | Source factuelle : DPs, converters, fingerprints (`lib/tuya/TuyaDataPointsZ2M.js`, `EnrichedDPMappings.js`) |
| ZHA/zigpy zhaquirks | Apache-2.0 | Quirks Tuya (magic packet, MCU) — patterns ré-implémentés |
| Athom homey-zigbeedriver + exemples SDK | MIT | Classe de base, patterns maintenance/OTA |
| OpenHAB, Hubitat, deCONZ, SmartThings | OSS divers | Intervalles de reporting, courbes batterie — recherches intégrées v5.4 |
| 50+ apps communauté Homey | divers | Synthèse `docs/BEST_PRACTICES_500.md` (500+ patterns) |

## Vérifications de conformité aux patterns (2026-07-30)

| Pattern (référence) | Statut chez nous |
|---|---|
| `super.onDeleted()` partout, y compris WiFi (Athom BP-001) | ✅ 0 violation (audit des 52 drivers wifi_*) |
| `configureReporting` avec intervalles par capability (IKEA/Aqara/OpenHAB) | ✅ `UnifiedSensorBase._getReportingConfig` |
| OTA check via maintenance action (SDK3) | ✅ `TuyaZigbeeDevice.onMaintenanceAction` |
| Endpoints multi-gang | ✅ audité : les 8 « gaps » sont des devices **Tuya DP** (canaux via DPs 24-27, 1-2…), endpoints non pertinents — pas de bug |
| Couverture drivers vs upstream | ✅ 431 vs 113 — superset complet (0 driver Johan manquant) |
| Couverture empreintes vs issues/PRs/forum | ✅ 1920 cross-référencées, 2 manquantes ajoutées (#183, #395) |

## Enrichissements importés cette session (déjà livrés)

- Retries IAS différés pour appareils endormis (pattern sleepy-device des apps IKEA/Aqara, ré-implémenté dans `IASZoneManager`).
- Logger de trames non reconnues TS0044 (pattern « verbose diagnostic » de Z2M, ré-implémenté dans `button_wireless_4`).
- Normalisation batterie multi-échelles (courbes CR2032 non-linéaires, recherche OpenHAB/Hubitat intégrée dans `UnifiedBatteryHandler` + `AdaptiveDataParser`).

## Rejetés (et pourquoi)

- **Copie de drivers Z2M/ZHA en masse** : incompatibles avec le modèle Homey (capabilities/flows) et inutile — notre couverture est un superset.
- **Groupes Zigbee / multicast** (apps Hue/deCONZ) : hors scope Tuya DP, coût/risque élevé.
- **DDF deCONZ** : format incompatible, notre `.homeycompose` couvre le besoin.

## Ce qui reste importable

- Courbes de décharge batterie par chimie (ZHA battery quirks) — affiner `BatteryProfileDatabase`.
- Intervalles de reporting par fabricant (certains Tuya ignorent configureReporting — forcer le polling, pattern Z2M `onEvent`) — candidat lot B.
