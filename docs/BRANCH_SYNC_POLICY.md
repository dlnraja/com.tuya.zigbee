# 🔄 Politique de Synchronisation Bidirectionnelle des Branches

> **Objectif** : synchroniser master ↔ stable-v5 tout en **respectant strictement le rôle de chaque branche**.

---

## 🎯 Rôles des Branches

| Branche | App ID | Version | Rôle | Philosophie |
|---------|--------|---------|------|-------------|
| **master** | `com.dlnraja.tuya.zigbee` | v9.0.40 | **Expérimental / Test** | Innovations, nouveaux drivers, mixins, refactoring. Risque accepté. |
| **stable-v5** | `com.dlnraja.tuya.zigbee.stable` | v5.11.217 | **Production Stable** | Robustesse, fiabilité. Changes minimaux et éprouvés uniquement. |
| **masterwlan** | `com.dlnraja.tuya.zigbee` | v10.x | **WiFi/Local expérimental** | Focus devices WiFi, TCP local, eWeLink. Fork de master. |

> ⚠️ **master et stable-v5 sont DEUX APPS DISTINCTES** (IDs différents). La sync n'est donc PAS un merge brut — c'est un **backport sélectif**.

---

## 🔀 Règles de Synchronisation

### master → stable-v5 (BACKPORT)
**Autorisé** (critères stricts) :
- ✅ Fix de **bug runtime critique** (crash, memory leak, données erronées)
- ✅ Fix de **sécurité** (injection, fuite token)
- ✅ Correction de **règle violée** (B2 batterie linéaire, A9 console, R32 timer)
- ✅ Guard défensif (try/catch sur entrée externe)

**Interdit** :
- ❌ Nouveau driver / nouvelle feature (stable-v5 est figée en capabilities)
- ❌ Refactoring architectural (mixins, classes)
- ❌ Changement de format de données (driver.compose.json structure)
- ❌ Mise à jour de dépendances majeures

### stable-v5 → master (FORWARD-PORT)
**Autorisé** :
- ✅ Feature/fallback perdu lors de la consolidation (ex: EventDeduplicationLayer)
- ✅ Logique de détection robuste (setupButtonDetection, handleButtonCommand)
- ✅ Base de données de fingerprints (déjà mergée : 4040 FPs)
- ✅ Pattern défensif éprouvé en production

**Interdit** :
- ❌ Réintroduire des classes "fat" monolithiques (HybridDriverSystem)
- ❌ Revenir aux anciennes API dépréciées

### masterwlan → master
- ✅ Logique WiFi/TCP local (si applicable et testée)
- ✅ Améliorations spécifiques eWeLink/Sonoff

---

## 📋 Backports Réalisés (historique)

### master → stable-v5 (commit `7ac69ae48`, 2026-06-20)
| Fichier | Bug | Règle |
|---------|-----|-------|
| `lib/tuya/DataRecoveryManager.js` | Formule batterie linéaire `(voltage-2.4)/0.6` | B2 |
| `lib/xiaomi/XiaomiSpecialHandler.js` | Formule CR2032 linéaire `(voltage-2500)/500` | B2 |
| `lib/tuya-local/TuyaDeviceDiscovery.js` | JSON.parse non gardé (crash UDP) | — |
| `lib/tuya-local/TuyaUDPDiscovery.js` | JSON.parse non gardé (crash UDP) | — |

### stable-v5 → master (investigation 2026-06-20)
| Fichier | Feature portée | Origine stable-v5 |
|---------|---------------|-------------------|
| `lib/filter/EventDeduplicationLayer.js` | Règle d'or "1 action = 1 event" | `lib/EventDeduplicationLayer.js` v5.5.670 |
| `lib/mixins/LegacyButtonDetectionMixin.js` | setupButtonDetection + handleButtonCommand | `lib/devices/ButtonDevice.js` v5.11.x |
| `lib/compat/StableV5Compat.js` | Registre 11 modules + factory | Synthèse investigation |

---

## ✅ Checklist de Backport (master → stable-v5)

Avant de backporter un fix vers stable-v5, vérifier :

- [ ] Le bug existe **à l'identique** dans stable-v5 (vérifier via `git show stable-v5:<file>`)
- [ ] Le fix est **minimal** (pas de refactoring collateral)
- [ ] Le fix ne change **pas l'API publique** ni le format de données
- [ ] Le fix respecte **Node.js 12 compatibility** (stable-v5 utilise Node 12, pas d'optional chaining `?.` dans les shared libs)
- [ ] Le commit mentionne `BACKPORT from master vX.Y.Z` pour traçabilité
- [ ] Les tests passent sur stable-v5 (`npm test`)

---

## ⚠️ Pièges à Éviter

1. **Ne JAMAIS faire `git merge master` sur stable-v5** → écraserait l'architecture v5
2. **Ne JAMAIS backporter un mixin v9** → stable-v5 utilise des classes fat
3. **Vérifier la compat Node 12** → stable-v5 ne supporte pas `?.`, `??`, `#private`
4. **Tester après backport** → `node -c <file>` + `npm test`

---

*Politique établie le 2026-06-20 suite à l'investigation forensique cross-branches.*
