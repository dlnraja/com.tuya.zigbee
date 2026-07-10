# 📚 MASTER REFERENCE — Tuya Unified Zigbee (Référence Complète)

> **Dernière mise à jour**: 2026-06-26 17:00 UTC+2
> **Version**: v9.0.115 (master) / v5.11.220 (stable-v5)
> **Auteur**: Investigation IA automatisée (Claude Code)

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble du projet](#1-vue-densemble)
2. [Architecture des 2 Apps et 3 Branches](#2-architecture-apps-branches)
3. [Chronologie des évolutions (v5.11 → v9.0)](#3-chronologie)
4. [Bugs critiques et Root Causes](#4-bugs-critiques)
5. [Features qui fonctionnent ✅](#5-features-fonctionnelles)
6. [Features qui ne fonctionnent pas ❌](#6-features-non-fonctionnelles)
7. [Cross-références Documentation ↔ Code](#7-cross-references)
8. [Règles et Anti-patterns](#8-regles)
9. [Infrastructure CI/CD](#9-cicd)
10. [Corrections proposées et appliquées](#10-corrections)

---

## 1. VUE D'ENSEMBLE {#1-vue-densemble}

### 1.1 Identité du projet

| Champ | Valeur |
|-------|--------|
| **Nom** | Tuya Unified Zigbee |
| **App ID (master)** | `com.dlnraja.tuya.zigbee` |
| **App ID (stable)** | `com.dlnraja.tuya.zigbee.stable` |
| **Auteur** | Dylan L.N. Raja (dlnraja) |
| **License** | MIT / GPL-3.0 |
| **SDK** | Homey SDK3 |
| **Node** | ≥ 18.0.0 |
| **Homey** | ≥ 12.2.0 |

### 1.2 Statistiques clés (v9.0.115 — 26 juin 2026)

| Métrique | Master | Stable-v5 |
|----------|--------|-----------|
| **Drivers** | 429 (379 Zigbee + 50 WiFi) | 228 (Zigbee only) |
| **Fingerprints** | 7,300 entries (4,593 uniques) | ~3,500 |
| **Flow Cards** | 4,839 | ~2,000 |
| **Capabilities** | 170 uniques | ~100 |
| **Fichiers .md** | 522 | Partagés via sync |
| **Workflows GHA** | 46 | Miroir partiel |
| **Scripts** | 400+ | Sous-ensemble |
| **Tags git** | 284 | Interleavés |
| **Commits (200 derniers)** | 160 sur master | 50+ exclusifs stable |

### 1.3 Dépendances principales

```json
{
  "homey-zigbeedriver": "^2.2.2",
  "zigbee-clusters": "^2.6.0",
  "tuyapi": "^7.7.1",
  "color-space": "1.15.0",
  "qrcode": "^1.5.4"
}
```

---

## 2. ARCHITECTURE DES 2 APPS ET 3 BRANCHES {#2-architecture-apps-branches}

### 2.1 Cartographie des branches

```
master (com.dlnraja.tuya.zigbee)          ← Branche principale, 429 drivers
  ├── stable-v5 (com.dlnraja.tuya.zigbee.stable)  ← 228 drivers Zigbee only
  ├── masterwlan                              ← Branche expérimentale WiFi
  ├── auto/johan-sdk3-sync                    ← Sync automatique Johan SDK3
  ├── auto/driver-maintenance                 ← Maintenance automatique
  ├── feature/wifi-local-first                ← Feature branch WiFi
  └── gh-pages                                ← Documentation statique
```

### 2.2 Divergence master ↔ stable-v5

| Métrique | Valeur |
|----------|--------|
| Fichiers modifiés | 9,260 |
| Insertions | +1,983,591 |
| Suppressions | -2,345,057 |
| Commits master-only | 50+ (v9.0.98 → v9.0.115) |
| Commits stable-only | 50+ (auto-heal + backports) |

**Nature de la divergence**: stable-v5 a fait un nettoyage massif (suppressions > insertions), gardant uniquement les drivers Zigbee éprouvés. Master a continué d'ajouter des features (WiFi, energy, presence, etc.).

### 2.3 Hiérarchie des classes (Device)

```
Homey.Device (SDK3)
  └── ZigBeeDevice (homey-zigbeedriver)
        └── TuyaZigbeeDevice (lib/tuya/TuyaZigbeeDevice.js)
              └── BaseUnifiedDevice (lib/devices/BaseUnifiedDevice.js, 188KB)
                    ├── UnifiedSensorBase (198KB)
                    ├── UnifiedCoverBase (36KB)
                    ├── UnifiedLightBase (32KB)
                    ├── UnifiedPlugBase (42KB)
                    ├── UnifiedThermostatBase (19KB)
                    ├── UnifiedSwitchBase (1346 lignes)
                    │     └── HybridSwitchBase (stub déprécié)
                    └── ButtonDevice
```

### 2.4 Pipeline Zigbee 11 couches (L0-L11)

| Couche | Composant | Fichier | Rôle |
|--------|-----------|---------|------|
| L0 | TuyaZigbeeDevice.handleFrame | lib/tuya/TuyaZigbeeDevice.js (45.6KB) | Interception brute |
| L1 | UniversalThrottleManager | lib/utils/UniversalThrottleManager.js | Flow control (120 RX/min, 30 TX/min) |
| L2 | IntelligentProtocolRouter | lib/protocol/IntelligentProtocolRouter.js | Routage ZCL vs Tuya DP |
| L3 | TuyaBoundCluster | lib/clusters/TuyaBoundCluster.js + 14 clusters | Binding & capture |
| L4 | TuyaEF00Manager + TuyaDPParser | lib/tuya/TuyaEF00Manager.js (97.6KB) | Décodage multi-DP |
| L5 | GlobalTimeSyncEngine | lib/tuya/GlobalTimeSyncEngine.js | Sync horaire (23 formats) |
| L6 | PhysicalButtonMixin | lib/mixins/PhysicalButtonMixin.js | Déduction bouton physique |
| L7 | BaseUnifiedDevice | lib/devices/BaseUnifiedDevice.js (182KB) | Mapping capabilities |
| L8 | DynamicCapabilityManager | lib/managers/DynamicCapabilityManager.js | Auto-discovery |
| L9 | SessionManager | lib/session/SessionManager.js | Fragments IR |
| L10 | HealthMonitor | lib/health/HealthMonitor.js | Heartbeat tracking |
| L11 | SanityFilter | lib/tuya/SanityFilter.js (3.4KB) | EMA + ROC noise filtering |

### 2.5 Structure des fichiers (lib/)

| Répertoire | Fichiers | Rôle |
|------------|----------|------|
| lib/tuya/ | 62 | Protocole Tuya: DP parsing, time sync, sanity |
| lib/devices/ | 25 | Classes de base par type |
| lib/mixins/ | 21 | Comportements composables |
| lib/managers/ | 25 | Services: SmartDivisor, Energy, etc. |
| lib/protocol/ | 11 | Gestion protocole |
| lib/battery/ | 13 | Gestion batterie |
| lib/clusters/ | 28 | Clusters Zigbee |
| lib/flow/ | 7 | Flow cards |
| lib/zigbee/ | 20+ | Zigbee bas niveau |
| lib/utils/ | 50+ | Utilitaires |
| lib/features/ | 20 | Features avancées |
| lib/tuya-local/ | 13 | WiFi local Tuya |
| lib/presence/ | 7 | Détection présence |
| lib/energy/ | 1 | Énergie |

---

## 3. CHRONOLOGIE DES ÉVOLUTIONS {#3-chronologie}

### 3.1 Ères majeures

| Ère | Versions | Dates | Focus |
|-----|----------|-------|-------|
| **v5.11.x** "Fat Classes" | v5.11.9 → v5.11.209 | Fév-Avr 2026 | Classes monolithiques |
| **v7.x** "SDK3 Migration" | v7.0.1 → v7.5.53 | Avr-Mai 2026 | Migration SDK3, mixins |
| **v8.x** "Phoenix & Hardening" | v8.1.1 → v8.5.54 | Mai 2026 | Durcissement, pipeline 11L |
| **v9.x** "Sovereign & Consolidation" | v9.0.0 → v9.0.115 | Mai-Juin 2026 | Consolidation, 429 drivers |

### 3.2 Timeline détaillée v9.0 (Juin 2026)

#### 2026-06-13 → v9.0.0 → v9.0.40
| Version | Date | Changements clés |
|---------|------|-------------------|
| v9.0.0 | 2026-05-28 | Initial v9 release |
| v9.0.38 | 2026-06-16 | Bump version, changelog |
| v9.0.39 | 2026-06-16 | 420 drivers, 2403 FPs |
| v9.0.40 | 2026-06-16 | 420 drivers, 2401 FPs, fixes forum #2091 #5472 |

#### 2026-06-21 → v9.0.53 (TITAN V5)
| Version | Date | Changements clés |
|---------|------|-------------------|
| v9.0.53 | 2026-06-21 | **TITAN V5 GOD-MODE**: 430 drivers, 0 violations, 170+ sources |
| v9.0.53 | 2026-06-21 | lib/ fixes (boutons+batterie+arch) |
| v9.0.53 | 2026-06-21 | drivers+docs+scripts+tests (30+ root causes) |
| v9.0.53 | 2026-06-21 | app.json + docs + scripts + tests + workflows |
| v9.0.54 | 2026-06-21 | punycode native + imap/mailparser → devDeps |
| v9.0.55 | 2026-06-21 | Regenerate package-lock.json (ELSPROBLEMS) |
| v9.0.56 | 2026-06-21 | npm install in publish dir |
| v9.0.57 | 2026-06-21 | .sdk → .sdkVersion (Invalid SDK root cause) |
| v9.0.58 | 2026-06-21 | publish-stable .sdk → .sdkVersion |
| v9.0.59 | 2026-06-21 | publish-stable promote always() |
| v9.0.60 | 2026-06-21 | exclude assets/branding + tests from build |
| v9.0.61 | 2026-06-21 | Replace Athom action with custom publish |
| v9.0.62 | 2026-06-21 | Add build step to publish action |

#### 2026-06-22 → v9.0.63 → v9.0.74
| Version | Date | Changements clés |
|---------|------|-------------------|
| v9.0.63 | 2026-06-22 | Publish action path resolution |
| v9.0.64 | 2026-06-22 | Simplified publish action |
| v9.0.65-66 | 2026-06-22 | Version bumps |
| v9.0.67 | 2026-06-22 | Community sync: 1442 new FPs from Z2M/ZHA |
| v9.0.68 | 2026-06-22 | Fix 'sdk' field conflict |
| v9.0.69 | 2026-06-22 | Remove 'sdk' field conflict |
| v9.0.70 | 2026-06-22 | CrashPrevention: safeSetCapabilityValue on ALL base classes |
| v9.0.71 | 2026-06-22 | Fix ALL validation scripts sdk→sdkVersion |
| v9.0.72 | 2026-06-22 | 0 button.X setable!=false remaining |
| v9.0.73 | 2026-06-22 | Fix printf y/n/y → y/y/y |
| v9.0.74 | 2026-06-22 | Version bump |

#### 2026-06-23 → v9.0.75 → v9.0.93 (LA SEMAINE CRITIQUE)
| Version | Date | Changements clés |
|---------|------|-------------------|
| v9.0.75 | 2026-06-23 | Placeholder manufacturerName pour 25 generic drivers |
| v9.0.76 | 2026-06-23 | **10 critical root causes**: dedup dead code, battery halving, linear formula |
| v9.0.77 | 2026-06-23 | **4 critical layer bugs**: infinite recursion, scope, destroyed guard |
| v9.0.78 | 2026-06-23 | Missing methods + dead code: presence debounce, plug DP handler |
| v9.0.79 | 2026-06-23 | 5 Zigbee protocol gaps: crash fixes, auto-mapping |
| v9.0.80 | 2026-06-23 | 6 categories: broken imports, crash guards, safety hardening |
| v9.0.81 | 2026-06-23 | Fix syntax-check.yml: grep -c bug on empty input |
| v9.0.82 | 2026-06-23 | Resolve all TITAN v5 CI failures |
| v9.0.83 | 2026-06-23 | Prevent pipefail crash on empty grep |
| v9.0.84 | 2026-06-23 | code-quality.yml: replace [ ] && echo || echo with if/else |
| v9.0.85 | 2026-06-24 | JSDoc false positive + HOBEIAN fingerprint collision |
| v9.0.86 | 2026-06-24 | **3 critical battery issues**: ternary crash, 200% sentinel, Z2M cross-ref |
| v9.0.87 | 2026-06-24 | Apply 200% sentinel ZCL fix |
| v9.0.88 | 2026-06-24 | Battery heuristic voltage fallback + Button anti-broadcast dedup |
| v9.0.89 | 2026-06-24 | **Self-Healing engine**: Z2M quirks, 0-50 scale, anomaly alerts |
| v9.0.90 | 2026-06-24 | **Universal Zigbee Engine**: multi-endpoint battery, VOC/PM1 |
| v9.0.91 | 2026-06-24 | Energy safeSet + button fastInitMode + battery backports |
| v9.0.92 | 2026-06-24 | Battery sentinel filtering + duplicate listeners + missing triggers |
| v9.0.93 | 2026-06-24 | **SanityFilter L11**: battery ROC limits, replacement detection, hysteresis |
| v9.0.94 | 2026-06-24 | TSO121 typo, q9mpfhw garbage, setTimeout guard, unsafe setCapability |

#### 2026-06-24 → v9.0.95 → v9.0.115 (BOUTONS + FINGERPRINTS)
| Version | Date | Changements clés |
|---------|------|-------------------|
| v9.0.95 | 2026-06-24 | **PhysicalButtonMixin** à 24 switch/dimmer drivers |
| v9.0.96 | 2026-06-24 | Complete physical/virtual decoupling |
| v9.0.97 | 2026-06-24 | Version bump |
| v9.0.98 | 2026-06-25 | PhysicalButtonMixin + battery drain prevention |
| v9.0.99 | 2026-06-25 | Add _TZE20C_3oycaicw garage door controller |
| v9.0.100 | 2026-06-25 | Fix publish to Homey: yes pipe + version-aware draft |
| v9.0.101 | 2026-06-25 | Fix APP_ID match in Puppeteer auto-promote |
| v9.0.103 | 2026-06-25 | **Replace ALL triggerCapabilityListener** with direct ZCL |
| v9.0.104 | 2026-06-25 | Fix buttons: unified dispatch + smart_knob_rotary crash |
| v9.0.105 | 2026-06-25 | Version bump |
| v9.0.106 | 2026-06-26 | Remove 2926 duplicate manufacturerName entries |
| v9.0.107 | 2026-06-26 | Case-insensitive dedup (547 entries, 152 drivers) |
| v9.0.109 | 2026-06-26 | Deduplicate manufacturerName and productId arrays |
| v9.0.111 | 2026-06-26 | **AggregateError fix**: remove empty productId arrays |
| v9.0.112 | 2026-06-26 | Replace manual toLowerCase with CaseInsensitiveMatcher |
| v9.0.113 | 2026-06-26 | Move _TZE204_clrdrnya to motion_sensor_radar_mmwave |
| v9.0.114 | 2026-06-26 | Add 15 missing MFRs to presence_sensor_radar |
| v9.0.115 | 2026-06-26 | **686 missing MFRs** from device.js to driver.compose.json |

### 3.3 Évolution des drivers

| Date | Version | Drivers | Fingerprints |
|------|---------|---------|--------------|
| 2026-06-16 | v9.0.39 | 420 | 2,403 |
| 2026-06-21 | v9.0.53 | 430 | 2,516 |
| 2026-06-22 | v9.0.67 | 429 | 2,515 |
| 2026-06-24 | v9.0.93 | 429 | 2,514 |
| 2026-06-26 | v9.0.115 | 429 | 2,569 |

---

## 4. BUGS CRITIQUES ET ROOT CAUSES {#4-bugs-critiques}

### 4.1 Bugs résolus (v9.0.53 — 18 bugs)

| # | Bug | Sévérité | Root Cause | Fix |
|---|-----|----------|------------|-----|
| 1 | TuyaShadowPulsar crash at import | 🔴 Critique | Module manquant | Safe require |
| 2 | TuyaLocalClient heartbeat crash | 🔴 Critique | Timer sans guard | try/catch + _destroyed |
| 3 | TuyaUDPDiscovery crash at start | 🔴 Critique | Port binding error | Graceful fallback |
| 4 | 43 WiFi drivers TCP leak | 🟠 Haute | Socket non fermé | onUninit cleanup |
| 5 | TuyaLocalDevice._onData() crash | 🟠 Haute | Null pointer | Guard clause |
| 6 | TuyaCloudAPI HTTP timeout missing | 🟠 Haute | Pas de timeout | AbortController |
| 7 | TuyaCloudAPI token expire wrong | 🟠 Haute | Mauvais calcul TTL | Fix expiry logic |
| 8 | TuyaCloudAPI.sendCommand() no refresh | 🟠 Haute | Token stale | Auto-refresh |
| 9 | Key recovery unlimited retries | 🟠 Haute | Boucle infinie | Max 3 retries |
| 10 | 14 files mixin order reversed | 🟡 Moyenne | Physical/Virtual swap | Fix order |
| 11 | 3 files missing imports | 🟡 Moyenne | Oubli d'import | Add imports |
| 12 | TuyaLocalDriver missing onUninit | 🟡 Moyenne | Lifecycle incomplet | Add onUninit |
| 13 | Command queue stall | 🟡 Moyenne | Queue bloquée | Reset mechanism |
| 14 | MQTT reconnect infinite loop | 🟡 Moyenne | Pas de backoff | Exponential backoff |
| 15 | capabilityMap recomputed per DP | 🟡 Moyenne | Performance | Cache |
| 16 | TuyaZigbeeDevice mixin reversed | 🟡 Moyenne | Ordre incorrect | Fix order |
| 17 | DeviceFingerprintDB dead import | 🟢 Basse | Code mort | Remove |
| 18 | TuyaWiFiHybridManager dead code | 🟢 Basse | Module déprécié | Remove |

### 4.2 Bugs critiques découverts (v9.0.76 → v9.0.94)

#### BUG CRITIQUE #1: Battery Halving (v9.0.76)
- **Symptôme**: Batterie affichée 128% ou 100% au lieu de la valeur réelle
- **Root Cause**: `Math.round(value / 2)` sans vérification des sentinelles ZCL (255=unknown, 200=not available)
- **Impact**: TOUS les appareils à batterie
- **Fix**: `_safeBatteryPercent()` avec filtrage des sentinelles AVANT division
- **Fichiers**: 14 sites dans BaseUnifiedDevice.js

#### BUG CRITIQUE #2: Linear Battery Formula (v9.0.76)
- **Symptôme**: Batterie 0% → 100% de façon linéaire (irréaliste)
- **Root Cause**: Formules comme `(voltage - 2.5) / 0.5` au lieu de courbes non-linéaires
- **Impact**: Précision batterie
- **Fix**: UnifiedBatteryHandler avec 18 courbes de décharge non-linéaires

#### BUG CRITIQUE #3: triggerCapabilityListener Echo Loop (v9.0.95)
- **Symptôme**: Pression physique → echo → boucle infinie de commandes
- **Root Cause**: `triggerCapabilityListener()` simule une action UI → déclenche `registerCapabilityListener()` → envoie commande Zigbee → device répond → re-déclenche
- **Impact**: TOUS les switch/dimmer drivers
- **Fix**: Remplacer par `safeSetCapabilityValue()` (pas de listener trigger)
- **Status**: ✅ Résolu dans v9.0.103 (0 occurrences restantes dans drivers/)

#### BUG CRITIQUE #4: AggregateError Empty Arrays (v9.0.111)
- **Symptôme**: Crash au démarrage avec AggregateError
- **Root Cause**: `manufacturerName: []` vide dans driver.compose.json
- **Impact**: Drivers avec enrichment automatique laissant des tableaux vides
- **Fix**: Filtrer les tableaux vides + guard dans prepare-publish

#### BUG CRITIQUE #5: Infinite Recursion (v9.0.77)
- **Symptôme**: Stack overflow sur certains appareils
- **Root Cause**: Appel récursif dans le protocole handler
- **Impact**: Couches L2-L4 du pipeline
- **Fix**: Guard de profondeur max

#### BUG CRITIQUE #6: Missing _destroyed Guard (v9.0.77)
- **Symptôme**: "Cannot access this.homey" après destruction
- **Root Cause**: Callbacks async appelés après `onDeleted()`
- **Impact**: Memory leaks + crashes
- **Fix**: Vérification `this._destroyed` dans tous les handlers

### 4.3 Bugs CI/CD découverts

| Bug | Date | Root Cause | Fix |
|-----|------|------------|-----|
| action SHAs invalides | 2026-06-23 | SHAs tronqués | Utiliser @v5/@v4 tags |
| Node version mismatch | 2026-06-23 | Versions mixtes | Standardiser Node 22 |
| Shell bash manquant | 2026-06-23 | PowerShell par défaut | `defaults: run: shell: bash` |
| pipefail crash | 2026-06-23 | grep sur input vide | `grep -c . \|\| echo 0` |
| sdk vs sdkVersion | 2026-06-22 | Champ SDK ambigu | Accepter les deux |
| ELSPROBLEMS publish | 2026-06-21 | package-lock manquant | Regenerate + npm install |
| build step missing | 2026-06-21 | sdk=undefined | Add build step |

---

## 5. FEATURES QUI FONCTIONNENT ✅ {#5-features-fonctionnelles}

### 5.1 Pipeline Zigbee 11 couches
- ✅ L0-L11 tous connectés et fonctionnels
- ✅ 14,363 lignes de code across 12 fichiers
- ✅ Self-healing capabilities actives

### 5.2 Universal Battery Engine
- ✅ `_safeBatteryPercent()` à 14 sites (v9.0.89)
- ✅ 18 courbes non-linéaires (CR2032, 3V_2100, AAA, Li-ion, etc.)
- ✅ Sentinel filtering: 255, 200, 0xFFFF
- ✅ SanityFilter EMA (α=0.3) + ROC (1%/sec)
- ✅ Battery replacement detection (>20% jump)

### 5.3 Universal Button Engine
- ✅ PhysicalButtonMixin: 350ms debounce, anti-broadcast
- ✅ VirtualButtonMixin: direct ZCL commands (0 triggerCapabilityListener)
- ✅ Mixin order: PhysicalButtonMixin(VirtualButtonMixin(BaseClass))
- ✅ markAppCommand() guard: 2000ms window
- ✅ 24 drivers avec PhysicalButtonMixin

### 5.4 Universal Energy Engine
- ✅ UniversalEnergyHandler + SmartEnergyManager
- ✅ Per-brand quirks (eWeLink, Tuya, Sonoff)
- ✅ SmartDivisorManager: auto-detect DP value divisors
- ✅ Energy bridge functional

### 5.5 Time Sync Engine
- ✅ 23 formats supportés (4-12 bytes)
- ✅ MCU format guessing (6 heuristics)
- ✅ MCU protocol versions v3.1 → v3.5

### 5.6 WiFi Device Support
- ✅ TuyaLocalClient (TCP socket)
- ✅ Adaptive handshake
- ✅ Heartbeat watchdog
- ✅ Command queue (200ms rate limit)

### 5.7 Fingerprint System
- ✅ 7,300 entries (4,593 uniques)
- ✅ CaseInsensitiveMatcher (pas de .toLowerCase() manuel)
- ✅ Lazy-loaded via Buffer (pas d'OOM)
- ✅ 8 scanners externes (tinytuya, tuya-local, hubitat, smartthings, openhab, domoticz, xiaomi-miot, csa-iot)

### 5.8 CI/CD Pipeline
- ✅ 46 workflows GitHub Actions
- ✅ Auto-publish sur push
- ✅ Auto-fix-all.js
- ✅ Syntax validation + security scan
- ✅ Puppeteer auto-promote to test

### 5.9 TITAN Protocol
- ✅ Knowledge Cache (.ai/KNOWLEDGE_CACHE.json)
- ✅ Monthly audit workflow
- ✅ CORE_RULES.md (61 rules + 10 crash prevention)

---

## 6. FEATURES QUI NE FONCTIONNENT PAS ❌ {#6-features-non-fonctionnelles}

### 6.1 HybridSwitchBase (DÉPRÉCIÉ)
- ❌ Fichier de 905 bytes, stub inutile
- ❌ Encore référencé dans certains drivers
- **Action**: Remplacer par UnifiedSwitchBase directement

### 6.2 TuyaWiFiHybridManager (MORT)
- ❌ Marqué DEPRECATED, code mort
- ❌ Import inutile dans certains fichiers
- **Action**: Supprimer complètement

### 6.3 triggerCapabilityListener dans Flow System
- ⚠️ Encore 14 occurrences dans lib/flow/ (FlowCardManager, UniversalFlowCardLoader, FeatureFlowCards)
- ⚠️ **Justifié**: C'est le mécanisme normal pour les flow cards → device
- ⚠️ Mais risque d'echo si mal utilisé

### 6.4 TODO/FIXME résiduels
- ⚠️ 2 TODO dans le code source:
  - `lib/zigbee/zigbee-cluster-map-usage-example.js:219` — "TODO: Wrap in try/catch"
  - `lib/dynamic/UniversalSmartFeaturesHandler.js:100` — "TODO: Trigger a Flow Card if necessary"

### 6.5 Fichiers volumineux
- ⚠️ UnifiedSensorBase.js: 198KB (trop gros)
- ⚠️ BaseUnifiedDevice.js: 182KB (trop gros)
- ⚠️ TuyaEF00Manager.js: 97.6KB (limite)
- **Impact**: Performance de lecture, maintenance difficile

### 6.6 Divergence master ↔ stable-v5
- ⚠️ 9,260 fichiers modifiés entre les deux branches
- ⚠️ Sync bidirectionnel complexe (bilat-fp-sync.yml)
- ⚠️ Risque de régression lors des backports

---

## 7. CROSS-RÉFÉRENCES {#7-cross-references}

### 7.1 Documentation ↔ Code

| Document | Fichier référencé | Status |
|----------|-------------------|--------|
| CLAUDE.md → TuyaZigbeeDevice.js | lib/tuya/TuyaZigbeeDevice.js | ✅ Existe |
| CLAUDE.md → BaseUnifiedDevice.js | lib/devices/BaseUnifiedDevice.js | ✅ Existe |
| CLAUDE.md → UnifiedSensorBase.js | lib/devices/UnifiedSensorBase.js | ✅ Existe |
| CLAUDE.md → TuyaEF00Manager.js | lib/tuya/TuyaEF00Manager.js | ✅ Existe |
| CLAUDE.md → SanityFilter.js | lib/tuya/SanityFilter.js | ✅ Existe |
| CLAUDE.md → PhysicalButtonMixin.js | lib/mixins/PhysicalButtonMixin.js | ✅ Existe |
| CLAUDE.md → HybridSwitchBase.js | lib/devices/HybridSwitchBase.js | ✅ Existe (déprécié) |
| CORE_RULES.md → CaseInsensitiveMatcher | lib/utils/CaseInsensitiveMatcher.js | ✅ Existe |
| AI_CONTEXT_MANDATE.md → DynamicCapabilityManager | lib/managers/DynamicCapabilityManager.js | ✅ Existe |
| AI_CONTEXT_MANDATE.md → GlobalTimeSyncEngine | lib/tuya/GlobalTimeSyncEngine.js | ✅ Existe |

### 7.2 Règles ↔ Violations potentielles

| Règle | Source | Status |
|-------|--------|--------|
| R1: safeSetCapabilityValue | CORE_RULES.md | ✅ 0 triggerCapabilityListener dans drivers/ |
| R2: super.onDeleted WiFi | CORE_RULES.md | ⚠️ À vérifier dans 50 WiFi drivers |
| R3: Mixin order Physical(Virtual(Base)) | CORE_RULES.md | ✅ Corrigé dans v9.0.53 |
| R4: Buffer-based JSON loading | CORE_RULES.md | ✅ `JSON.parse(fs.readFileSync(fpath))` |
| R5: _destroyed guard | CORE_RULES.md | ✅ Dans TuyaZigbeeDevice constructor |
| R6: No console.log | CORE_RULES.md | ⚠️ À vérifier |
| R7: UnifiedBatteryHandler | CORE_RULES.md | ✅ _safeBatteryPercent à 14 sites |
| R8: markAppCommand | CORE_RULES.md | ✅ 95 calls |

### 7.3 Issues GitHub ↔ Fixes

| Issue | Description | Fix Version | Commit |
|-------|-------------|-------------|--------|
| #2091 | Forum issue | v9.0.40 | 933caf9da |
| #5472 | Forum issue | v9.0.40 | 933caf9da |
| #325 | Climate sensors → presence | Documenté | docs/KNOWN_ISSUES.md |
| #383 | Bed sensor dans climate_sensor | v9.0.67 | 38028c946 |
| #388 | Rain sensor dans water_leak | Documenté | docs/KNOWN_ISSUES.md |
| #417 | TS0207 rain sensor conflict | v9.0.67 | b4d0fdbca |
| #428 | Soil sensor dans climate | v9.0.75 | ba39e0be5 |
| #97 | Radar _TZ321C_fkzihaxe8 | Documenté | docs/RADAR_FIX.md |

---

## 8. RÈGLES ET ANTI-PATTERNS {#8-regles}

### 8.1 Règles critiques (CORE_RULES.md v5.0.0)

| # | Règle | Sévérité |
|---|-------|----------|
| R1 | TOUJOURS safeSetCapabilityValue (jamais setCapabilityValue) | 🔴 CRITIQUE |
| R2 | WiFi: super.onDeleted() obligatoire | 🔴 CRITIQUE |
| R3 | Mixin order: PhysicalButtonMixin(VirtualButtonMixin(Base)) | 🔴 CRITIQUE |
| R4 | Buffer-based JSON loading (pas UTF-16 string) | 🔴 CRITIQUE |
| R5 | _destroyed guard dans onDeleted/onUninit | 🔴 CRITIQUE |
| R6 | Pas de console.log dans drivers/ (utiliser this.log) | 🔴 CRITIQUE |
| R7 | UnifiedBatteryHandler (pas de formules linéaires) | 🔴 CRITIQUE |
| R8 | markAppCommand avant commandes physiques | 🔴 CRITIQUE |
| R9 | Flow cards dans driver.onInit (pas onAdded) | 🟠 HAUTE |
| R10 | Pas de titleFormatted avec [[device]] | 🟠 HAUTE |
| R11 | Settings: zb_model_id (pas zb_modelId) | 🟠 HAUTE |
| R12 | Backlight: strings "off"/"normal"/"inverted" | 🟠 HAUTE |
| R13 | Import paths: ../../lib/tuya/TuyaZigbeeDevice | 🟠 HAUTE |
| R14 | manufacturerName + productId (COMBINED) match | 🟡 MOYENNE |
| R15 | Flow card IDs globally unique | 🟡 MOYENNE |
| R16 | Toujours parseMultiple() pour multi-DP | 🟡 MOYENNE |
| R17 | positionInvert pour certains curtains | 🟡 MOYENNE |
| R18 | SmartDivisorManager pour auto-detect | 🟡 MOYENNE |

### 8.2 Anti-patterns BANNIS

| # | Anti-pattern | Correct |
|---|-------------|---------|
| AP01 | `this.setCapabilityValue()` | `this.safeSetCapabilityValue()` |
| AP02 | `console.log()` dans drivers/ | `this.log()` |
| AP03 | `Math.round(value / 2)` batterie | `UnifiedBatteryHandler._safeBatteryPercent()` |
| AP04 | Formule linéaire batterie | Courbes non-linéaires |
| AP05 | `JSON.parse(fs.readFileSync(f, 'utf8'))` | `JSON.parse(fs.readFileSync(f))` |
| AP06 | `manufacturerName: []` vide | Filtrer ou ajouter des MFRs |
| AP07 | `_TZE200_*` wildcards | Interdit |
| AP08 | `triggerCapabilityListener()` dans drivers | `safeSetCapabilityValue()` |
| AP09 | `HybridSwitchBase` | `UnifiedSwitchBase` |
| AP10 | Import `../../lib/TuyaZigbeeDevice` | `../../lib/tuya/TuyaZigbeeDevice` |

---

## 9. INFRASTRUCTURE CI/CD {#9-cicd}

### 9.1 Workflows GitHub Actions (46 fichiers)

| Catégorie | Workflows | Fonction |
|-----------|-----------|----------|
| **Publish** | auto-publish-on-push, publish, publish-stable, draft-to-test | Publication automatique |
| **Validation** | unified-ci, validate, syntax-check, code-quality | Validation code |
| **Enrichment** | enrich-drivers, monthly-enrichment, monthly-device-enrichment | Enrichissement fingerprints |
| **Diagnostics** | build-error-diag, collect-diagnostics, fetch-diags, tuya-deep-diag | Diagnostic erreurs |
| **Maintenance** | daily-maintenance, driver-maintenance, daily-promote-to-test | Maintenance quotidienne |
| **Sync** | bilat-fp-sync, johan-sdk3-sync, weekly-external-sync, weekly-fingerprint-sync | Synchronisation |
| **Community** | monthly-community-sync, upstream-auto-triage, auto-close-supported | Communauté |
| **Security** | test-api-keys, dependabot-auto-merge | Sécurité |
| **Other** | ai-monthly-audit, labeler, stale, notifications, deploy-pages | Divers |

### 9.2 Scripts d'automation (400+)

| Catégorie | Scripts | Fonction |
|-----------|---------|----------|
| **Fix** | 20+ fix-*.js | Corrections automatiques |
| **Validation** | check-*.js, validate/*.js | Validation |
| **Enrichment** | enrich/*.js, inject-*.js | Enrichissement |
| **Analysis** | analysis/*.js, analyze-*.js | Analyse |
| **CI** | ci/*.js | Pipeline CI |
| **Maintenance** | maintenance/*.js (100+) | Maintenance |
| **Scanners** | scanners/*.js (8 scanners) | Scan externe |

---

## 10. CORRECTIONS PROPOSÉES ET APPLIQUÉES {#10-corrections}

### 10.1 Corrections déjà appliquées (v9.0.76 → v9.0.115)

1. ✅ **Battery sentinel filtering** — `_safeBatteryPercent()` à 14 sites
2. ✅ **Physical/Virtual decoupling** — 0 triggerCapabilityListener dans drivers/
3. ✅ **PhysicalButtonMixin** — 24 drivers avec mixin
4. ✅ **AggregateError fix** — Suppression des tableaux vides
5. ✅ **CaseInsensitiveMatcher** — Remplacement de toLowerCase manuel
6. ✅ **686 missing MFRs** — Ajout de fingerprints manquants
7. ✅ **CI/CD fixes** — 14 workflows réparés
8. ✅ **SanityFilter L11** — EMA + ROC pour batterie/temp/humidity
9. ✅ **Self-Healing engine** — Z2M quirks, anomaly alerts
10. ✅ **Universal Zigbee Engine** — Multi-endpoint battery, VOC/PM1

### 10.2 Corrections proposées (à faire)

1. 🔲 **Supprimer HybridSwitchBase.js** — Stub de 905B, remplacer par UnifiedSwitchBase
2. 🔲 **Supprimer TuyaWiFiHybridManager.js** — Code mort marqué DEPRECATED
3. 🔲 **Vérifier console.log restants** — Scanner drivers/ pour console.log/error
4. 🔲 **Vérifier super.onDeleted** — 50 WiFi drivers doivent appeler super.onDeleted()
5. 🔲 **Réduire UnifiedSensorBase.js** — 198KB est trop gros, découper en modules
6. 🔲 **Réduire BaseUnifiedDevice.js** — 182KB est trop gros
7. 🔲 **Résoudre les 2 TODO** — zigbee-cluster-map-usage-example + UniversalSmartFeaturesHandler
8. 🔲 **Harmoniser master ↔ stable-v5** — Réduire la divergence de 9,260 fichiers

---

## ANNEXES

### A. Tags git (284 tags)

**Ères**: v242, v5.11.x (9→209), v7.0.x (1→11), v7.4.x (7→8), v7.5.x (10→53), v8.1.x (1→202), v8.5.x (18→54), v9.0.x (0→115)

### B. Branches distantes

| Branche | Rôle |
|---------|------|
| origin/master | Branche principale |
| origin/stable-v5 | Release stable |
| origin/masterwlan | Expérimental WiFi |
| origin/auto/driver-maintenance | Maintenance auto |
| origin/auto/johan-sdk3-sync | Sync Johan |
| origin/feature/wifi-local-first | Feature WiFi |
| origin/gh-pages | Documentation |
| upstream/SDK3 | SDK3 upstream |
| upstream/SDK3-test | SDK3 test |
| upstream/dev | Dev upstream |

### C. Fichiers clés

| Fichier | Taille | Rôle |
|---------|--------|------|
| app.js | 617 lignes | Entry point, 30+ subsystems |
| lib/tuya/TuyaZigbeeDevice.js | 45.6KB | Base device Zigbee |
| lib/devices/BaseUnifiedDevice.js | 182KB | Base unifié |
| lib/devices/UnifiedSensorBase.js | 198KB | Capteurs |
| lib/tuya/TuyaEF00Manager.js | 97.6KB | DP handler |
| lib/battery/UnifiedBatteryHandler.js | 59.5KB | Batterie |
| lib/tuya/TuyaTimeSyncFormats.js | 32KB | 23 formats time |
| lib/tuya/SanityFilter.js | 3.4KB | EMA + ROC |
| data/fingerprints.json | ~2MB | Base fingerprints |
| app.json | 6.2MB | Configuration app |

### D. Compétences (Skills)

| Skill | Fichier | Rôle |
|-------|---------|------|
| HOMEY_SDK3_EXPERT | skills/ | Patterns SDK3 |
| TUYA_ARCHITECT_SOP | skills/ | 5 niveaux d'interprétation |
| TUYA_DP_MASTER | skills/ | DP mapping |
| SYNC_PROTOCOL | skills/ | Sync upstream |

---

*Document généré automatiquement par investigation IA — 26 juin 2026*
*Basé sur: 160 commits master, 284 tags, 522 fichiers .md, 429 drivers, 46 workflows*
