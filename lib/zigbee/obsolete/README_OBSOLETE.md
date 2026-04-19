#  FICHIERS OBSOLÈTES - v4.0.6

**Date de déplacement:** 21 Octobre 2025  
**Raison:** Simplification IASZoneEnroller (regression fix)

---

##  Fichiers Déplacés Ici

### 1. `wait-ready.js`
- **Raison:** Over-engineering
- **Problème:** Ajoutait des délais artificiels qui cassaient le timing Zigbee
- **Remplacé par:** Try-catch simple dans IASZoneEnroller.js

### 2. `safe-io.js`
- **Raison:** Over-engineering  
- **Problème:** Complexité inutile pour retry logic
- **Remplacé par:** Error handling simple avec catch

---

##  Historique

Ces fichiers ont été créés dans v3.1.18 pour gérer des "edge cases" mais ont introduit plus de problèmes qu'ils n'en ont résolu:

- Ajout de délais qui cassaient l'enrollment IAS Zone
- Retry logic qui ne marchait pas vraiment
- Complexité qui rendait le debugging difficile

**Leçon:** La version simple (v2.15.128) fonctionnait mieux.

---

##  Référence

Voir documentation complète:
- `docs/fixes/REGRESSION_FIX_v4.0.6_COMPLETE.md`
- `docs/analysis/REGRESSION_ANALYSIS_PETER_COMPLETE.md`

---

**NE PAS RÉUTILISER CES FICHIERS.**  
Ils sont conservés uniquement pour référence historique.
