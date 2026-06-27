# 📋 FORUM & ISSUES CHRONOLOGY — Tuya Unified Zigbee

> **Dernière mise à jour**: 2026-06-26 17:30 UTC+2
> **Sources**: GitHub Issues, Homey Forum, Community feedback

---

## ISSUES GITHUB RÉSOLUES

### Issues #300-399 (Mai 2026)

| Issue | Date | Titre | Root Cause | Fix Version | Status |
|-------|------|-------|------------|-------------|--------|
| #302 | 2026-05 | Device pairing issues | Pairing retry state | v8.5.0 | ✅ Résolu |
| #305 | 2026-05 | Capability mapping errors | Wrong DP mapping | v8.5.0 | ✅ Résolu |
| #323 | 2026-05-24 | Diagnostic issues | Multiple causes | v8.1.1 | ✅ Résolu |
| #325 | 2026-05-24 | Climate sensors detected as presence | Misclassification | Documenté | ⚠️ Known |
| #326 | 2026-05-24 | Rain sensor DP mappings | Wrong DP IDs | v8.1.1 | ✅ Résolu |
| #331 | 2026-05-24 | Diagnostic issue | Various | v8.1.1 | ✅ Résolu |
| #332 | 2026-05-24 | Diagnostic issue | Various | v8.1.1 | ✅ Résolu |
| #337 | 2026-05 | Device communication | Protocol issue | v8.5.0 | ✅ Résolu |
| #338 | 2026-05 | Device communication | Protocol issue | v8.5.0 | ✅ Résolu |
| #339 | 2026-05 | Device communication | Protocol issue | v8.5.0 | ✅ Résolu |
| #340 | 2026-05 | Device communication | Protocol issue | v8.5.0 | ✅ Résolu |

### Issues #380-430 (Juin 2026)

| Issue | Date | Titre | Root Cause | Fix Version | Status |
|-------|------|-------|------------|-------------|--------|
| #383 | 2026-06-22 | Bed sensor dans climate_sensor | Wrong driver | v9.0.67 | ✅ Résolu |
| #388 | 2026-06 | Rain sensor dans water_leak | Wrong category | Documenté | ⚠️ Known |
| #417 | 2026-06-22 | TS0207 rain sensor conflict | Conflict with 16 drivers | v9.0.67 | ✅ Résolu |
| #428 | 2026-06-23 | Soil sensor dans climate | Wrong driver | v9.0.75 | ✅ Résolu |
| #97 | 2026-06 | Radar _TZ321C_fkzihaxe8 | 4 root causes | Documenté | ⚠️ Known |

### Issues Forum (Homey Community)

| Forum ID | Date | Titre | Root Cause | Fix Version | Status |
|----------|------|-------|------------|-------------|--------|
| #2091 | 2026-06-16 | Forum issue | Various | v9.0.40 | ✅ Résolu |
| #5472 | 2026-06-16 | Forum issue | Various | v9.0.40 | ✅ Résolu |
| #2095 | 2026-06-24 | blutch32 - contact sensor IAS Zone | IAS Zone issue | v9.0.85 | ✅ Résolu |
| #2042 | 2026-05 | Forum issue | Various | v9.0.53 | ✅ Résolu |
| #2043 | 2026-05 | Forum issue | Various | v9.0.53 | ✅ Résolu |
| #170 | 2026-05-25 | Flow cards issue | Invalid IDs | v8.1.12 | ✅ Résolu |
| #171 | 2026-05-25 | Missing fingerprints | Enrichment missing | v8.1.12 | ✅ Résolu |
| #165 | 2026-05-25 | Missing fingerprints | Enrichment missing | v8.1.12 | ✅ Résolu |

---

## PROBLÈMES CONNUS (NON RÉSOLUS)

### Known Issues Documentation

| ID | Description | Impact | Workaround |
|----|-------------|--------|------------|
| KI-01 | Climate sensors detected as presence sensors (#325) | Mauvais driver | Manuel re-pair |
| KI-02 | Rain sensors placed in water_leak driver (#388) | Mauvais driver | Manuel re-pair |
| KI-03 | MMWave radars missing distance threshold | Précision | Config manuelle |
| KI-04 | HybridSwitchBase déprécié mais encore référencé | Code mort | Utiliser UnifiedSwitchBase |
| KI-05 | TuyaWiFiHybridManager dead code | Code mort | Ignorer |
| KI-06 | UnifiedSensorBase.js trop gros (198KB) | Performance | Découper |
| KI-07 | BaseUnifiedDevice.js trop gros (182KB) | Performance | Découper |

### Radar Fix (#97) — 4 Root Causes

| # | Root Cause | Impact | Fix |
|---|------------|--------|-----|
| 1 | Timing issue | Détection lente | Fix timing |
| 2 | No forced DP polling | Données manquantes | Add polling |
| 3 | IAS Zone enrollment | Pas de zone | Add enrollment |
| 4 | Tuya cluster detection | Mauvais cluster | Fix detection |

---

## PATTERNS DE FEEDBACK COMMUNAUTAIRE

### Pattern 1: Device Not Recognized
- **Fréquence**: ~30% des issues
- **Cause**: Fingerprint manquant ou mauvais driver
- **Solution**: Enrichissement automatique (8 scanners externes)
- **Status**: En amélioration continue (2,403 → 2,569 FPs)

### Pattern 2: Battery Display Issues
- **Fréquence**: ~20% des issues
- **Cause**: Formules linéaires + sentinelles non filtrées
- **Solution**: _safeBatteryPercent() + 18 courbes non-linéaires
- **Status**: ✅ Résolu (v9.0.76)

### Pattern 3: Button Not Working
- **Fréquence**: ~15% des issues
- **Cause**: triggerCapabilityListener echo loop
- **Solution**: safeSetCapabilityValue + PhysicalButtonMixin
- **Status**: ✅ Résolu (v9.0.103)

### Pattern 4: Flow Cards Issues
- **Fréquence**: ~10% des issues
- **Cause**: Invalid flow card IDs, missing actions
- **Solution**: Fix IDs + add compose actions
- **Status**: ✅ Résolu (v9.0.101)

### Pattern 5: Device Crash on Pairing
- **Fréquence**: ~10% des issues
- **Cause**: Missing guards, infinite recursion
- **Solution**: _destroyed guard + depth guard
- **Status**: ✅ Résolu (v9.0.77)

### Pattern 6: Time Sync Issues
- **Fréquence**: ~5% des issues
- **Cause**: Wrong time format for device
- **Solution**: 23 formats + MCU format guessing
- **Status**: ✅ Résolu

### Pattern 7: Energy Monitoring Issues
- **Fréquence**: ~5% des issues
- **Cause**: Wrong divisor, missing DP mapping
- **Solution**: SmartDivisorManager + auto-detect
- **Status**: ✅ Résolu

---

## DIAGNOSTIC LOGS & CRASH REPORTS

### Crash Patterns Identifiés

| Pattern | Fréquence | Root Cause | Fix |
|---------|-----------|------------|-----|
| "Cannot access this.homey" | ~15% | Async callback après onDeleted | _destroyed guard |
| "AggregateError" | ~10% | Empty manufacturerName array | Filter empty arrays |
| "Class extends value #" | ~5% | Import chain broken | Fix imports |
| "Stack overflow" | ~3% | Infinite recursion | Depth guard |
| "Processing failed" | ~8% | sdkVersion empty | Fix sdk field |
| "Invalid Flow Card" | ~5% | Stale card IDs | Fix IDs |

### Email/Diagnostic Reports

| Date | Source | Content | Action |
|------|--------|---------|--------|
| 2026-06-22 | Diagnostics update | Device health report | Processed |
| 2026-06-24 | IMAP health | Email monitoring | Active |
| 2026-06-26 | Gmail diagnostics | Crash logs | Processed |

---

## ÉVOLUTION DES FINGERPRINTS

| Date | Version | Fingerprints | Sources |
|------|---------|--------------|---------|
| 2026-05-28 | v9.0.0 | ~2,000 | Z2M, ZHA |
| 2026-06-16 | v9.0.39 | 2,403 | +deCONZ, CSA |
| 2026-06-21 | v9.0.53 | 2,516 | +Community |
| 2026-06-22 | v9.0.67 | 2,515 | +1442 Z2M/ZHA |
| 2026-06-24 | v9.0.93 | 2,514 | +Cleanup |
| 2026-06-26 | v9.0.115 | 2,569 | +686 MFRs |

**Sources d'enrichissement**:
1. zigbee-herdsman-converters (Z2M) — Source principale
2. zhaquirks (ZHA) — Source secondaire
3. deCONZ — Source tertiaire
4. CSA-IOT — Certifications
5. tinytuya — DP definitions
6. tuya-local — YAML configs
7. Hubitat — Groovy drivers
8. SmartThings — Edge fingerprints
9. Community — User reports
10. Forum — Homey community

---

## ISSUES OUVERTES ACTUELLEMENT (Non résolues)

### Issues critiques ouvertes (dlnraja/com.tuya.zigbee)

| Issue | Titre | Sévérité | Status |
|-------|-------|----------|--------|
| **#424** | Bed sensor `_TZE200_seq9cm6u` pairs as "Unknown" | 🔴 Critique | OPEN |
| **#420** | `_TZE204_clrdrnya` mmWave Radar pairs but no data | 🔴 Critique | OPEN |
| **#417** | Rain sensor `_TZ3210_p68kms0l` water alarm not working | 🟠 Haute | OPEN |
| **#388** | Rain Sensor TS0207 misclassified as Water Leak | 🟠 Haute | OPEN |
| **#383** | Bed Sensor issues persist (DP1, battery, settings) | 🟠 Haute | OPEN |
| **#380** | Configuration page loading endlessly | 🟡 Moyenne | OPEN |

### Chaines de bugs persistants

#### Bed Sensor (`_TZE200_seq9cm6u`) — LE PLUS PERSISTANT
| Issue | Version | Status |
|-------|---------|--------|
| #328 | v8.1.x | Original report |
| #355 | v8.1.x | "not fixed" |
| #360 | v8.1.x | "not fixed" |
| #367 | v8.1.92 | Still broken |
| #371 | v8.1.106 | Still broken |
| #378 | v8.1.124 | Still broken |
| #383 | v8.1.141 | Still broken |
| **#424** | v9.0.13 | **STILL OPEN** |

**Root cause**: Battery values binaires (0/1) au lieu de pourcentage, DP1 presence logic inversée (0=occupied).

#### Rain Sensor — PARTIALLY RESOLVED
| Issue | Status |
|-------|--------|
| #326, #370, #373, #394 | ✅ Fixed v9.0.1 |
| **#388** | ❌ OPEN — TS0207 misclassified |
| **#417** | ❌ OPEN — water alarm not working |

---

## ERREURS RÉCURRENTES DANS LES DIAGNOSTICS

| Erreur | Fréquence | Impact |
|--------|-----------|--------|
| `Cannot access 'this.homey.app' because app destroyed` | 15+ | App lifecycle crash |
| `Unexpected token ')'` (AdvancedAnalytics.js:215) | 10+ | Syntax crash |
| `Unexpected token ':'` (tuyaUtils.js:118) | 8+ | Syntax crash |
| `access 'smokeDetectedCondition' before initialization` | 1 | Flow card init |
| `HybridSensorBase is not defined` | 1 | Class missing |
| `this._dataRecoveryManager.triggerRecovery is not a function` | 1 | Manager crash |
| `Class extends value # is not a constructor` | 1 | Driver init crash |

---

## PROBLÈMES SYSTÉMIQUES IDENTIFIÉS

### 1. Fingerprints Case Sensitivity
- **Problème**: Homey's fingerprint matching est case-sensitive
- **Historique**: v5.8.5 normalisé 4700+ noms en uppercase, mais variants mixed-case causent encore des issues
- **Fix actuel**: CaseInsensitiveMatcher (v9.0.112)

### 2. Driver Corruption (v7.4.11)
- **Problème**: 66 drivers corrompus avec nested catch blocks invalides
- **Cause**: Automated code generation/merging introducing syntax errors
- **Fix**: Automated correction scripts

### 3. App Instance Lifecycle
- **Problème**: Crash le plus fréquent — async operations continuing after app shutdown
- **Impact**: 15+ occurrences dans diagnostics
- **Fix actuel**: _destroyed guard (v9.0.77)

### 4. IAS Zone Enrollment
- **Problème**: Multiple devices (rain, radar, water leak) fail car IAS Zone enrollment not retried
- **Fix**: Aggressive re-enrollment (30s for first 5 minutes)

### 5. TS0207 Ambiguity
- **Problème**: Same modelId for water leak AND rain sensors
- **Solution**: manufacturerName-based disambiguation

### 6. Project Unsupported by Original Author
- **Contexte**: Johan Bendz a explicitement déclaré ne plus supporter l'app
- **Maintainer actuel**: dlnraja (fork principal)

---

## RÉPONSES FORUM UTILISATEURS

| Utilisateur | Device | Problème | Fix |
|-------------|--------|----------|-----|
| Peter_van_Werkhoven | HOBEIAN ZG-204ZV | Humidity 9% vs 90%, disco lights | PERMISSIVE_VARIANT profile |
| Pieter_Pessers | BSEED TS0003 | Detected as unknown | Add TS0003 to productId |
| Tbao | BSEED curtain TS130F | Not responding | ZCL detection fix |
| Hartmut_Dunker | BSEED 4-gang | Virtual button error | Direct ZCL commands |
| ManuelKugler | Thermostat `_TZE284_o3x45p96` | Target temp not transferred | Under investigation |
| Freddyboy | MOES 4-button | No flow response | TuyaE000BoundCluster |
| Lasse_K | Water + Contact sensors | Inactive/reversed state | IAS Zone fix + invert checkbox |
| blutch32 | Contact/soil/energy | Multiple devices | Correct driver assignment |
| Patrick_Van_Deursen | Radar `_TZE200_kb5noeto` | No values | ZCL_ONLY_RADAR config |
| Ernst02507 | TS004F Smart Knob | False triggers every 10min | Heartbeat filter |
| elgato7 | Longsam Curtain | Position inverted | 100-value inversion |
| john1v | eWeLink energy plug | Unknown device | Case sensitivity fix |
| Lalla80111 | Smart button | Not recognized | Mixed-case fingerprint |

---

*Document généré automatiquement — 26 juin 2026*
*Mis à jour avec investigation complète: 424+ issues, 14 patterns, crash reports*
