# 🔑 CONFIGURATION HOMEY_TOKEN POUR GITHUB

Guide complet pour configurer la publication automatique sur Homey App Store via GitHub Actions.

---

## 🎯 OBJECTIF

Permettre la publication automatique sur Homey App Store quand vous créez une release GitHub.

---

## ⚠️ PRÉREQUIS

1. Compte développeur Athom: https://developer.athom.com
2. App existante sur Homey App Store (ou soumise)
3. Accès aux settings du repository GitHub

---

## 📝 ÉTAPE 1: OBTENIR LE TOKEN HOMEY

### Via Athom Developer Portal

1. **Aller sur:** https://developer.athom.com
2. **Login** avec votre compte Athom
3. **Cliquer** sur votre avatar (en haut à droite)
4. **Sélectionner:** "Profile"
5. **Aller dans:** "Access Tokens"
6. **Cliquer:** "Create New Token"
7. **Nom du token:** "GitHub Actions" (ou autre nom descriptif)
8. **Permissions:** Sélectionner "Publish Apps"
9. **Cliquer:** "Create Token"
10. **IMPORTANT:** Copier le token immédiatement (il ne sera plus affiché)

**Le token ressemble à:** `abc123def456ghi789jkl012mno345pqr678stu`

---

## 🔒 ÉTAPE 2: AJOUTER LE TOKEN À GITHUB

### Via GitHub Repository Settings

1. **Aller sur:** https://github.com/dlnraja/com.tuya.zigbee
2. **Cliquer:** "Settings" (tab en haut)
3. **Dans le menu gauche:** "Secrets and variables" → "Actions"
4. **Cliquer:** "New repository secret"
5. **Name:** `HOMEY_TOKEN` (exactement ce nom, case-sensitive)
6. **Secret:** Coller le token copié de Athom
7. **Cliquer:** "Add secret"

**✅ Résultat:** Le secret `HOMEY_TOKEN` est maintenant disponible pour les workflows.

---

## ✅ ÉTAPE 3: VÉRIFIER LA CONFIGURATION

### Test du Workflow

**Option 1: Via GitHub Web UI**

1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Sélectionner workflow: "Homey App Publish"
3. Cliquer: "Run workflow"
4. Sélectionner branch: master
5. Cliquer: "Run workflow"
6. Attendre l'exécution
7. Vérifier les logs

**Option 2: Via Release**

1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/releases
2. Cliquer: "Draft a new release"
3. Tag: `v4.9.273-test`
4. Title: "Test Release"
5. Cocher: "Set as a pre-release"
6. Cliquer: "Publish release"
7. Vérifier workflow: https://github.com/dlnraja/com.tuya.zigbee/actions

---

## 🚀 UTILISATION

### Publication d'une Nouvelle Version

**1. Développement terminé**

```bash
# Local testing
homey app run

# Validation
homey app validate --level publish
```

**2. Commit & Push**

```bash
git add -A
git commit -m "feat: New feature"
git push origin master
```

✅ Workflow `validate.yml` s'exécute automatiquement

**3. Créer GitHub Release**

Via GitHub Web:
1. Releases → New release
2. Tag: `v4.9.273` (version suivante dans app.json)
3. Title: `v4.9.273 - Feature Name`
4. Description: Changelog
5. Publish release

Via Git CLI:
```bash
git tag v4.9.273 -m "Release v4.9.273"
git push origin v4.9.273
```

✅ Workflow `publish.yml` s'exécute automatiquement

**4. Vérification**

- Workflow logs: https://github.com/dlnraja/com.tuya.zigbee/actions
- Homey App Store: https://apps.athom.com/

**✅ App publiée automatiquement!**

---

## 📊 WORKFLOWS GITHUB ACTIONS

### validate.yml

**Trigger:** Push sur master/main

**Actions:**
```yaml
- Install Homey CLI
- Run: homey app validate --level publish
- Upload validation report
```

**Aucun token requis**

---

### publish.yml

**Trigger:** Release published

**Actions:**
```yaml
- Install Homey CLI
- Run: homey app validate --level publish
- Run: homey app build
- Login: homey login --token $HOMEY_TOKEN
- Publish: homey app publish
- Upload build artifact
```

**Token requis:** ✅ HOMEY_TOKEN

---

## 🔍 DÉPANNAGE

### Erreur: "HOMEY_TOKEN not found"

**Cause:** Secret pas configuré dans GitHub

**Solution:**
1. Vérifier le nom exact: `HOMEY_TOKEN` (case-sensitive)
2. Vérifier dans: Repository → Settings → Secrets → Actions
3. Recréer le secret si nécessaire

---

### Erreur: "Authentication failed"

**Cause:** Token invalide ou expiré

**Solution:**
1. Générer un nouveau token sur https://developer.athom.com
2. Mettre à jour le secret dans GitHub
3. Re-run le workflow

---

### Erreur: "App not found"

**Cause:** App pas encore soumise sur Homey App Store

**Solution:**
1. Soumettre l'app manuellement une première fois via Homey CLI:
   ```bash
   homey login
   homey app publish
   ```
2. Après la première soumission, GitHub Actions fonctionnera

---

### Workflow ne se déclenche pas

**Cause:** Pas de release/tag créé

**Solution:**
1. Vérifier que vous avez créé une release (pas juste un tag)
2. Type de release doit être "published" (pas draft)
3. Vérifier les logs: https://github.com/dlnraja/com.tuya.zigbee/actions

---

## 📖 RÉFÉRENCES

### Athom Developer

- Portal: https://developer.athom.com
- Documentation: https://apps.developer.homey.app/
- API Docs: https://apps-sdk-v3.developer.homey.app/

### Homey CLI

```bash
# Install
npm install -g homey

# Login
homey login

# Validate
homey app validate --level publish

# Build
homey app build

# Publish
homey app publish

# Help
homey --help
```

### GitHub Actions

- Workflows: https://github.com/dlnraja/com.tuya.zigbee/actions
- Secrets: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
- Docs: https://docs.github.com/en/actions

---

## ✅ CHECKLIST CONFIGURATION

### Avant la première publication automatique

- [ ] Compte développeur Athom créé
- [ ] App soumise manuellement une première fois
- [ ] Token Homey généré sur developer.athom.com
- [ ] Secret HOMEY_TOKEN ajouté dans GitHub
- [ ] Workflow validate.yml fonctionne
- [ ] Workflow publish.yml testé (workflow_dispatch)

### Pour chaque nouvelle version

- [ ] Version mise à jour dans app.json
- [ ] Code validé localement: `homey app validate --level publish`
- [ ] Changements committés et pushés
- [ ] Release GitHub créée avec tag correct
- [ ] Workflow publish.yml exécuté avec succès
- [ ] App visible sur Homey App Store

---

## 🎯 RÉSUMÉ

**Configuration (une fois):**
1. Obtenir HOMEY_TOKEN de developer.athom.com
2. Ajouter secret dans GitHub repository

**Publication (à chaque version):**
1. Développer et tester
2. Push sur master (validation auto)
3. Créer GitHub release (publication auto)
4. ✅ App publiée sur Homey App Store!

**C'est tout! Simple et automatique.** 🎉

---

**Guide créé:** 2025-11-04  
**Status:** Production Ready  
