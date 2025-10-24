# ⚠️ CHECKLIST AVANT MIGRATION MASSIVE

**Date**: 23 Octobre 2025  
**Action**: Migration complète vers mode unbranded  
**Impact**: ~165 drivers renommés

---

## 🚨 AVANT D'EXÉCUTER - OBLIGATOIRE

### 1. ✅ BACKUP COMPLET
- [ ] **Git commit** de l'état actuel
- [ ] **Backup dossier** tuya_repair complet
- [ ] **Note version** actuelle (4.3.9)

### 2. ✅ VÉRIFICATION ENVIRONNEMENT
- [ ] Aucun processus Homey en cours
- [ ] Aucune modification non commitée
- [ ] Assez d'espace disque

### 3. ✅ COMPRÉHENSION IMPACT
- [ ] Je comprends que 165 drivers seront renommés
- [ ] Je comprends que app.json devra être mis à jour après
- [ ] Je comprends que c'est un changement majeur (v5.0.0)

---

## 📋 COMMANDES D'EXÉCUTION

### Option 1: Exécution Sécurisée (RECOMMANDÉ)
```bash
# 1. Commit état actuel
git add .
git commit -m "Pre-migration snapshot - v4.3.9"

# 2. Créer branche migration
git checkout -b migration-unbranded-v5

# 3. Exécuter migration
node scripts/execute_migration.js

# 4. Vérifier résultats
git status
```

### Option 2: Test Dry-Run D'ABORD
```bash
# Test sans modification (À IMPLÉMENTER)
node scripts/execute_migration.js --dry-run
```

---

## ✅ APRÈS MIGRATION

### Actions Immédiates
1. [ ] Vérifier nombre de drivers après migration
2. [ ] Vérifier aucune erreur dans output script
3. [ ] Vérifier manufacturer IDs préservés (sample check)
4. [ ] Tester `homey app validate`

### Actions Suivantes
1. [ ] Mettre à jour app.json avec nouveaux driver IDs
2. [ ] Mettre à jour flow cards dans app.json
3. [ ] Créer nouveaux drivers manquants (thermostats, doorbell_button)
4. [ ] Bump version à 5.0.0
5. [ ] Créer changelog détaillé
6. [ ] Tests complets

---

## 🛟 PLAN DE ROLLBACK

Si problème après migration:

### Option A: Git Revert
```bash
git reset --hard HEAD~1
git checkout master
```

### Option B: Restaurer Backup
```bash
# Copier backup vers dossier original
```

---

## 📊 RÉSULTATS ATTENDUS

| Métrique | Avant | Après |
|----------|-------|-------|
| **Drivers Total** | 189 | ~180 |
| **Drivers Unbranded** | 17 | ~180 |
| **Drivers à Marque** | 172 | 0 |
| **Drivers USB** | 2 | 3 |
| **Manufacturer IDs** | 659 | 659 (préservés) |

---

## 🚀 PRÊT?

**Vérifier TOUTES les cases ci-dessus avant d'exécuter!**

Une fois prêt:
```bash
node scripts/execute_migration.js
```

---

**Créé**: 23 Octobre 2025  
**Status**: ⚠️ **PRÊT POUR EXÉCUTION (AVEC BACKUP!)**
