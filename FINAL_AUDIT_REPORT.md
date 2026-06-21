# 📋 Audit Final Global — Conformité Règles + Root Causes + Fixes

**Date** : 2026-06-21
**Portée** : Revue complète des règles, comparaison versions historiques, validation

---

## ✅ Conformité aux Règles Critiques

| Règle | Description | Statut master | Statut stable-v5 |
|-------|-------------|:------------:|:----------------:|
| **A7** | Ordre mixins `PhysicalButtonMixin(VirtualButtonMixin(Base))` | ✅ | ✅ |
| **A8** | `setCapabilityValue` doit être `await`ed | ✅ | ✅ |
| **A9** | Pas de `console.*` en production runtime | ✅ | ✅ |
| **B2** | Pas de formule batterie linéaire | ✅ | ✅ |
| **L5** | CaseInsensitiveMatcher (pas `.toLowerCase` manuel) | ✅ | ✅ |
| **L6** | Pas de wildcards `_TZE284_*` | ✅ | ✅ |
| **R32** | Pas de `setTimeout`/`setInterval` nus | ✅ | ✅ |

---

## 🐛 Root Causes Résolues (Session Complète)

### Boutons (8 root causes)
| # | Root Cause | Origine | Fix |
|---|-----------|---------|-----|
| 1 | `_registerButtonCapabilityListeners` supprimé (TITAN V5) | master | Restauré depuis v5.11.205 ✅ |
| 2 | `super.on()` au lieu de `onNodeInit({zclNode})` | stable-v5 | 8 drivers restaurés ✅ |
| 3 | `this.homey.set*` sans fallback | master + sv5 | `(this.homey?.set* \|\| set*)` ✅ |
| 4 | `_isDebounced()` sans arg gang (multi-gang cassé) | master | `_isDebounced(gang)` ✅ |
| 5 | TSN recyclage 8-bit sans fenêtre temporelle | master | `{tsn, ts}` fenêtre 5s ✅ |
| 6 | 0xFD match trop étroit (2 variantes) | master | 6 variantes ✅ |
| 7 | 3 patterns OnOff (au lieu de 9) | master | 9 patterns ✅ |
| 8 | setupButtonDetection perdu | master | LegacyButtonDetectionMixin ✅ |

### Batterie (6 root causes)
| # | Root Cause | Origine | Fix |
|---|-----------|---------|-----|
| 9 | package.json path cassé (reporting jamais reconfiguré) | master | `../../package.json` ✅ |
| 10 | `SanityFilter._getROCLimit` manquant | master | Méthode ajoutée ✅ |
| 11 | Edge case même-ms (pics non filtrés) | master | Delta minimal 0.001s ✅ |
| 12 | Formule linéaire `XiaomiSpecialHandler` | master + sv5 | Courbe CR2032 11 points ✅ |
| 13 | Formule linéaire `DataRecoveryManager` | master + sv5 | Courbe CR2032 7 points ✅ |
| 14 | Timer lecture batterie sans fallback | master | `(this.homey?.set* \|\| set*)` ✅ |

### Devices (3 root causes)
| # | Root Cause | Fix |
|---|-----------|-----|
| 15 | HOBEIAN absent de app.json compilé | Injecté dans app.json ✅ |
| 16 | ZG-301Z dans drivers multi-gang (4-gang, 5-gang) | Retiré, reste switch_1gang uniquement ✅ |
| 17 | IDs flow card `_hybrid_` invalides | 18 IDs corrigés stable-v5 ✅ |

---

## 📊 Comparaison Master vs Versions Historiques

| Métrique | master (actuel) | v5.11.205 (réf) | stable-v5 (actuel) |
|----------|:--------------:|:----------------:|:------------------:|
| `_registerButtonCapabilityListeners` | **5 occ** ✅ | 2 | 2 |
| Timers fallback protégés | **5** ✅ | 0 | 0 |
| button_wireless_3 extends | `ButtonDevice` ✅ | `ButtonDevice` ✅ | `ButtonDevice` ✅ |
| SanityFilter `_getROCLimit` | **présent** ✅ | absent | absent |
| TSN dedup fenêtre 5s | **présent** ✅ | absent | absent |
| Debounce par-gang | **présent** ✅ | absent | absent |
| 9 patterns OnOff | **présent** ✅ | absent | absent |
| HOBEIAN dans app.json | **True** ✅ | — | — |

**Conclusion** : master est désormais **supérieur** à toutes les versions historiques sur la gestion boutons+batterie.

---

## 📦 Validation Finale

```
master : 53/53 tests ✅
        0 violation règle critique ✅
        _registerButtonCapabilityListeners présent ✅
        0 setTimeout nu ✅
        HOBEIAN dans app.json ✅

stable-v5 : 12 commits session
            ButtonDevice pattern restauré ✅
            _registerButtonCapabilityListeners déjà présent ✅
            timers fallback ✅
```

---

## 🔜 Actions Requises

1. **Republier master** : `npm run build && homey app publish` (propage _registerButtonCapabilityListeners + tous les fixes)
2. **Republier stable-v5** : idem sur la branche stable
3. **Re-appairer** HOBEIAN ZG-301Z si toujours non reconnu après update
4. **Étendre tests** : couverture des registerCapabilityListeners + batterie restore
