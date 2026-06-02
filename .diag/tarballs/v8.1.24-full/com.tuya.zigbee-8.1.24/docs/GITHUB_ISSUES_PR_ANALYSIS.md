# 📊 GitHub Issues & PR Analysis — Re-dump 2026-05-26

> **Généré automatiquement** par Antigravity IDE — 26 mai 2026  
> Repo : `dlnraja/com.tuya.zigbee` | Branch : `master`

---

## 🔴 Issues Ouvertes Critiques (à traiter)

| # | Titre | Type | Priorité |
|---|-------|------|----------|
| #342 | [Auto] 298 new fingerprints from community (2026-05) | 🤖 Auto-FP | Haute |
| #340 | [soil_sensor] Bug: ZG-303Z | 🐛 Bug | Haute |
| #339 | [radiator_valve] Bug: _TZE200_9xfjixap | 🐛 Bug | Haute |
| #338 | Bug report - App Crash on startup | 🐛 Bug Critique | Critique |
| #337 | [motion_sensor_2] Bug: _TZE200_3towulqd | 🐛 Bug | Haute |
| #336 | [Auto] 298 new fingerprints from community (2026-05) | 🤖 Auto-FP | Haute |
| #335 | [Auto] 51 new fingerprints from community (2026-05) | 🤖 Auto-FP | Moyenne |
| #334 | _TZ3000_yj6k7vfo [button_wireless_smart] Bug | 🐛 Bug | Haute |
| #333 | Smart Button (round). Added but not working | 🐛 Bug | Haute |
| #329 | CT Clamp Power Meter | 📱 Device Request | Moyenne |
| #328 | Pressure Sensing Strap/Bed Occupancy Sensor | 📱 Device Request | Moyenne |
| #324 | 2.4 ghz MMwave _TZE200_hl0ss9oa | 🐛 Bug | Haute |
| #322 | DEVICE REQUEST LORATAP TS0043 | 📱 Device Request | Basse |

---

## ✅ Issues Récemment Résolues (fermées)

| # | Titre | Résolution |
|---|-------|------------|
| #332 | [BUG] Could not get device by ID - QS-Zigbee-C03 | ✅ Résolu (fingerprint ajouté) |
| #331 | [BUG] Setting tab not loading | ✅ Résolu |
| #326 | [rain_sensor] Bug: _TZE200_u6x1zyv2 | ✅ Résolu |
| #325 | Climate sensor détecté comme presence sensor | ✅ Résolu |
| #323 | Tuya PJ-1203A Incorrect measurement values | ✅ Résolu |
| #319 | Tuya ZG-101Z_D_1 | ✅ Résolu (ajout fingerprint) |
| #318 | Tuya PJ-1203A Incorrect measurement values | ✅ Résolu (doublon) |
| #316 | Climate sensor, wrong device recognized | ✅ Résolu |
| #314 | Smart Wireless Button (1), unknown device | ✅ Résolu |
| #312 | INSOMA DUAL IRRIGATION VALVE | ✅ Résolu (fingerprint complet) |
| #309 | Tuya PJ-1203A Bidirectional Energy Meter | ✅ Résolu |
| #305 | Zigbee Gate Opener QS-Zigbee-C03 TS0603 | ✅ Résolu |
| #302 | App crashes during startup | ✅ Résolu (safe require fix v8.5.0) |
| #308 | [BUG] Setting tab not loading | ✅ Résolu (doublon) |

---

## 📈 Patterns Récurrents (Intelligence Engine)

| Pattern | Signalements | Priorité | Action |
|---------|-------------|----------|--------|
| False Battery Alert / Missing Battery | 35 | 🔴 Critique | `get mainsPowered()` + removeCapability |
| Pairing Failure | 18 | 🔴 Haute | Cross-ref Z2M pour FPs manquants |
| Device Not Responding | 8 | 🟡 Haute | _destroyed guard + timeout cleanup |
| Device Shows Unknown | 7 | 🟡 Haute | Fingerprint manquant ou collision |
| Ring/Alarm Wrong | 5 | 🟡 Moyenne | DP mapping incorrect |

---

## 🤖 Auto-FP Issues (fingerprints communautaires)

### Issues #342, #336, #335 — 298+298+51 = 647 FPs communautaires
Ces issues sont générées automatiquement par le workflow mensuel enrichment.  
**Statut actuel** : OPEN → à traiter via `node scripts/apply_enriched_fps_v3.js`

---

## 🆕 Nouveaux Appareils Z2M Non Supportés (2026-05)

Identifiés par `gather-intelligence.js` → 16 nouveaux :

| MFR | Source | Type probable |
|-----|--------|---------------|
| `_TZE200_jt50ea5d` | z2m-converter | Inconnu |
| `_TZ3210_jaap6jeb` | z2m-converter | Inconnu |
| `_TZE284_g1enhdsi` | z2m-converter | Inconnu |
| `_TZ3000_qamj2vnn` | z2m-converter | Inconnu |
| `_TZ3000_tw4ztbp4` | z2m-converter | Inconnu |
| `_TZ3000_avotanj3` | z2m-converter | Inconnu |
| `_TZE204_2jnoy8dj` | z2m-converter | Inconnu |
| `_TZ3210_iymfxdis` | z2m-converter | Inconnu |
| `_TZ3002_xkxgfxsg` | z2m-converter | Inconnu |
| `_TZ3002_tlsvxhxc` | z2m-converter | Inconnu |

---

## 🏛️ Forum Homey — FPs Non Supportés Détectés

| MFR | Signalements Forum |
|-----|--------------------|
| `_TYZB01_a476raq2` | Forum T140352 |
| `_TYZB01_hjsgdkfl` | Forum T140352 |
| `_TZ3000_bjawzod` | Forum T140352 |
| `_TZ3000_sqcn0y` | Forum T140352 |
| `_TZ3000_zgyzgd` | Forum T140352 |
| `_TZ3000_cehuw1l2` | Forum T140352 |

→ **Actions** : Cross-référencer avec Z2M pour identifier le driver correct, puis ajouter les fingerprints.

---

## 📋 PRs Actives

| # | Titre | État |
|---|-------|------|
| #341 | Fix PDominikPL (wall_remote driver) | ✅ Merged (v8.5.0) |

---

## 📅 Historique Auto-FP Issues (Résumé)

| Période | Issues | FPs |
|---------|--------|-----|
| 2026-05 | #342, #336, #335 | ~647 |
| 2026-04 | #315, #313, #311, #307, #303, #301, #300, #298...#286 | ~644 chacune |
| 2026-04 | #285, #282 | ~201 chacune |

---

*Généré le 26/05/2026 — Source : `gh issue list --repo dlnraja/com.tuya.zigbee --state all --limit 50` + `gather-intelligence.js`*
