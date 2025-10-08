# 🔧 GITHUB ACTIONS DEBUG & FIX GUIDE

**Date:** 2025-10-08 05:47 CET  
**Status:** ✅ **FIXED & OPTIMIZED**

---

## 🎯 Problèmes Identifiés & Corrigés

### 1. ❌ Ancien Workflow - Gestion des Prompts Défaillante

**Fichier:** `.github/workflows/publish-homey.yml` (DEPRECATED)

**Problèmes:**
```yaml
# ❌ PROBLÈME 1: echo -e ne fonctionne pas correctement avec prompts interactifs
echo -e "n\\ny\\n" | homey app publish

# ❌ PROBLÈME 2: || echo masque les erreurs
... || echo "Publication command executed"

# ❌ PROBLÈME 3: Version hardcodée périmée
echo "📊 Version: 1.4.1"  # Devrait être dynamique
```

**Impact:**
- Les prompts ne sont pas gérés correctement
- Les erreurs sont masquées
- Pas de feedback clair sur le succès/échec

---

### 2. ✅ Nouveau Workflow - Solution Robuste

**Fichier:** `.github/workflows/publish-main.yml` (ACTIVE)

**Solutions Appliquées:**

#### A. Gestion Correcte des Prompts
```yaml
# ✅ SOLUTION: Utiliser printf avec newline
printf "n\n" | homey app publish 2>&1 | tee publish.log
```

#### B. Vérification des Résultats
```yaml
# ✅ SOLUTION: Vérifier le contenu du log
if grep -q "successfully published" publish.log || grep -q "App published" publish.log; then
  echo "✅ Publication successful!"
  exit 0
elif grep -q "already exists" publish.log; then
  echo "ℹ️  Version already published"
  exit 0
fi
```

#### C. Validation du Token
```yaml
# ✅ SOLUTION: Vérifier le token avant utilisation
if [ -z "$HOMEY_TOKEN" ]; then
  echo "❌ ERROR: HOMEY_TOKEN secret not configured"
  exit 1
fi
```

---

## 📋 Configuration Requise

### GitHub Secrets

**HOMEY_TOKEN** doit être configuré:

1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Cliquer sur "New repository secret"
3. Name: `HOMEY_TOKEN`
4. Value: Votre token Homey CLI

**Obtenir le token:**
```bash
# Sur votre machine locale
homey login
# Copier le token qui s'affiche
```

---

## 🔍 Debug des Erreurs Courantes

### Erreur 1: Authentication Failed

**Symptôme:**
```
❌ ERROR: HOMEY_TOKEN secret not configured
```

**Solution:**
1. Vérifier que `HOMEY_TOKEN` existe dans les secrets
2. Vérifier que le token est valide (pas expiré)
3. Régénérer un nouveau token si nécessaire

---

### Erreur 2: Version Already Exists

**Symptôme:**
```
Error: This version already exists
```

**Solution:**
```bash
# Version bump AVANT le push
# Éditer app.json localement
"version": "1.7.5"  # Incrémenter la version

# Puis commit & push
git add app.json
git commit -m "chore: Bump version to 1.7.5"
git push origin master
```

---

### Erreur 3: Validation Failed

**Symptôme:**
```
❌ Validation failed
invalid driver class
```

**Solution:**
```bash
# Tester localement AVANT le push
homey app validate --level=publish

# Corriger les erreurs
# Puis commit & push
```

---

### Erreur 4: Build Failed

**Symptôme:**
```
❌ Build failed
```

**Solution:**
```bash
# Nettoyer et rebuilder localement
rm -rf .homeybuild
homey app build

# Si succès local, pusher
git push origin master
```

---

## 🚀 Workflow de Publication Optimal

### 1. Préparation Locale

```bash
# 1. Nettoyer
rm -rf .homeybuild

# 2. Builder
homey app build

# 3. Valider
homey app validate --level=publish

# 4. Version bump
# Éditer app.json: "version": "1.7.X"

# 5. Commit
git add -A
git commit -m "feat: Description des changements v1.7.X"
```

### 2. Push & Publication Automatique

```bash
# 6. Push
git push origin master

# 7. Monitoring
# Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
# Surveiller l'exécution du workflow
```

### 3. Vérification

```bash
# 8. Vérifier publication
# Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
# Store: https://homey.app/app/com.dlnraja.tuya.zigbee
```

---

## 📊 Workflows Disponibles

### Actifs

1. **publish-main.yml** ✅
   - Trigger: Push sur master
   - Actions: Build, Validate, Publish
   - Status: OPTIMISÉ

### Deprecated

1. **publish-homey.yml** ⚠️
   - Status: DEPRECATED
   - Raison: Gestion prompts défaillante
   - Action: Désactivé (workflow_dispatch only)

### Autres

- `manual-publish.yml` - Publication manuelle
- `test-cli.yml` - Tests CLI
- `pages.yml` - GitHub Pages

---

## 🔧 Commandes de Debug

### Tester Localement

```bash
# Test complet
npm install
homey app build
homey app validate --level=publish
```

### Vérifier Token

```bash
# Vérifier connexion Homey
homey login --status
```

### Forcer Rebuild

```bash
# Nettoyer tout
rm -rf .homeybuild node_modules
npm install
homey app build
```

---

## 📈 Monitoring GitHub Actions

### Liens Directs

**Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions  
**Secrets:** https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions  
**Workflows:** https://github.com/dlnraja/com.tuya.zigbee/tree/master/.github/workflows

### Vérifier Exécution

```bash
# Via GitHub CLI (si installé)
gh run list --workflow=publish-main.yml
gh run view [RUN_ID]
```

---

## ✅ Checklist Pre-Publication

- [ ] Code nettoyé et validé localement
- [ ] `homey app build` SUCCESS
- [ ] `homey app validate --level=publish` PASSED
- [ ] Version bumped dans app.json
- [ ] CHANGELOG.md mis à jour
- [ ] Commit avec message clair
- [ ] HOMEY_TOKEN configuré dans secrets
- [ ] Push sur master
- [ ] Monitoring GitHub Actions
- [ ] Vérification Dashboard Homey

---

## 🎊 État Actuel

```
╔═════════════════════════════════════════╗
║  GITHUB ACTIONS - FIXED & OPTIMIZED   ║
╠═════════════════════════════════════════╣
║  Workflow Principal:  publish-main.yml ║
║  Gestion Prompts:     ✅ FIXED         ║
║  Error Handling:      ✅ ROBUST        ║
║  Logging:             ✅ DETAILED      ║
║  Status Check:        ✅ IMPLEMENTED   ║
╚═════════════════════════════════════════╝
```

---

## 📞 Support & Liens

**Repository:** https://github.com/dlnraja/com.tuya.zigbee  
**Dashboard:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee  
**Store:** https://homey.app/app/com.dlnraja.tuya.zigbee  
**Homey CLI Docs:** https://apps.developer.homey.app/the-basics/getting-started

---

**🎊 GITHUB ACTIONS DEBUGGED & FIXED - READY FOR PUBLICATION! 🎊**

*Generated: 2025-10-08 05:47 CET*  
*Workflow: publish-main.yml (optimized)*
