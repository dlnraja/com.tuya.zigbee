# Guide CI/CD - Ultimate Zigbee Hub

## 🚀 Pipeline Automatique Complet

Ce projet utilise un système CI/CD complet avec validation, enrichissements et publication automatiques.

## 📋 Scripts Disponibles

### Pipeline Complet (Recommandé)

```bash
npm run pipeline
```

**Ce que fait ce script:**
1. ✅ Nettoyage sécurité (.homeycompose)
2. ✅ Audit power designation
3. ✅ Nettoyage app.json (remove non-existent drivers)
4. ✅ Synchronisation drivers
5. ✅ Redimensionnement images (contenu préservé)
6. ✅ Validation locale (debug + publish)
7. ✅ Git operations (stash, pull, pop)
8. ✅ Commit et push
9. ✅ GitHub Actions publication automatique

**Durée estimée:** 2-5 minutes

---

### Scripts Individuels

#### Validation

```bash
# Validation debug
npm run validate:debug

# Validation publish (stricte)
npm run validate:publish
```

#### Audit et Nettoyage

```bash
# Audit power designation de tous les drivers
npm run audit

# Nettoyer app.json (supprimer drivers non-existants)
npm run clean

# Synchroniser app.json avec dossier drivers/
npm run sync
```

#### Images

```bash
# Redimensionner toutes les images (préserve contenu)
npm run images
```

#### Nomenclature

```bash
# Vérifier et corriger nomenclature drivers
npm run fix-nomenclature
```

#### Pre-commit Checks

```bash
# Vérifications avant commit (automatique)
npm run precommit
```

---

## 🔄 Workflow Complet

### Option 1: Pipeline Automatique (Recommandé)

```bash
# Une seule commande fait TOUT
npm run pipeline
```

Cette commande exécute tous les checks, enrichissements, validations et push automatiquement.

### Option 2: Manuel Étape par Étape

```bash
# 1. Audit
npm run audit

# 2. Nettoyage
npm run clean

# 3. Synchronisation
npm run sync

# 4. Images
npm run images

# 5. Validation
npm run validate:publish

# 6. Git (manuel)
git add .
git commit -m "your message"
git push origin master
```

---

## 📊 Phases du Pipeline

### Phase 1: CLEANUP & SECURITY
- Remove .homeycompose (obligatoire)
- Remove .homeybuild cache
- Vérification sécurité

### Phase 2: AUDIT & VERIFICATION
- **Power Audit**: Vérifie que tous drivers ont designation alimentation
- **Clean app.json**: Supprime drivers non-existants
- **Sync**: Ajoute nouveaux drivers manquants

### Phase 3: IMAGES
- **Resize**: Redimensionne toutes images aux bonnes tailles
- **Preserve**: Garde le contenu/design existant
- Tailles: 75x75, 500x500, 1000x1000

### Phase 4: LOCAL VALIDATION
- **Debug**: Validation basique
- **Publish**: Validation stricte (must pass)
- Si échec → Pipeline STOP

### Phase 5: GIT OPERATIONS
- Check status
- Stash changes
- Fetch and pull
- Pop stash
- Stage all
- Commit (message auto-généré)
- Push to master

### Phase 6: GITHUB ACTIONS
- Déclenchement automatique
- Build
- Publish to Homey App Store

---

## ✅ Pre-commit Checks (Automatique)

Avant chaque commit, ces vérifications s'exécutent automatiquement:

1. ✅ .homeycompose n'existe pas
2. ✅ Pas de credentials dans les fichiers
3. ✅ app.json valide (JSON syntax)
4. ✅ Versions synchronisées (app.json == package.json)

Si erreur → Commit BLOQUÉ

---

## 🔧 GitHub Actions Workflow

Fichier: `.github/workflows/ci-cd-pipeline.yml`

**Triggers:**
- Push sur master/main
- Manual dispatch

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Clean .homeycompose
5. Validate debug
6. Validate publish
7. Build app
8. Create artifact
9. Publish to Homey App Store

---

## 📝 Conventions de Commit

Le pipeline génère automatiquement des commits avec ce format:

```
chore(v2.1.46): CI/CD pipeline run

- All validations passed (debug + publish)
- Images verified and resized
- app.json synchronized
- Security checks passed
- Ready for publication

Pipeline: ULTIMATE_CI_CD_PIPELINE.js
Timestamp: 2025-10-11T11:30:00.000Z
```

---

## ⚠️ Troubleshooting

### Pipeline échoue à la validation

```bash
# Voir l'erreur exacte
npm run validate:publish

# Corriger puis relancer
npm run pipeline
```

### Images invalides

```bash
# Forcer redimensionnement
npm run images

# Puis valider
npm run validate:publish
```

### app.json corrompus

```bash
# Nettoyer
npm run clean

# Re-synchroniser
npm run sync

# Valider
npm run validate:publish
```

### Drivers manquants

```bash
# Synchroniser
npm run sync

# Cela ajoute automatiquement tous les drivers de /drivers/
```

---

## 🎯 Best Practices

### 1. Toujours utiliser le pipeline

```bash
npm run pipeline
```

Au lieu de git push manuel. Le pipeline garantit que:
- Tous checks passent
- Images correctes
- Validation locale OK
- Sécurité OK

### 2. Vérifier avant commit

```bash
npm run precommit
```

Même si automatique, vous pouvez l'exécuter manuellement.

### 3. Tester localement

```bash
npm run validate:publish
```

Avant de push, toujours valider localement.

### 4. Audit régulier

```bash
npm run audit
```

Pour vérifier nomenclature et power designation.

---

## 📊 Monitoring

### GitHub Actions

Surveiller les builds:
https://github.com/dlnraja/com.tuya.zigbee/actions

### Homey App Store

Vérifier publication:
https://homey.app/en-us/app/com.tuya.zigbee/

---

## 🔒 Sécurité

### Obligatoire avant push:
- ✅ .homeycompose removed
- ✅ No credentials in code
- ✅ .gitignore respecté

### Le pipeline vérifie automatiquement:
- Pas de .homeycompose
- Pas de patterns credentials
- Validation stricte publish

---

## 📈 Statistiques Pipeline

Exemple de sortie:

```
📊 PIPELINE SUMMARY:
   Total duration: 45.23s
   Steps executed: 12
   Steps passed: 12
   Steps failed: 0
   Warnings: 0

✅ PIPELINE SUCCESS
🎉 GitHub Actions will now handle publication
```

---

## 🚨 Si Pipeline Échoue

Le pipeline s'arrête immédiatement si:
- ❌ Validation debug fail
- ❌ Validation publish fail
- ❌ Images invalides
- ❌ Git push fail

**Action:**
1. Lire le message d'erreur
2. Corriger le problème
3. Relancer `npm run pipeline`

Le pipeline est **fail-fast** → arrêt immédiat si erreur

---

## 💡 Tips

### Développement rapide

```bash
# Mode développement (sans push)
npm run validate:debug

# Quand prêt pour publish
npm run pipeline
```

### Tests images

```bash
# Tester redimensionnement
npm run images

# Vérifier
npm run validate:publish
```

### Force sync

```bash
# Si app.json désynchronisé
npm run clean
npm run sync
```

---

## 📚 Documentation Complète

- **Pipeline**: `scripts/ULTIMATE_CI_CD_PIPELINE.js`
- **Pre-commit**: `scripts/PRE_COMMIT_CHECKS.js`
- **GitHub Actions**: `.github/workflows/ci-cd-pipeline.yml`
- **Nomenclature**: `docs/NOMENCLATURE_RULES.md`

---

## ✅ Checklist Avant Release

- [ ] `npm run audit` - OK
- [ ] `npm run clean` - OK
- [ ] `npm run sync` - OK
- [ ] `npm run images` - OK
- [ ] `npm run validate:publish` - PASS
- [ ] `npm run pipeline` - SUCCESS
- [ ] GitHub Actions - PASS
- [ ] Homey App Store - Published

---

**Version**: 2.1.46  
**Last Updated**: 2025-10-11  
**Maintainer**: Dylan L.N. Raja
