# 🚀 PLAN D'AMÉLIORATION — Tuya Unified Zigbee

> **Date**: 09 Juin 2026
> **Basé sur**: Audit complet de 320 drivers, 44594 fingerprints, 70+ règles SDK3
> **Objectif**: Optimiser la taille, réduire les bugs, rendre l'app plus intelligente

---

## 📊 État actuel du projet

| Métrique | Valeur |
|----------|--------|
| Drivers | 320 Zigbee + 51 WiFi |
| Fingerprints | 44594 |
| Taille archive | ~15 MB (limite: 20 MB) |
| Issues ouvertes | 7 |
| Scripts de validation | 7 |
| Rules documentées | 70+ |

---

## 🔴 PRIORITÉ 1 — CORRECTIONS CRITIQUES (Terminé)

| Bug | Fix | Statut |
|-----|-----|--------|
| 190 drivers format fingerprints[] | Convertis vers manufacturerName[] + productId[] | ✅ |
| 11 drivers avec MFRs manquants | MFRs ajoutés depuis fingerprints[] | ✅ |
| 6 wildcards MFRs supprimés | Rule L6 appliquée | ✅ |
| 5 drivers avec MFR vide | Placeholders ajoutés | ✅ |
| 8 SyntaxErrors await-without-async | Tous corrigés dans UnifiedSensorBase | ✅ |
| 5 memory leaks corrigés | Cleanup chains dans onUninit/onDeleted | ✅ |
| sendDP wrapper ajouté | TuyaEF00Manager.js | ✅ |
| requestDPs → requestDP | 5 drivers corrigés | ✅ |
| DP12 pressure/luminance | Bed sensor corrigé | ✅ |
| DP4 battery routing | Retiré de dpMappings | ✅ |
| Case sensitivity bugs | fingerprints.json corrigé | ✅ |

---

## 🟠 PRIORITÉ 2 — OPTIMISATION TAILLE (À faire)

### 2.1 Nettoyer les fichiers orphelins
- **459 scripts orphelins** dans `scripts/` (84% du code scripts)
- Déplacer vers `scripts/archive/` ou supprimer
- Réduire la taille de ~1.4 MB

### 2.2 Nettoyer les drivers dépréciés
- **10 drivers dépréciés** encore présents
- `switch_1gang`, `wall_switch_*`, etc.
- Vérifier s'ils sont toujours utilisés

### 2.3 Optimiser fingerprints.json
- **3.4 MB** — charger en mémoire au démarrage
- Implémenter le lazy loading ou le chunking par catégorie
- Réduire la taille de ~50%

### 2.4 Nettoyer les données de dev
- `lib/data/` — fichiers JSON de développement
- `data/community-sync/` — rapports temporaires
- `scripts/data/` — données de test

---

## 🟡 PRIORITÉ 3 — RÉDUCTION DES BUGS (À faire)

### 3.1 Système de détection automatique des bugs
- `check-await-without-async.js` → étendre à tous les drivers
- `check-database-routing.js` → vérifier toutes les DB
- `check-fingerprint-health.js` → détecter les collisions

### 3.2 Audit des rules SDK3
- Vérifier que TOUTES les rules sont appliquées
- Ajouter des checks automatiques dans le CI
- Bloquer les violations critiques

### 3.3 Validation des DP mappings
- Cross-référencer avec Z2M pour chaque device
- Détecter les DP manquants ou mal mappés
- Vérifier les transformations (divide, bool, enum)

### 3.4 Nettoyage des drivers
- Supprimer les drivers dépréciés
- Fusionner les drivers dupliqués
- Vérifier les imports inutiles

---

## 🟢 PRIORITÉ 4 — INTELLIGENCE DE L'APP (À faire)

### 4.1 Auto-adaptation par MFR+PID
- Système MFR_CONFIGS pour chaque device
- Détection automatique du protocole (Tuya DP vs ZCL)
- Configuration par défaut pour les MFRs inconnus

### 4.2 Détection intelligente des batteries
- UnifiedBatteryHandler avec profils non-linéaires
- Détection automatique du type de batterie
- Anti-flood 5min/2%

### 4.3 Auto-discovery des DP inconnus
- IntelligentDPAutoDiscovery avec confiance ≥60%
- Enrichissement automatique des capabilities
- Cache par MFR+DP+capability

### 4.4 Adaptation au runtime
- PermissiveMatchingEngine pour l'appairage
- DynamicCapabilityManager pour l'enrichissement
- CapabilityFallbackManager pour la sanitarisation

---

## 📋 PLANNING D'EXÉCUTION

| Phase | Priorité | Effort | Impact |
|-------|----------|--------|--------|
| **Phase 1** | CRITICAL (terminé) | 20h | Évite crashes + mals |
| **Phase 2** | HIGH (cette semaine) | 8h | Réduit taille archive |
| **Phase 3** | MEDIUM (ce mois) | 20h | Améliore CI/CD + qualité |
| **Phase 4** | LOW (prochains mois) | 15h | Rend l'app plus intelligente |

---

## 🔧 MÉTRIQUES DE SUivi

| Métrique | Actuel | Cible |
|----------|--------|-------|
| Taille archive | 15 MB | < 10 MB |
| Scripts orphelins | 459 | < 50 |
| Drivers dépréciés | 10 | 0 |
| SyntaxErrors | 0 | 0 |
| Memory leaks | 0 | 0 |
| Collisions MFR | 756 | < 100 |
| Rules SDK3 | 70+ | 100+ |
