# 🏷️ Système Auto-Tag

## 📋 Description

Ce système crée **automatiquement un tag Git** à chaque commit sur `master` qui modifie la version dans `app.json`, **déclenchant ainsi la publication automatique sur Homey App Store**.

---

## 🎯 Fonctionnement

```
┌─────────────────────────────────────────────────────────────┐
│  COMMIT PUSH sur master                                     │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Workflow: auto-tag.yml                                     │
│                                                             │
│  1️⃣ Lit version dans app.json                              │
│  2️⃣ Vérifie si tag v{version} existe déjà                  │
│  3️⃣ Vérifie si seulement docs changées                     │
│  4️⃣ Vérifie si version a changé                            │
│                                                             │
│  SI toutes conditions OK:                                   │
│    ✅ Crée tag v{version}                                   │
│    ✅ Push tag vers GitHub                                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Workflow: homey-publish.yml                                │
│  (Déclenché par le nouveau tag)                             │
│                                                             │
│  1️⃣ Validate app structure                                 │
│  2️⃣ Build Homey app                                        │
│  3️⃣ Validate (publish level)                               │
│  4️⃣ Publish to Homey App Store                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
                   ✅ PUBLIÉ!
```

---

## ⚙️ Conditions de Création de Tag

Le tag est créé **UNIQUEMENT** si:

### ✅ 1. Tag n'existe pas déjà
```bash
# Vérifie: git rev-parse v4.9.313
# Si existe → SKIP
```

### ✅ 2. Pas seulement de la documentation
Ignore les commits qui modifient uniquement:
- `*.md` (README, CHANGELOG, etc.)
- `*.txt`
- `docs/**`
- `LICENSE`
- `.github/ISSUE_TEMPLATE/**`
- `.github/PULL_REQUEST_TEMPLATE/**`

### ✅ 3. Version a changé dans app.json
```javascript
// Compare app.json HEAD vs HEAD~1
AVANT: "version": "4.9.312"
APRÈS: "version": "4.9.313"  // ✅ Changé → Crée tag
```

---

## 📊 Exemples

### Exemple 1: Version bumped + Code changé ✅

```bash
# Commit
git add app.json lib/SmartDriverAdaptation.js
git commit -m "feat: Add data collection"
git push

# Auto-tag détecte:
✅ Version: 4.9.313 (changée)
✅ Code modifié: lib/SmartDriverAdaptation.js
✅ Tag n'existe pas

→ Crée tag v4.9.313
→ Push tag
→ Déclenche homey-publish.yml
→ Publie sur Homey App Store
```

### Exemple 2: Seulement doc changée ⏭️

```bash
# Commit
git add README.md docs/guide.md
git commit -m "docs: Update README"
git push

# Auto-tag détecte:
✅ Version: 4.9.313 (inchangée)
⚠️  Seulement docs changées
⏭️  SKIP - Pas de tag créé
```

### Exemple 3: Version inchangée ⏭️

```bash
# Commit
git add lib/utils/helper.js
git commit -m "fix: Minor bug fix"
git push

# Auto-tag détecte:
⚠️  Version: 4.9.313 (inchangée)
⏭️  SKIP - Pas de tag créé

# Note: Si tu veux publier, il faut bump la version!
```

### Exemple 4: Tag existe déjà ⏭️

```bash
# Commit avec version déjà taguée
git push

# Auto-tag détecte:
⚠️  Tag v4.9.313 existe déjà
⏭️  SKIP - Pas de tag créé
```

---

## 🔧 Workflow Standard

### Pour une nouvelle version:

```bash
# 1. Bump version dans app.json
vim app.json  # Change "version": "4.9.313" → "4.9.314"

# 2. Modifie le code
vim lib/SmartDriverAdaptation.js

# 3. Update changelog
vim .homeychangelog.json  # Ajoute entrée pour 4.9.314

# 4. Commit & push
git add app.json lib/SmartDriverAdaptation.js .homeychangelog.json
git commit -m "feat: New feature v4.9.314"
git push

# ✅ Auto-tag va:
#    - Détecter version 4.9.314
#    - Créer tag v4.9.314
#    - Push tag
#    - Déclencher publication automatique
```

---

## 📝 Logs du Workflow

Tu peux suivre l'exécution ici:
- **GitHub Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/auto-tag.yml

Exemple de sortie:
```
📊 Auto-Tag Summary:
====================

Version: 4.9.313
Tag exists: false
Docs only: false
Version changed: true

✅ Tag v4.9.313 created and pushed!
🚀 Homey publish workflow triggered
```

---

## 🚨 Si Auto-Tag Ne Fonctionne Pas

### Problème: Tag non créé

**Causes possibles:**
1. ✅ **Version inchangée** dans app.json
   - Solution: Bump la version
   
2. ✅ **Seulement docs modifiées**
   - Solution: Normal, pas besoin de publier
   
3. ✅ **Tag existe déjà**
   - Solution: Bump la version pour nouveau tag

### Problème: Tag créé mais pas de build

**Causes possibles:**
1. ✅ **HOMEY_PAT secret manquant**
   - Vérifier: GitHub → Settings → Secrets → HOMEY_PAT
   
2. ✅ **Workflow homey-publish.yml désactivé**
   - Vérifier: Actions → Workflows → Enable

---

## 🔒 Sécurité

Le workflow utilise:
- `GITHUB_TOKEN` (automatique) pour créer/push tags
- `HOMEY_PAT` (secret) pour publier sur Homey App Store

**Aucun secret exposé dans les logs.**

---

## 🎛️ Configuration

### Désactiver auto-tag temporairement

Option 1: Ajouter `[skip ci]` au commit message
```bash
git commit -m "fix: Minor change [skip ci]"
```

Option 2: Désactiver le workflow
```yaml
# .github/workflows/auto-tag.yml
# Commenter la section on: push:
```

### Modifier patterns d'exclusion docs

```yaml
# .github/workflows/auto-tag.yml
on:
  push:
    paths-ignore:
      - '**.md'           # Tous les .md
      - 'docs/**'         # Dossier docs
      - 'guides/**'       # Ajouter guides
      - 'examples/**'     # Ajouter examples
```

---

## 📊 Statistiques

Depuis l'activation du système:
- ✅ Tags créés automatiquement
- ✅ Publications déclenchées
- ✅ Temps gagné: ~5 min par release

---

## 🆘 Support

Si problème:
1. Vérifier logs: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Vérifier version dans app.json
3. Vérifier que tag n'existe pas: `git tag -l`
4. Créer tag manuellement si besoin:
   ```bash
   git tag -a v4.9.314 -m "Manual tag"
   git push origin v4.9.314
   ```

---

## 🎉 Avantages

✅ **Automatique:** Pas besoin de créer tags manuellement  
✅ **Fiable:** Vérifie conditions avant de créer tag  
✅ **Intelligent:** Skip si seulement docs changées  
✅ **Rapide:** Publication déclenchée immédiatement  
✅ **Traçable:** Logs clairs dans GitHub Actions  
✅ **Sécurisé:** Utilise tokens GitHub officiels  

---

**Note:** Ce système a été créé suite à l'incident où les versions 4.9.311, 4.9.312, 4.9.313 n'ont pas été publiées car les tags n'avaient pas été créés. Maintenant, c'est automatique! 🎉
