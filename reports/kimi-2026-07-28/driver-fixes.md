# Driver Fixes — 2026-07-28 (kimi)

Projet : `com.tuya.zigbee` — branche `master`. Aucun commit/push effectué.

| Bug | Cause | Correction | Validateur avant | Validateur après |
|-----|-------|------------|------------------|------------------|
| 1 — Collision CI `_TZ3000_eqsair32\|TS000F` | `TS000F` (switch 1 gang) listé dans les `productId` de `switch_3gang`, créant une collision Sacred Couple avec `switch_1gang` (check = produit croisé mfr × pid). Le mfr est légitime dans `switch_3gang` (device TS0003, routing P75.18) — seul le pid était fautif. | Retrait de `TS000F` des `productId` de `drivers/switch_3gang/driver.compose.json` + sync `app.json`. | `fp-collision-check` : exit 1, 42 nouvelles collisions | exit 0, **0 nouvelle collision** (44 courantes, toutes baselinelées) |
| 2 — `wall_switch_4gang_1way` button.1-4 | 4 capabilities `button.1`…`button.4` déclarées sans `capabilitiesOptions` (`getable:false`, `setable:false`, `maintenanceAction:true` — invariant I7) et absentes d'`app.json`. | Ajout du bloc `capabilitiesOptions` dans `drivers/wall_switch_4gang_1way/driver.compose.json` (pattern `wall_switch_4_gang` / `wall_switch_3gang_1way`) ; ajout des 4 capabilities + `capabilitiesOptions` (titres uniquement, comme le transpileur compose le fait) dans `app.json`. | `validate-driver-mesh` : exit 1, 4 ERROR + 4 WARN | exit 0, **0 erreur, 0 warning** |
| 3 — HOBEIAN `ZG-227Z` mal routé | `ZG-227Z` (capteur contact+présence HOBEIAN) dans les `productId` de `soil_sensor`, alors que `sensor_contact_presence` (bon driver) avait le pid mais **aucun** manufacturerName → le check ne le voyait pas. | Retrait de `ZG-227Z` (et `ZG-227ZL`, même famille) des `productId` de `drivers/soil_sensor/driver.compose.json` ; ajout de `HOBEIAN`/`Hobeian`/`hobeian` aux `manufacturerName` de `drivers/sensor_contact_presence/driver.compose.json` (pattern des drivers HOBEIAN voisins) ; sync `app.json`. | `hobeian-consistency-check` : exit 1, `ZG-227Z dans soil_sensor` | exit 0, **0 erreur, 0 warning** |

## Points annexes traités pour mettre le validateur collision au vert

Le check de collision (produit croisé mfr × pid) signalait **42** nouvelles collisions, pas seulement `TS000F` :

- **32 paires `_TZ3000_eqsair32|<pid>` (switch_1gang ↔ switch_3gang)** : même pattern que les entrées baseline existantes `TS0003`/`TS0601` (« 3-gang specific vs switch_1gang fallback », dual-claim intentionnel documenté). → ajoutées à `.github/fingerprint-collision-baseline.json` avec la même note.
- **6 paires `hobeian|Excellux` et `hobeian|TS0044` (sensor_contact_zigbee ↔ soil_sensor)** : pids sans rapport avec un capteur de sol (`Excellux` = éclairage, `TS0044` = bouton 4 scènes). → retirés des `productId` de `soil_sensor` (compose + app.json). Correction réelle, pas de baseline.
- **3 paires `_TZE200_IKVNCLUO|<pid>` (presence_sensor_radar ↔ switch_wireless)** : dual-claim intentionnel P80 (`tools/ci/re-inject-manual-fixes.js` ligne 176-179, « sensor orphan TS0215A/TS0601 »). → ajoutées à la baseline avec note P80.

Baseline : 384 → 419 entrées actives (+35), `generatedAt` rafraîchi.

## Fichiers modifiés

- `drivers/switch_3gang/driver.compose.json` (retrait pid `TS000F`)
- `drivers/soil_sensor/driver.compose.json` (retrait pids `Excellux`, `TS0044`, `ZG-227Z`, `ZG-227ZL`)
- `drivers/sensor_contact_presence/driver.compose.json` (manufacturerName `[]` → 3 variantes HOBEIAN)
- `drivers/wall_switch_4gang_1way/driver.compose.json` (capabilitiesOptions button.1-4)
- `app.json` (sync des 4 drivers ci-dessus ; chaîne de génération = homey compose, édition manuelle cohérente avec le format existant — le transpileur ne conserve que `title` dans capabilitiesOptions)
- `.github/fingerprint-collision-baseline.json` (+35 entrées intentionnelles documentées)

Non modifiés (vérifiés cohérents) : `data/mfs_db.json` (hobeian → driverHint `sensor_contact_presence` déjà correct), `data/fingerprints.json` (aucune entrée `ZG-227Z`).

## Vérifications

- `node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json` → exit 0 (avant : exit 1, 42 new)
- `node scripts/validation/validate-driver-mesh.js` → exit 0, 0 erreur, 0 warning (avant : exit 1, 4 ERROR + 4 WARN)
- `node scripts/diag/hobeian-consistency-check.js` → exit 0 (avant : exit 1)
- `node scripts/_validate_all.js` → **3/3 checks passed** (mandatory + broken-requires + driver mesh)
- `npx mocha test/critical/forum-routing-regressions.test.js` → 8 passing (routing `_TZ3000_eqsair32|TS0003 → switch_3gang` préservé)
- `npx mocha test/**/*.test.js` → 64 + 12 passing, 0 fail

## Suivi possible (hors scope)

- `ZG-227ZL` retiré de `soil_sensor` par cohérence (variante du ZG-227Z) ; le check HOBEIAN ne le couvre pas (absent de `HOBEIAN_DEVICE_MAP`) — l'y ajouter si souhaité.
- Le bot `auto-fix-all` / `re-inject-manual-fixes` réinjecte périodiquement `_TZ3000_eqsair32` dans `switch_3gang` (règle `p75.18-switch-3gang-mfrs`) : c'est voulu et désormais couvert par la baseline, mais le pid `TS000F` n'a pas de règle de réinjection — le fix devrait tenir.
