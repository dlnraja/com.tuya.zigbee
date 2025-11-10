# 🚀 PUBLICATION RAPIDE VIA GITHUB ACTIONS

## ✅ MÉTHODE RECOMMANDÉE - EN 3 CLICS!

### 📍 Étape 1: Ouvrir GitHub Actions

**URL Directe**: https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/homey-official-publish.yml

Ou naviguer:
1. Aller sur https://github.com/dlnraja/com.tuya.zigbee
2. Cliquer sur l'onglet **"Actions"** (en haut)
3. Dans la liste à gauche, cliquer **"Homey App - Official Publish"**

---

### 📍 Étape 2: Lancer le Workflow

```
1. Cliquer sur le bouton "Run workflow" (bleu, en haut à droite)
2. Vérifier que "Branch: master" est sélectionné
3. Cliquer sur "Run workflow" (vert)
```

**C'EST TOUT!** 🎉

---

### 📍 Étape 3: Suivre la Publication

Le workflow va s'exécuter automatiquement (~3-5 minutes):

```
✅ Job 1: Validate App (30 secondes)
   - Checkout code
   - Install dependencies
   - Validate Homey app

✅ Job 2: Auto-Increment Version (60 secondes)
   - Version actuelle: 4.9.81
   - Nouvelle version: 4.9.82
   - Update changelog
   - Commit + Push [skip ci]
   - Create GitHub Release

✅ Job 3: Publish to Homey Store (2-3 minutes)
   - Checkout latest version
   - Install Homey CLI
   - Publish app avec HOMEY_PAT
   - 🎉 SUCCESS!
```

**Vous verrez les logs en temps réel sur la page.**

---

## 🎯 RÉSULTAT ATTENDU

### ✅ Si Tout Fonctionne

```
🎉 ===== HOMEY APP PUBLISHED SUCCESSFULLY =====
Version: 4.9.82
Dashboard: https://tools.developer.homey.app/apps
================================================
```

**Vérifier sur**:
- ✅ Homey Developer Dashboard: https://tools.developer.homey.app/apps
- ✅ GitHub Releases: https://github.com/dlnraja/com.tuya.zigbee/releases
- ✅ Homey App Store: https://homey.app/apps/com.dlnraja.tuya.zigbee

**Délai de publication**: 5-10 minutes après validation Athom

---

### ❌ Si Échec

#### Erreur: "HOMEY_PAT not found"

**Solution**:
1. Générer un token: https://tools.developer.homey.app/tools/cli
2. Ajouter sur GitHub:
   - Settings → Secrets and variables → Actions → New repository secret
   - Name: `HOMEY_PAT`
   - Secret: `homey_pat_...` (votre token)
   - Add secret

#### Erreur: "Validation failed"

**Solution**:
```bash
# Tester localement d'abord
npm run validate
homey app validate --level publish
```

#### Erreur: "Publish failed"

**Causes possibles**:
- Token expiré → Générer nouveau token
- Version déjà publiée → Workflow auto-incrémente normalement
- Quota Homey dépassé → Attendre 24h

---

## 🔄 WORKFLOW AUTOMATIQUE (SANS INTERVENTION)

Le workflow se déclenche **automatiquement** sur chaque push master:

```bash
# Dans votre terminal local
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin master

# GitHub Actions se déclenche automatiquement:
# 1. Validate
# 2. Auto-increment version
# 3. Publish
# 🎉 Fait!
```

**SAUF** si les changements sont dans:
- Documentation (`.md`, `docs/`)
- Scripts (`scripts/`)
- Reports (`reports/`)
- Project data (`project-data/`)

Ces changements ne déclenchent **PAS** de publication (pas nécessaire).

---

## 📊 COMMANDES UTILES

### Voir les Workflows Récents

```bash
# Installer GitHub CLI (si pas déjà fait)
# https://cli.github.com/

# Voir les 5 dernières exécutions
gh run list --workflow="homey-official-publish.yml" --limit 5

# Voir les logs de la dernière exécution
gh run view --log

# Voir le statut en temps réel
gh run watch
```

### URLs Rapides

```
Actions:     https://github.com/dlnraja/com.tuya.zigbee/actions
Workflow:    https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/homey-official-publish.yml
Homey Apps:  https://tools.developer.homey.app/apps
Create PAT:  https://tools.developer.homey.app/tools/cli
Releases:    https://github.com/dlnraja/com.tuya.zigbee/releases
```

---

## 💡 ASTUCES

### Publication Immédiate

```bash
# Commit + Push pour déclencher workflow
git add .
git commit -m "chore: trigger publish"
git push origin master

# Ou via interface web GitHub:
# Actions → Homey App - Official Publish → Run workflow
```

### Forcer Nouvelle Version

Le workflow incrémente **automatiquement** la version patch:
- 4.9.81 → 4.9.82
- 4.9.82 → 4.9.83
- etc.

**Si vous voulez minor/major**:
1. Modifier `.github/workflows/homey-official-publish.yml`
2. Ligne 69: `version: patch` → `version: minor` ou `version: major`
3. Commit + Push

---

## 🎯 COMPARAISON: LOCAL vs GITHUB ACTIONS

| Feature | Local | GitHub Actions |
|---------|-------|----------------|
| **Version increment** | ❌ Prompt manuel | ✅ Auto (patch) |
| **Validation** | ⚠️ Optionnelle | ✅ Obligatoire |
| **Changelog** | ❌ Manuel | ✅ Auto-généré |
| **GitHub Release** | ❌ Non créé | ✅ Auto-créé |
| **Commit version** | ❌ Manuel | ✅ Auto-commit |
| **Conflits Git** | ⚠️ Possibles | ✅ Retry logic |
| **Logs** | ❌ Console locale | ✅ GitHub (permanent) |
| **Délai** | ~2 min | ~3-5 min |

**Verdict**: GitHub Actions = Méthode professionnelle recommandée! 🏆

---

## 🚀 ACTION IMMÉDIATE

### 🔥 Publier MAINTENANT v4.9.82

**3 secondes pour déclencher**:

1. Ouvrir: https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/homey-official-publish.yml
2. Cliquer: "Run workflow"
3. Cliquer: "Run workflow" (confirmation)

**C'EST PARTI!** 🎉

Le workflow fait le reste automatiquement.

---

## 📝 CHECKLIST PRÉ-PUBLICATION

Avant de lancer le workflow, vérifier:

- ✅ Tous les changements committé et pushé
- ✅ Tests locaux passent (`npm test` si existants)
- ✅ Validation locale OK (`npm run validate`)
- ✅ Changelog à jour (auto-généré par workflow)
- ✅ Secret `HOMEY_PAT` configuré

**Prêt?** Lancez le workflow! 🚀

---

## 🎉 RÉSUMÉ

**Publication GitHub Actions en 3 CLICS**:
1. 🌐 Ouvrir Actions page
2. ▶️ Run workflow
3. ⏱️ Attendre 3-5 min

**Résultat**:
- ✅ Version: 4.9.81 → 4.9.82
- ✅ GitHub Release créé
- ✅ Publié sur Homey Store
- ✅ Changelog mis à jour
- ✅ Logs complets disponibles

**C'est la méthode PRO!** 🏆
