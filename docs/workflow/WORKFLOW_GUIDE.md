# 🚀 WORKFLOW OFFICIEL - GITHUB ACTIONS AUTO-PUBLISH

**Version:** 2.15.128+  
**Date:** 16 Octobre 2025  
**Status:** ✅ ACTIF

---

## 📋 WORKFLOW CORRECT

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  LOCAL:        homey app build + homey app validate           ║
║                         ↓                                      ║
║              git commit + git push origin master               ║
║                         ↓                                      ║
║  GITHUB:     GitHub Actions (automatique)                      ║
║              - Validate                                        ║
║              - Version bump                                    ║
║              - Publish to Homey App Store                      ║
║                         ↓                                      ║
║  RESULT:     ✅ App published automatiquement!                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🔧 COMMANDES LOCALES (Développement)

### ✅ CE QU'ON DOIT UTILISER EN LOCAL:

```bash
# 1. Build l'app (optionnel mais recommandé)
homey app build

# 2. Valider avant commit (OBLIGATOIRE)
homey app validate --level publish

# 3. Si validation OK → Commit & Push
git add -A
git commit -m "Votre message de commit"
git push origin master

# ✅ GitHub Actions prend le relais automatiquement!
```

---

## ❌ CE QU'ON NE DOIT JAMAIS UTILISER EN LOCAL:

```bash
❌ homey app publish              # GitHub Actions le fait!
❌ homey app version patch        # GitHub Actions le fait!
❌ homey app version minor        # GitHub Actions le fait!
❌ homey app version major        # GitHub Actions le fait!
```

**Pourquoi?**
- GitHub Actions utilise les **actions officielles Athom**
- Version bump et publish sont **automatiques**
- Évite les conflits de version
- Garantit un workflow propre et reproductible

---

## 🤖 GITHUB ACTIONS WORKFLOW

### Fichier: `.github/workflows/homey-official-publish.yml`

**Triggered by:**
- ✅ Push vers `master`
- ✅ Manual dispatch (via GitHub UI)

**Jobs exécutés:**

#### 1. **Validate** (Job 1)
```yaml
uses: athombv/github-action-homey-app-validate@master
with:
  level: debug
```
- ✅ Valide l'app avec niveau debug
- ✅ Vérifie app.json, manifests, drivers
- ✅ Bloque si erreurs

#### 2. **Version** (Job 2)
```yaml
uses: athombv/github-action-homey-app-version@master
with:
  version: patch
  changelog: "Automated release"
```
- ✅ Bump version automatiquement (patch)
- ✅ Update app.json
- ✅ Create Git tag
- ✅ Create GitHub release
- ✅ Commit & push changes

#### 3. **Publish** (Job 3)
```yaml
uses: athombv/github-action-homey-app-publish@master
with:
  personal_access_token: ${{ secrets.HOMEY_TOKEN }}
```
- ✅ Publish to Homey App Store
- ✅ Utilise HOMEY_TOKEN (secrets)
- ✅ Notification de succès/échec

---

## 📊 TIMELINE D'UN PUSH

```
T+0s    : git push origin master
T+5s    : GitHub Actions détecte le push
T+10s   : Job 1 (Validate) démarre
T+45s   : Job 1 ✅ Success
T+50s   : Job 2 (Version) démarre
T+1m20s : Job 2 ✅ Success (version: 2.15.129)
T+1m30s : Job 3 (Publish) démarre
T+2m45s : Job 3 ✅ Success (published!)
T+3m00s : ✅ App live sur Homey App Store!
```

**Total: ~3 minutes de la push à la publication!** ⚡

---

## 🎯 EXEMPLE WORKFLOW COMPLET

### Scénario: Fixer un bug IAS Zone

```bash
# 1. Faire les modifications en local
# (Éditer lib/IASZoneEnroller.js, etc.)

# 2. Tester en local
homey app build
homey app validate --level publish
# Output: ✓ App validated successfully against level `publish`

# 3. Commit les changements
git add -A
git commit -m "Fix: IAS Zone enrollment avec méthode officielle Homey"

# 4. Push vers GitHub
git push origin master

# 5. Observer GitHub Actions
# URL: https://github.com/dlnraja/com.tuya.zigbee/actions

# 6. Attendre ~3 minutes
# GitHub Actions fait:
#   ✅ Validate
#   ✅ Version 2.15.128 → 2.15.129
#   ✅ Publish to Homey App Store

# 7. Vérifier la publication
# URL: https://tools.developer.homey.app/apps
# Version: 2.15.129 ✅ LIVE!
```

---

## 🔍 MONITORING GITHUB ACTIONS

### Via CLI:
```bash
# Lister les runs récents
gh run list --limit 5

# Voir le statut du dernier run
gh run list --workflow=homey-official-publish.yml --limit 1

# Voir les logs d'un run
gh run view <run-id> --log
```

### Via Web:
```
https://github.com/dlnraja/com.tuya.zigbee/actions
```

---

## 🛠️ CONFIGURATION SECRETS

### Required Secret: `HOMEY_TOKEN`

**Où le trouver:**
1. Aller sur: https://tools.developer.homey.app/tools/tokens
2. Créer un Personal Access Token
3. Copier le token
4. Aller dans: Settings → Secrets → Actions
5. Créer secret: `HOMEY_TOKEN` = votre token

**Déjà configuré:** ✅ (sinon le publish ne fonctionnerait pas)

---

## 📝 PATHS IGNORÉS

GitHub Actions **NE SE DÉCLENCHE PAS** pour:

```yaml
paths-ignore:
  - '**.md'           # Fichiers Markdown
  - 'docs/**'         # Documentation
  - 'reports/**'      # Reports
  - 'scripts/**'      # Scripts
  - 'project-data/**' # Data files
```

**Pourquoi?**
- Évite les builds inutiles pour la doc
- Économise les minutes GitHub Actions
- Focus sur les changements de code

---

## 🎓 AVANTAGES DE CE WORKFLOW

### ✅ Avantages:

1. **Automatique:** Push → Publish (0 intervention)
2. **Officiel:** Utilise les actions Athom
3. **Reproductible:** Même workflow pour tous
4. **Versionné:** Git tags automatiques
5. **Sécurisé:** Token dans secrets
6. **Rapide:** ~3 minutes total
7. **Propre:** Pas de pollution locale
8. **CI/CD:** Intégration continue

### ❌ Inconvénients (si on utilisait CLI local):

1. ❌ Conflits de version
2. ❌ Dépendance à la machine locale
3. ❌ Pas de traçabilité Git
4. ❌ Risque d'oubli de steps
5. ❌ Pas reproductible
6. ❌ Token exposé localement

---

## 🚨 TROUBLESHOOTING

### ❌ Publish Failed

**Vérifier:**
1. ✅ HOMEY_TOKEN valide dans secrets?
2. ✅ homey app validate passe en local?
3. ✅ Pas de fichiers .gitignore manquants?
4. ✅ GitHub Actions logs pour détails

### ❌ Version Conflict

**Solution:**
```bash
# Pull les changements GitHub Actions
git pull origin master

# Vérifier la version
cat app.json | grep version

# Continuer le dev
```

### ❌ Validation Failed

**Solution:**
```bash
# Tester en local
homey app validate --level publish

# Fixer les erreurs
# Re-commit & push
```

---

## 📚 RÉFÉRENCES

### Actions Officielles Athom:
- `athombv/github-action-homey-app-validate@master`
- `athombv/github-action-homey-app-version@master`
- `athombv/github-action-homey-app-publish@master`

### Documentation:
- GitHub Actions: https://docs.github.com/en/actions
- Homey Apps SDK: https://apps.developer.homey.app
- Homey Developer Tools: https://tools.developer.homey.app

---

## ✅ CHECKLIST DÉVELOPPEUR

Avant chaque push:

- [ ] `homey app build` ✅
- [ ] `homey app validate --level publish` ✅
- [ ] Tests fonctionnels OK ✅
- [ ] Commit message clair ✅
- [ ] `git push origin master` ✅
- [ ] Observer GitHub Actions ✅
- [ ] Vérifier publication (3-5 min) ✅

**NE PAS:**
- [ ] ❌ `homey app publish`
- [ ] ❌ `homey app version`

---

## 🎯 RÉSUMÉ

### Workflow en 3 étapes:

```bash
# 1. LOCAL
homey app validate --level publish

# 2. GIT
git add -A && git commit -m "Message" && git push origin master

# 3. GITHUB ACTIONS (automatique)
# ✅ Validate → Version → Publish → Done!
```

**C'est tout!** 🎉

---

**Repository:** https://github.com/dlnraja/com.tuya.zigbee  
**Workflow File:** `.github/workflows/homey-official-publish.yml`  
**Actions URL:** https://github.com/dlnraja/com.tuya.zigbee/actions  
**Developer Dashboard:** https://tools.developer.homey.app/apps
