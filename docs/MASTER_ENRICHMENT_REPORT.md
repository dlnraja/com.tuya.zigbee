# 📊 Rapport d'Audit + Enrichissement Master — Référence Croisée

**Date** : 2026-06-21
**Portée** : Audit exhaustif master, cross-ref PRs/issues/forum, gaps de coverage

---

## 📈 État Actuel Master

| Métrique | Valeur |
|----------|--------|
| Version | 9.0.52 |
| Drivers | 429 |
| Fichiers lib/ | 540+ |
| Tests | 53 |
| Fingerprints | 4189+ |
| Flow cards | 4313 |
| Règles documentées | R1-R29 + A11/R33-R35 |

---

## 🔴 Issues GitHub Ouvertes — Cross-Référence

| Issue | Device | Statut master | Action |
|-------|--------|:------------:|--------|
| #420 | _TZE204_clrdrnya (Wenzhi MTG235) | Fingerprint présent ✅ | DP mapping à investiguer (device-specific) |
| #419 | 122 nouveaux FPs community | Enrichissement auto | Workflow Bug Report Auto-PR actif |
| #418 | 130 nouveaux FPs community | Enrichissement auto | Idem |
| #388 | Rain Sensor TS0207 → mauvais driver | **FIXED** ✅ | TS0207 retiré de water_leak + flood |
| #383 | Bed Sensor issues v8.1.141 | Vérifier | Bed sensor = TS0601, mapping DP |
| #380 | Config page charge indéfiniment | Vérifier | Probablement app.json trop gros |

### Issues Fermées Résolues (cette session)
| Issue | Resolution |
|-------|-----------|
| #412/#410 | _TZ3000_yj6k7vfo button fix ✅ (ButtonDevice pattern) |
| #334 | Button press not detected ✅ (timer fallback) |
| #333 | Smart Button non fonctionnel ✅ (registerCapabilityListener) |

---

## 🏗️ Architecture Master — Modules par Couverture

| Module | Fichiers | Lignes | Santé |
|--------|:--------:|:------:|:-----:|
| devices/ | 15 | ~12000 | ✅ Bon |
| mixins/ | 8 | ~4000 | ✅ Enrichi (LegacyButton, UnifiedButtonEngine) |
| tuya/ | 57 | ~15000 | ✅ Bon (TuyaEF00Manager, DPParser) |
| battery/ | 14 | ~6000 | ✅ Bon (UnifiedBatteryHandler 1446 lignes) |
| clusters/ | 28 | ~3000 | ✅ Bon |
| flow/ | 8 | ~2000 | ✅ Bon |
| filter/ | 3 | ~500 | ✅ Enrichi (EventDeduplicationLayer, SanityFilter) |
| mesh/ | 1 | 150 | ✅ Nouveau (DriverConsequenceTiering) |
| compat/ | 1 | 200 | ✅ Nouveau (StableV5Compat) |

---

## 🔧 Enrichissements Appliqués (Session Complète)

### Boutons (10 enrichissements)
1. `_registerButtonCapabilityListeners` restauré (v5.11.205)
2. `setable:false` + `maintenanceAction:true` (89 drivers + app.json)
3. Timer fallback `(this.homey?.set* || set*)` (7 sites)
4. `_isDebounced(gang)` arg manquant corrigé
5. TSN fenêtre 5s + nettoyage Map
6. 9 patterns OnOff (commandOn/Off/Toggle + setOn/setOff + command)
7. 0xFD 6 variantes (0xFD/tuyaAction/253/fd/commandTuyaAction/unknown)
8. setupButtonDetection + handleButtonCommand (LegacyButtonDetectionMixin)
9. `_updateBattery` + `onEndDeviceAnnounce` (backport v5.11.205)
10. EventDeduplicationLayer (1 action = 1 event)

### Batterie (6 enrichissements)
1. package.json path corrigé (reporting reconfiguré)
2. SanityFilter `_getROCLimit` + edge same-ms
3. Courbes CR2032 non-linéaires (XiaomiSpecialHandler + DataRecoveryManager)
4. Timer lecture batterie fallback
5. `_restoreStoredBattery` (déjà dans UnifiedBatteryHandler)
6. EMA smoothing + BatteryHealthIntelligence (v8+)

### Matching/Case (3 enrichissements)
1. NFKD Unicode normalize (R24/R29)
2. HOBEIAN ZG-301Z isolation productId
3. BOT_FORCED_DISCOVERY HOBEIAN retiré

### Architecture (5 enrichissements)
1. Validateur structurel Polos (validate-driver-mesh.js)
2. Consequence tiering (DriverConsequenceTiering.js)
3. UnifiedButtonEngine compact (314 lignes L1-L5)
4. StableV5Compat registre (11 modules)
5. 87 fingerprints orphelins restaurés

---

## 📋 Gaps Restants à Couvrir

| Gap | Priorité | Action |
|-----|----------|--------|
| #420 Wenzhi MTG235 DP mapping | 🟡 Moyenne | Nécessite interview device |
| #383 Bed Sensor TS0601 | 🟡 Moyenne | Vérifier mapping DP |
| #380 Config page loading | 🟡 Moyenne | app.json trop gros, optimiser |
| 59 fingerprints orphelins | 🟢 Faible | Recherche web additionnelle |
| WiFi drivers coverage | 🟢 Faible | Vérifier fonctionnalité |
| EMA smoothing sur stable-v5 | 🟢 Faible | Backport optionnel (pas critique) |

---

## 🎯 Vision : Master = Meilleure Version de Toutes les Éres

Master combine maintenant le **meilleur de chaque ère** :
- **v5.11.205** : ButtonDevice pattern, setupButtonDetection, _updateBattery, onEndDeviceAnnounce
- **v8.5** : UnifiedBatteryHandler enrichi (1148→1446 lignes), EMA smoothing, BatteryHealthIntelligence
- **v9.0** : PhysicalButtonMixin TSN/debounce/9patterns/0xFD, LegacyButtonDetectionMixin
- **v9.0.52** : Timer fallback, NFKD normalize, setable:false, consequence tiering, validateur Polos

**Stable-v5** = version simple et statique, alignée avec v5.11.205 (référence dorée) + enrichissements critiques v9 (timer fallback, NFKD, setable:false, ButtonDevice pattern).
