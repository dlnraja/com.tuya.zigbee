# Deep Harvest — 2026-07-29

Moisson ascendante (dlnraja + upstream JohanBendz) et descendante (forks), avec lecture fine des commentaires et des images.
Budget gh : **17 appels API** utilisés (max 40). Aucun commit/push. Seul `data/mfs_db.json` modifié (+ `tmp/dp-findings.json`, ce rapport).

## 1. DLNRAJA (notre repo)

Lus : issues #513, #511, #506 (activité depuis le 16/07) + PR #512. Corps + 100 % des commentaires.

| Source | Couples extraits | Couverture |
|---|---|---|
| #513 (OPEN, bug climate sensor) | `_TZE284_hodyryli` + TS0601 | ✅ mfs + `climate_sensor` (2 variantes de casse) |
| #511 (closed, soil sensor) | `_TZE284_awepdiwi` + TS0601, `_TZE284_ga1maeof` + TS0601 | ✅ mfs + `climate_sensor` (majuscule) / `soilsensor` ; DP map ZG-303Z dans `soil_sensor/device.js` |
| #506 (closed, temp/hum → Air Purifier) | `_TZ3000_fllyghyj` + TS0201 | ✅ mfs + `climate_sensor` (fix P75.2) |
| PR #512 (Driver Maintenance) | 0 scaffold, 32 FPs ajoutés, 240 conflits cross-class, 10 doublons MFR+PID, 67 drivers orphelins | audit only |

**Bugs actifs notés :**
- **#513 OUVERT — non résolu** : `_TZE284_hodyryli` appaire toujours "Unknown Zigbee unit" en test v9.0.348 (commentaire finnamu 25/07) malgré le FP présent dans les 2 casses. Stable v5.11.216 appaire mais crash `Cannot read properties of null (reading '_onDeleted')`. Le diag-resolver auto-répond en boucle (32 commentaires) sans effet. **À investiguer.**
- #506 : crash v9.0.218 "Exit Code: 1" (résolu depuis v9.0.250) ; device fonctionne via fallback `homey:virtualdriverzigbee`.

## 2. UPSTREAM JohanBendz/com.tuya.zigbee

30 issues ouvertes récentes lues (corps + commentaires) : #1432–#1389 (device requests + 1 bug). 28 couples (mfr, pid) extraits.

**MANQUANTS → ajoutés à `data/mfs_db.json` :**
- `wing` + TS0201 — Wing ZTH11-3.0 / ZTH13-3.0 temp & humidity (#1422, #1429) — **nouvelle entrée** (sensor/climate_sensor, battery, confidence 0.6).
- `hobeian` : + modelId **ZG-303Z** — Hobeian soil sensor (#1415). Entrée existante, pid ajouté.
- `zbeacon` : + modelId **TH01** — Zbeacon Z3-P3-L_G7 temp & humidity (#1423). Entrée existante (switch TS0001/TS0601), pid ajouté + variante.

**Couverts (mfs ✓) :** `_TZE284_81yrt3lo`, `_TZ3210_nuenzetq`, `_TZ3000_kfu8zapd`, `_TZ3000_yi0n4xfd`, `_TZ3000_qja6nq5z`, `_TZE28C1000000_81yrt3lo` (mfr exotique mais réel, PJ-1203A), `_TZE204_xtrnjaoz`, `_TZE284_fhvpaltk`, `_TZ3000_zv6x8bt2`, `_TZE200_libht6ua`, `_TZE284_1youk3hj`, `_TZE200_rhgsbacq`, `_TZE284_qf5mzewi`, `_TZ3002_pzao9ls1`, `_TZE200_seq9cm6u`, `_TZE200_bxoo2swd`, `_TZE200_gubdgai2`, `_TZ3000_b4awzgct`, `_TZ3210_jlf1nepw`, `_TZE284_pcdmj88b`, `_TZE284_8zizsafo`, `_TZ3000_mrduubod`, `_TZ3000_996rpfy6`.

**Gaps driver (mfs ✓ mais aucun driver) — non touchés (hors périmètre) :** `_TZ3000_kfu8zapd` (TS0044 remote), `_TZE204_xtrnjaoz` (blind motor), `_TZE284_1youk3hj` (mmWave), `_TZE200_seq9cm6u` (bed/pressure), `_TZ3210_jlf1nepw` (power plug), `_TZE284_8zizsafo` (GIEX 2-zone valve), `_TZ3000_996rpfy6` (contact TS0203). Mapping douteux : `_TZE200_gubdgai2` (Quoya blind motor) → `motion_sensor_switch` (?).

**Bug upstream avec log :** #1432 "cannot add radar" — stack React Native `TypeError: Cannot read property 'model' of null` (CellRenderer) — crash UI app, pas de FP extrait.

## 3. DESCENDANT (forks)

5 forks vérifiés (REST commits?since=2026-07-20 + GraphQL pushedAt) :
- Mmaaikel (push 05/07), theswim (15/02), oskarirauta (16/04), MartijnEisses (30/05), MisterBRB (18/04) — **0 commit depuis le 20/07, aucun contenu nouveau**.

## 4. IMAGES ANALYSÉES (tmp/issue-images/)

5 images téléchargées et lues + 2 interviews texte :

| Image | Contenu extrait |
|---|---|
| `img-506-airpurifier.png` (#506) | Photo produit : capteur temp/hum blanc TS0201 (icône thermomètre + logo Zigbee). Pas de donnée technique. |
| `img-app-crashed.png` (upstream) | Homey mobile (suédois) : "Tuya Zigbee — Unified Smart Home Engine **v8.1.6**, Experimentell, **Kraschad**" (badge rouge crashed). Pas de stack trace. |
| `img-moes-dimmer-fault.png` (#1404, john-lundin) | Bannière erreur Homey : **"Hoppsan... något gick fel vid styrning av 2-Channel Dimmer Module — UNSUPPORTED_CLUSTER"**. → `_TZE200_bxoo2swd` rejette le ZCL standard ; hypothèse : contrôle via Tuya DP 0xEF00 requis (consigné dans dp-findings). |
| `img-version-stuck.png` (upstream) | Page settings Homey : app bloquée en **v9.0.13 Test** alors que v9.0.40 existe (Update Automatically ON) — problème de distribution du canal test. |
| `img-product-neutral.png` (device request) | Photo produit : interrupteur mural 4-gang noir with-neutral + app Smart Life + Google Home/Alexa. Pas de donnée technique. |
| `interview-513-climate.txt` | `_TZE284_hodyryli`/TS0601, ep1, profile 260, deviceId 81, in [0,4,5,60672,61184], out [10,25], battery, appVersion 80 → Tuya DP. |
| `interview-511-soil.txt` | `_TZE284_awepdiwi`/TS0601, même signature clusters, battery, appVersion 77 → Tuya DP (soil moisture/temp/battery). |

## 5. APPLICATION (data/mfs_db.json uniquement)

- Nouvelle entrée `wing` (+TS0201).
- `hobeian` : +ZG-303Z ; `zbeacon` : +TH01 (+variante Z3-P3-L_G7), lastSeen 2026-07-29, sources community.
- `stats.totalEntries` : 4313 → **4314** ; `_meta.lastUpdated` : 2026-07-29.
- DPs documentés dans `tmp/dp-findings.json` (4 findings : awepdiwi, hodyryli, bxoo2swd+hypothèse DP, fllyghyj clusters ZCL). Aucune édition de code/drivers/app.json.

## 6. VALIDATION

- JSON parse `data/mfs_db.json` : **OK**.
- `node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json` : **exit 0** (0 current, 0 new ; 20 collisions baseline résolues antérieurement).
