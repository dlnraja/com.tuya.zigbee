# RAPPORT DE CONSOLIDATION ET RÉPARATION - Universal Tuya Zigbee
**Version 2.0** | **Date: 2026-05-08** | **Source: multi-canal fusionné + dump JS en temps réel**

---

## 1. RÉSUMÉ EXÉCUTIF

| Métrique | Valeur |
|----------|--------|
| Drivers actifs | 217 |
| Fingerprints totaux | 3560 → 5091 (Z2M enrichi) |
| Collisions détectées | 54,373 ⚠️ |
| Anti-Generic Score | 71% (objectif: 90%+) |
| Safe drivers | 154 / 217 |
| Critical drivers | 63 / 217 |

### Scripts JS exécutés avec succès (2026-05-08 14:00-15:00)
- ✅ `community-sync/extract-z2m.js` - 1531 new fingerprints
- ✅ `community-sync/parse-issues.js` - GitHub issues scan
- ✅ `automation/fix-fingerprint-conflicts.js` - 23 conflicts → 15 (résolus: 8)
- ✅ `maintenance/auto-resolve-collisions.js` - 5 hybrid drivers créés
- ✅ `automation/lint-collisions.js` - 0 collisions critiques
- ✅ `maintenance/inject-alarm-battery.js` - 0 fixes (217 skipped)
- ✅ `validation/audit-anti-generic.js` - Audit complet

### Corrections appliquées (auto-resolve-collisions.js)
1. **sensor_contact_motion_hybrid** - FP: zbeacon/TS0601
2. **device_floor_heating_hybrid** - FP: _tze200_rufdtfyv/TS0601
3. **device_radiator_valve_hybrid** - FPs: _tze200_p3dbf6qs, _tze200_rxq4iti9
4. **dimmer_dual_channel_hybrid** - FPs: 6x (_tze200_0hb4rdnp, _tze200_4mh6tyyo, _tze200_gne0e6mk)
5. **sensor_presence_radar_hybrid** - FPs: 5x (hobeian variants)

---

## 2. PROBLÈMES CRITIQUES IDENTIFIÉS

### 2.1 ERREUR "could not get device by ID"

**Source:** Forum EchoNL + diagnostics/summary.json

**Fingerprints affectés:**
- `_TZ3000_famkxci2` (TS0043 - Loratap 3-gang) - button_wireless_3
- `_TZ3000_ee8nrt2l` (TS0044 - Loratap 4-gang) - button_wireless_4
- `_TZ3000_tzvbimpq` (TS0002 - Wall remote) - diag d502faa5

**Cause:** Callback asynchrone après device deletion

**Solution:** Ajouter cleanup dans `onUninit()`:
```javascript
onUninit() {
  clearTimeout(this._deviceTimeout);
  clearTimeout(this._appCommandTimeout);
  this.removeAllListeners();
}
```

### 2.2 COLLISIONS FINGERPRINT (54,373 détectées)

**Catégories principales:**
- Scene switches: 6,000+ collisions
- Water valves: 4,500+ collisions  
- Siren: 3,200+ collisions
- Contact sensors: 2,800+ collisions

**Collision pattern (audit-anti-generic.js):**
```
⚠️ COLLISION: _tz3000_yz38gdra|ts0601 → water_valve_smart, water_valve_smart
```
→ Même fingerprintlisted twice dans SAME driver = false positive
→ À investiguer: pourquoi le même driver apparait 2x?

**Action requise:** 
1. Exécuter `fix-duplicate-fingerprints.js` 
2. Supprimer les entrées dupliquées dans driver.compose.json

### 2.3 SDK3 getDeviceConditionCard CRASH (HISTORIQUE - FIXÉ)

**Source:** diagnostics/summary.json (2026-04-05)
```json
{"err": "Initializing Driver air_quality_comprehensive: TypeError: this.homey.flow.getDev..."}
{"err": "Initializing Driver din_rail_meter: TypeError: this.homey.flow.getDeviceConditio"}
```

**Statut:** ✅ FIXÉ dans v5.11.211
**Vérification 2026-05-08:** 
- `drivers/air_quality_comprehensive/driver.js` ✅ Pas de getDeviceConditionCard
- `drivers/din_rail_meter/device.js` ✅ Pas de getDeviceConditionCard

### 2.4 Contact Sensor "Unknown Zigbee"

**Source:** Forum Lasse_K + Peter_van_Werkhoven (diag 0c838576)

**Symptôme:** Device installé comme "Unknown Zigbee" mais fonctionnel

**Causes:**
1. IAS Zone enrollment incomplet
2. Generic Zigbee support interceptant
3. Mauvais fingerprint match

**Solutions:**
- IAS enrollment automatique ajouté dans v5.11.154
- Supprimer et ré-appairer si nécessaire
- Vérifier `_TZ3000_n2egfsli` dans contact_sensor fingerprints

---

## 3. NOUVEAUX FINGERPRINTS Z2M DÉTECTÉS

### 3.1 Fingerprints avec productId confirmé (1531 total)

**Switches Touch Panel (_TZE204_xxx):**
- `_TZE204_gm8h14wy` → TS0601_1gang_switch → switch_1gang
- `_TZE204_trwaxi57` → TS0601_cover_switch_2 → curtain_motor
- `_TZE204_ccgyhbvd` → TS0601_3gang_switch → switch_1gang
- `_TZE204_y8ficeai` → TS0601_6gang_switch → switch_1gang

**Smart Plugs:**
- `_TZ3000_2uollq9d` → TS011F → plug
- `_TZ3000_cehuw1lw` → TS011F → plug

**Presence Sensors (24GHz):**
- `_TZE200_hl0ss9oa` → TS0225 → ZG-205ZL (non encore assigné)

### 3.2 Fingerprints sans productId (à research)

Ces fingerprints Z2M n'ont pas de productId - vérifier manuellement:
- `_TZ3000_n2egfsli` - Door sensor (Z2M)
- `_TZE200_8ygsuhe1` - Air quality (Z2M)
- `_TZE284_6ocnqlhn` - Din rail meter (Tongou)

---

## 4. FINGERPRINTS MANQUANTS CRITIQUES

### 4.1 BSEED Devices (ZCL-only)

**À ajouter:**
- `_TZ3000_ysdv91bk` - BSEED fingerprint manquant
- `_TZ3000_hafsqare` - BSEED fingerprint manquant
- `_TZ3000_e98krvvk` - BSEED fingerprint manquant

### 4.2 LORATAP Remotes (signalés par EchoNL)

**À vérifier:**
- `_TZ3000_famkxci2` → button_wireless_3 (TS0043)
- `_TZ3000_ee8nrt2l` → button_wireless_4 (TS0044)

---

## 5. ACTIONS PRIORITAIRES

### Urgent (P0)
1. [ ] Fixer 54,373 collisions dans driver.compose.json (entries dupliquées)
2. [ ] Investiguer "could not get device by ID" - diag d502faa5
3. [ ] Ajouter `_TZ3000_n2egfsli` → contact_sensor (TS0203 door sensor)

### Important (P1)
4. [ ] Améliorer Anti-Generic Score 71% → 90%+
5. [ ] Resoudre collisions air_purifier/climate_sensor
6. [ ] Ajouter nouveaux Z2M fingerprints (1531 à valider)

### Normal (P2)
7. [ ] Vérifier BSEED fingerprints ZCL-only manquants
8. [ ] Merger PRs GitHub en attente
9. [ ] Mettre à jour CHANGELOG avec corrections

---

## 6. VERSIONS ET COMPATIBILITÉ

| Version | Date | Statut | Notes |
|---------|------|--------|-------|
| v5.11.212 | 2026-05-08 | ✅ Actuelle | Current work |
| v5.11.211 | 2026-05-03 | ✅ Stable | SDK3 crash fixes |
| v5.11.154 | 2026-04-02 | ✅ Test | IAS enrollment |
| v5.11.150 | 2026-03-30 | ⚠️ Deprecated | Driver count jump |

---

## 7. DIAGNOSTICS CODES EN ATTENTE

| Code | User | Problème | Status |
|------|------|----------|--------|
| d502faa5 | FrankP | _TZ3000_tzvbimpq 2-gang wall remote | ❌ Pending |
| 0c838576 | Peter_vW | Contact sensor "56 Years ago" | ❌ Pending |
| 34b9565c | Freddyboy | Moes 4-button physical | ❌ Pending |
| 4b2150c6 | Cam | TS0041 buttons no flow | ❌ Pending |

---

## 8. SCRIPTS À EXÉCUTER

```bash
# Fix collisions (re-scan après auto-resolve)
node scripts/automation/lint-collisions.js

# Audit anti-generic après corrections
node scripts/validation/audit-anti-generic.js

# Ajouter fingerprints Z2M validés
node scripts/automation/auto-add-fingerprints.js

# Validation finale
node scripts/_final_validate.js
```

---

## 9. RESSOURCES

- **Forum:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
- **GitHub:** https://github.com/dlnraja/com.tuya.zigbee
- **Z2M Data:** data/community-sync/new-fingerprints.json (1531 entries)

---

*Rapport généré le 2026-05-08 14:15 UTC+2 par dump JS multi-canal*
*Scripts exécutés: community-sync, automation, maintenance, validation*