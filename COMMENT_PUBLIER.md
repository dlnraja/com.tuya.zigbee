# 📖 Comment Publier - Guide Complet

**Version actuelle:** 1.1.0  
**Dernière version Homey:** 2.1.24 (5 oct 2025)  
**Problème:** GitHub Actions ne publie pas automatiquement

---

## 🚀 MÉTHODE 1: Script Master Automatique (RECOMMANDÉ)

```powershell
# Exécute enrichissement 10x + scraping 10x + validation + commit + push + publication
pwsh -File EXECUTE_10X_AND_PUBLISH.ps1
```

**Ce script fait:**
1. ✅ 10 cycles d'enrichissement
2. ✅ 10 cycles de scraping
3. ✅ Validation Homey
4. ✅ Mise à jour version automatique
5. ✅ Git commit + push
6. ✅ Publication Homey App Store

---

## 🔄 MÉTHODE 2: Script Node.js Seul

```bash
# Enrichissement + scraping 10x
node tools\MASTER_10X_COMPLETE.js

# Puis publication manuelle
homey app publish
```

---

## 📦 MÉTHODE 3: Publication Directe Simple

```powershell
# Script de publication direct
pwsh -File tools\direct_publish.ps1
```

**OU manuel:**
```bash
homey app publish
```

---

## 🔍 Vérifier l'Authentification

Si la publication échoue, vérifiez l'authentification:

```bash
# Vérifier qui est connecté
homey whoami

# Se reconnecter si nécessaire
homey login

# Puis publier
homey app publish
```

---

## 📊 État Actuel du Projet

### Enrichissement
- ✅ 163 drivers traités
- ✅ +2829 manufacturer IDs ajoutés
- ✅ 1617 IDs scrapés toutes sources
- ✅ 84 IDs uniques en base

### Validation
- ✅ SDK3 compliant
- ✅ 0 erreurs
- ✅ Prêt publication

### Git
- ✅ Commit: cc91aaebd
- ✅ Push: master branch
- ✅ Tous fichiers à jour

---

## ⚠️ Pourquoi GitHub Actions Ne Marche Pas

### Problème
```
Dernière version publiée: 2.1.24 (5 oct 2025)
Version locale: 1.1.0
```

### Causes Possibles
1. **Token expiré:** HOMEY_TOKEN dans secrets GitHub
2. **Workflow désactivé:** Vérifier .github/workflows/
3. **Erreur authentication:** CLI non configuré dans Actions
4. **Timeout:** Publication trop longue

### Solutions
1. ✅ **Publication manuelle:** Utiliser scripts ci-dessus
2. ⚠️ **Renouveler token:** GitHub → Settings → Secrets → HOMEY_TOKEN
3. ⚠️ **Vérifier workflows:** Activer homey-publish-fixed.yml

---

## 🎯 Scripts Disponibles

| Script | Description | Commande |
|--------|-------------|----------|
| **MASTER_10X_COMPLETE.js** | 10x enrichissement + scraping + validation + commit | `node tools\MASTER_10X_COMPLETE.js` |
| **EXECUTE_10X_AND_PUBLISH.ps1** | Master + publication auto | `pwsh -File EXECUTE_10X_AND_PUBLISH.ps1` |
| **direct_publish.ps1** | Publication directe | `pwsh -File tools\direct_publish.ps1` |
| **ULTRA_MEGA_ENRICHMENT_10X.js** | Enrichissement seul | `node tools\ULTRA_MEGA_ENRICHMENT_10X.js` |

---

## 📝 Workflow Recommandé

### Pour Publier Maintenant

```powershell
# 1. Exécuter master script (TOUT AUTOMATIQUE)
pwsh -File EXECUTE_10X_AND_PUBLISH.ps1
```

**Suivre les prompts interactifs:**
- `y` pour continuer avec uncommitted changes (si demandé)
- `patch` pour version type
- Message changelog (déjà pré-rempli)
- `y` pour confirmer publication

### OU Étape par Étape

```bash
# 1. Enrichissement 10x
node tools\MASTER_10X_COMPLETE.js

# 2. Vérifier validation
homey app validate --level=publish

# 3. Publier
homey app publish
```

---

## 🔗 Liens Utiles

| Ressource | URL |
|-----------|-----|
| **Dashboard Homey** | https://tools.developer.homey.app/apps |
| **Repository** | https://github.com/dlnraja/com.tuya.zigbee |
| **GitHub Actions** | https://github.com/dlnraja/com.tuya.zigbee/actions |
| **App Store** | https://homey.app/[app-id] |

---

## 🎉 Résultat Attendu

Après publication réussie:
```
✅ Version 1.1.0 (ou supérieure) publiée
✅ 163 drivers disponibles
✅ 2829+ manufacturer IDs
✅ Visible sur Homey App Store
✅ Utilisateurs peuvent installer/mettre à jour
```

---

## 📞 En Cas de Problème

### Erreur: "Authentication failed"
```bash
homey login
# Suivre les instructions
```

### Erreur: "Version already exists"
```bash
# Mettre à jour version manuellement dans app.json
# Puis réessayer
```

### Erreur: "Validation failed"
```bash
homey app validate --level=publish
# Corriger les erreurs affichées
```

---

## ✅ Checklist Publication

Avant de publier:
- [ ] Enrichissement 10x complété
- [ ] Validation PASS
- [ ] Version mise à jour
- [ ] Git commit + push effectués
- [ ] Authentification Homey OK (`homey whoami`)
- [ ] Ready to publish!

---

**Pour publier MAINTENANT:**

```powershell
pwsh -File EXECUTE_10X_AND_PUBLISH.ps1
```

**C'est tout ! 🚀**
