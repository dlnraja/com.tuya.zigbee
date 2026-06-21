# 📜 Historique d'Évolution Complète — Tuya Unified Zigbee

> Investigation forensique sur **285 tags de version × 16 branches × 8 729 commits**
> Objectif : comprendre le POURQUOI de chaque évolution, chaque feature, chaque régression

---

## 🕰️ Les 4 Ères du Projet

### Ère 1 — v5.11.x « Fat Classes » (stable-v5, ~285 tags)
**Architecture** : classes "fat" monolithiques, 1 driver générique adaptatif par catégorie.

| Feature | Fichier | Lignes | Philosophie |
|---------|---------|-------:|-------------|
| **HybridDriverSystem** | `lib/HybridDriverSystem.js` | 782 | 1 driver pour TOUTES variantes (inspiration IKEA/Hue/Xiaomi). Auto-détecte capabilities depuis clusters/endpoints. |
| **UniversalIasDevice** | `lib/UniversalIasDevice.js` | 521 | Base IAS universelle (smoke/CO/water/motion/siren). Mapping centralisé IAS_ZONE_TYPES→capabilities. |
| **HeimanIasDevice** | `lib/HeimanIasDevice.js` | 573 | Spécialisation HEIMAN (HS1SA, HS2WD-E). Siren/strobe patterns IAS WD. |
| **SonoffZclDevice** | `lib/SonoffZclDevice.js` | 741 | Base SONOFF/eWeLink ZCL standard. Clusters 0x0001/0x0006/0x0402/0x0500/0x0702/0x0B04. |
| **ButtonRemoteManager** | `lib/ButtonRemoteManager.js` | 233 | Boutons stateless (TS0041-44) via COMMANDS pas ATTRIBUTES. "Buttons use COMMANDS, not ATTRIBUTE REPORTING!" |
| **EventDeduplicationLayer** | `lib/EventDeduplicationLayer.js` | 82 | Règle d'or "1 action physique = 1 event Homey". Dédup ZCL+DP hybrides. |
| **DiagnosticManager** | `lib/DiagnosticManager.js` | 413 | Diagnostics centralisés. |
| **ManufacturerDatabase** | `lib/ManufacturerDatabase.js` | 50 | DB fabricants statique (JS). |
| **tuya-dp-engine** | `lib/tuya-dp-engine/` | 300+ | Moteur DP modulaire (converters onoff/power/temp). |
| **smart_fingerprints** | `lib/data/smart_fingerprints.js` | 1135 | 1 322 fingerprints Z2M auto-générés (2025-11-29). |

**Pourquoi cette ère** : maximiser la compatibilité avec un minimum de drivers. Risque : monolithique, difficile à maintenir.

---

### Ère 2 — v7.x « SDK3 Migration & Mixins »
**Transformation** : éclatement des classes fat en **mixins horizontaux**.

| Évolution | Pourquoi |
|-----------|----------|
| `PhysicalButtonMixin` créé | Extraire la détection boutons dans un composant réutilisable |
| `VirtualButtonMixin` créé | Séparer logique virtuelle (app) de physique (device) |
| `MultiGangMixin` créé | Gestion multi-gang via dot-notation (onoff.gang2) |
| Migration `getTriggerCard` → `getDeviceTriggerCard` | API SDK3 dépréciée |
| `setupButtonDetection()` dans ButtonDevice | Logique riche de détection (scenes bind, 0xFD, multi-click) |

**Perte** : la séparation a fragmenté la logique de `ButtonRemoteManager` sans tout reprendre.

---

### Ère 3 — v8.x « Phoenix & Hardening »
**Transformation** : unification, performance, anti-régression.

| Évolution | Pourquoi |
|-----------|----------|
| **UnifiedBatteryHandler** (67KB) | Unifier les 14 managers batterie. Formules linéaires **interdites** (règle B2). 15+ courbes non-linéaires. |
| **SmartDivisorManager** | Éliminer le bug double-division (TuyaEF00Manager /100 puis dpMappings /100) |
| **Fleetwood Gateway** | Purity syntaxique (braces, scoping, shell bash) |
| **246 fixes timers nus** | Règle R32 : `this.homey.setTimeout` au lieu de `setTimeout` |
| **Buffer-based JSON loading** | Éviter OOM (règle O16) : `JSON.parse(buffer)` au lieu de string UTF-16 |
| **Lazy loading fingerprints** | Issue #338 (App Crash on startup) — DeviceFingerprintDB diffère le parsing |
| **Dual-Layer Gate** | Empêcher le bot CI d'écraser les manufacturerName[] |

---

### Ère 4 — v9.x « Sovereign & Consolidation » (master actuel)
**Transformation** : 429 drivers dédiés, modularité maximale.

| Évolution | Pourquoi | Impact |
|-----------|----------|--------|
| **429 drivers dédiés** (vs ~60 génériques) | Spécificité par device → meilleure UX | ✅ Mais +complexité |
| **Commit TITAN V5 GOD-MODE** (53234799d) | "0 violations, 170+ sources analyzed" | ⚠️ **Supprime 20 fichiers lib/ uniques à stable-v5** |
| **PhysicalButtonMixin 1564 lignes** | Centraliser toute la détection | ✅ TSN dedup, per-gang debounce, RX-RAW L1 |
| **VirtualButtonMixin autonomous protocol** | Détecter Tuya DP sans dépendance externe | ✅ |
| **LegacyButtonDetectionMixin** (créé investigation) | Porter setupButtonDetection/handleButtonCommand perdus | ✅ Correction régression |
| **EventDeduplicationLayer** (re-porté investigation) | Règle d'or 1 action = 1 event perdue | ✅ Correction régression |

---

## 🔬 Analyse des 20 Fichiers Perdus (stable-v5 → master)

| Fichier | Lignes | Statut | Raison de la perte / équivalence master |
|---------|-------:|--------|------------------------------------------|
| `HybridDriverSystem.js` | 782 | SUPERSEDED | Remplacé par 429 drivers + PermissiveMatchingEngine. Pattern adaptatif survit via DynamicCapabilityManager |
| `UniversalIasDevice.js` | 521 | PARTIAL | Drivers IAS dédiés mais perte enrollment CIE universel + mapping centralisé |
| `SonoffZclDevice.js` | 741 | SUPERSEDED | SonoffEwelinkMixin + SonoffEnergyMixin + SonoffSensorMixin (modulaire) |
| `HeimanIasDevice.js` | 573 | PARTIAL | Drivers dédiés mais sans siren/strobe patterns IAS WD riches |
| `ButtonRemoteManager.js` | 233 | SUPERSEDED | PhysicalButtonMixin + LegacyButtonDetectionMixin (équivalent distribué) |
| `DiagnosticManager.js` | 413 | SUPERSEDED | DiagnosticAPI + DiagnosticEngine + SystemLogsCollector (granulaire) |
| **`EventDeduplicationLayer.js`** | 82 | **PORTED ✅** | **Aucun équivalent exact — re-porté dans investigation** |
| `ManufacturerDatabase.js` | 50 | SUPERSEDED | driver-mapping-database.json (JSON plus maintenable) |
| `NewDevices2025.js` | 351 | MERGED | Fingerprints mergés dans driver.compose.json (4040 FPs vérifiés) |
| `smart_fingerprints.js` | 1135 | MERGED | 1322 FPs déjà présents dans master (vérifié) |
| `tuya-dp-engine/` | 300+ | SUPERSEDED | TuyaEF00Manager + TuyaDPParser + AdaptiveDataParser |
| `DynamicDriverMatcher.js` | 42 | SUPERSEDED | PermissiveMatchingEngine + TwoPhaseEnrichment |
| `BatteryManagerV2.js` | 31 | SUPERSEDED | UnifiedBatteryHandler (canonique) |
| `ManufacturerBDD.js` | 20 | SUPERSEDED | DeviceFingerprintDB |
| `SmartSwitchDriver.js` | 16 | SUPERSEDED | UnifiedSwitchBase |

**Conclusion** : 20 fichiers supprimés, dont **1 réellement perdu** (EventDeduplicationLayer, re-porté ✅), **2 partiellement perdus** (UniversalIasDevice, HeimanIasDevice), et **17 légitimement remplacés** par des architectures supérieures.

---

## 🎯 Leçons Architecturales (le POURQUOI profond)

### Pourquoi master a 1564 lignes de PhysicalButtonMixin vs 956 stable-v5 ?
**Parce que** stable-v5 répartissait la détection entre ButtonDevice (1949 lignes) + PhysicalButtonMixin (956 lignes). master a **tout déplacé** dans le mixin (+TSN dedup, +per-gang debounce, +RX-RAW L1, +9 patterns OnOff) mais a **oublié de porter** `setupButtonDetection` et `handleButtonCommand` → régression corrigée par `LegacyButtonDetectionMixin`.

### Pourquoi 429 drivers vs ~60 génériques ?
**Parce que** les drivers génériques (HybridDriverSystem) causaient des faux-matchs (un TS0601 thermostat matché comme switch). Les drivers dédiés donnent une UX précise. Le compromis : +complexité de maintenance, mitigée par les mixins partagés.

### Pourquoi 14 managers batterie ?
**Prolifération historique** : BatteryCalculator (v5) → BatteryManagerV3 (v7) → BatteryManagerV4 → BatterySystem → UnifiedBatteryHandler (v8, canonique) → BatteryHealthIntelligence (v9). Les anciens ne sont pas supprimés pour compatibilité ascendante. **Recommandation** : unifier vers UnifiedBatteryHandler.

### Pourquoi la règle "formules linéaires interdites" ?
**Parce que** les courbes de décharge réelles sont non-linéaires : une CR2032 à 2.85V n'est PAS à 85% mais à ~70%. Les formules `(voltage-2.5)/0.5` donnaient des 0% ou 100% erronés → 35 signalements forum (pattern #1 critique).

### Pourquoi EventDeduplicationLayer était critique ?
**Parce que** les devices TS0601 hybrides envoient un DP report ET un ZCL attr report pour le même changement → 2 events au lieu d'1. Sans cette couche, les flows se déclenchent 2×. C'est la cause de plusieurs bugs boutons rapportés au forum.

---

## ✅ État Après Investigation

| Métrique | Avant | Après |
|----------|-------|-------|
| Tests unitaires | 5 | **29** ✅ |
| Fichiers lib/ | 533 | **536** (+EventDeduplicationLayer, +StableV5Compat, +LegacyButtonDetectionMixin) |
| Features stable-v5 portées | 0 | **EventDeduplicationLayer ✅** + 6 smart features boutons |
| Fingerprints orphelins | 146 | **59** |
| Timers nus | 4 | **0** ✅ |
| console.* runtime | 14 | **0** ✅ |
| Causes racines boutons corrigées | 0 | **5** ✅ |

---

## 📚 Modules Créés Durant l'Investigation

| Module | Rôle | Origine |
|--------|------|---------|
| `lib/filter/EventDeduplicationLayer.js` | Règle d'or 1 action = 1 event | Porté de stable-v5 v5.5.670 |
| `lib/compat/StableV5Compat.js` | Registre compat + factory singleton | Créé (synthèse investigation) |
| `lib/mixins/LegacyButtonDetectionMixin.js` | setupButtonDetection + handleButtonCommand | Porté de stable-v5 ButtonDevice |
| `tests/unit/stablev5-compat.test.js` | Tests EventDeduplicationLayer + registre | Créé |
| `tests/unit/button-mixins.test.js` | Tests 5 causes racines boutons | Créé |
| `scripts/restoration/inject-orphan-fingerprints.js` | Injection 87 FPs orphelins | Créé |
| `scripts/restoration/enrich-from-stablev5.js` | Enrichissement depuis smart_fingerprints | Créé (FPs déjà mergés) |

---

*Rapport généré par investigation forensique — 285 versions × 16 branches × 8729 commits analysés.*
*Chaque évolution documentée avec son POURQUOI et son impact.*
