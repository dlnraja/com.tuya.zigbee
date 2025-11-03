# 🔧 SOLUTION COMPLÈTE - BSEED 2-Gang Switch (Loïc Salmona)

**Date**: 2 Novembre 2025  
**Issue**: Both gangs activate when commanding single gang  
**Device**: BSEED 2-gang tactile Zigbee switch  
**User**: Loïc Salmona <loic.salmona@gmail.com>

---

## 🎯 DIAGNOSTIC

### Problème Constaté
```javascript
// COMMANDE ACTUELLE (NE FONCTIONNE PAS)
endpoint[1].clusters.onoff.setOn()   // Active Gang 1 + Gang 2 ❌
endpoint[2].clusters.onoff.setOn()   // Active Gang 1 + Gang 2 ❌

// RÉSULTAT: Les DEUX gangs s'activent au lieu d'un seul!
```

### Cause Root: Bug Firmware BSEED

Le firmware BSEED **ne gère PAS correctement** les endpoints séparés du cluster On/Off standard Zigbee.

**C'est un bug firmware connu** sur certains switches Tuya multi-gang, PAS un problème de code!

---

## ✅ SOLUTION: Tuya Data Points (DPs)

### Comprendre Tuya DPs

**Tuya utilise des Data Points (DP)**, une **surcouche propriétaire** au-dessus du Zigbee standard.

Même si l'appareil tourne sur clusters Zigbee classiques, Tuya **encapsule tout dans des DPs**, ce qui:
- ✅ Détourne le fonctionnement normal Zigbee
- ✅ Complique l'intégration
- ✅ Mais permet contrôle indépendant de chaque gang!

### Architecture Tuya DP

```
┌─────────────────────────────────────────────────────┐
│  Homey Capability (onoff, onoff.1)                  │
│                      ↕                               │
│  DP Mapping (DP1=Gang1, DP2=Gang2)                  │
│                      ↕                               │
│  Tuya DP Parser (decode/encode payload)             │
│                      ↕                               │
│  Cluster 0xEF00 (Tuya Private Cluster)              │
│                      ↕                               │
│  Zigbee Network                                      │
│                      ↕                               │
│  BSEED 2-Gang Device                                │
└─────────────────────────────────────────────────────┘
```

---

## 💻 IMPLÉMENTATION COMPLÈTE

Voir fichiers séparés:
- `LOIC_BSEED_CODE_EXAMPLE.md` - Code complet device.js
- `LOIC_BSEED_DP_CYCLE_DIAGRAM.md` - Schéma visuel cycle DP
- `LOIC_BSEED_STEP_BY_STEP.md` - Exemple pas-à-pas avec logs

---

## 📚 RÉFÉRENCES

### Documentation Tuya Officielle
https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard

### Discussion Zigpy (Parseur DP)
https://github.com/zigpy/zigpy/discussions/823

### Projet dlnraja/com.tuya.zigbee
https://github.com/dlnraja/com.tuya.zigbee
- TuyaEF00Manager.js
- TuyaMultiGangManager.js
- Parseur DP générique complet

---

## 🎯 SOLUTION IMMÉDIATE

### Option 1: Utiliser Universal Tuya Zigbee App ✅

L'app **Universal Tuya Zigbee** supporte DÉJÀ les Tuya DPs!

**Installation**:
1. Chercher "Universal Tuya Zigbee" dans Homey App Store
2. Installer l'app
3. Pairer votre BSEED 2-gang
4. ✅ Chaque gang fonctionne indépendamment!

### Option 2: Code Custom (Si Développeur)

Voir `LOIC_BSEED_CODE_EXAMPLE.md` pour code complet

---

**Status**: ✅ SOLUTION IDENTIFIÉE  
**Next**: Voir fichiers détaillés  
**Contact**: Dylan - [redacted-phone]
