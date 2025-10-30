# 📁 .homeycompose/ Management Strategy

**Date:** 2025-10-21  
**Status:** 🔒 PRODUCTION STRATEGY

---

## 🎯 STRATÉGIE: .homeycompose/ dans .gitignore

### ✅ POURQUOI C'EST INTENTIONNEL

#### 1. **Évite Problèmes de Cache Homey**
```
❌ SANS gitignore:
- Cache conflicts entre local et remote
- Homey CLI peut utiliser versions obsolètes
- Build inconsistencies

✅ AVEC gitignore:
- Homey rebuild toujours depuis source
- Aucun conflit de cache
- Build déterministe
```

#### 2. **Réduit Taille du Repo Git**
```
📊 Taille typique .homeycompose/:
- app.json: ~300KB
- flow/actions/*.json: ~500KB
- flow/triggers/*.json: ~800KB
- flow/conditions/*.json: ~400KB
- TOTAL: ~2-3MB

❌ Problème si committed:
- Chaque commit duplique ces fichiers
- Historique Git devient énorme
- Push/pull très lents

✅ Solution gitignore:
- Seulement app.json (généré) est committed
- Historique Git reste léger
- Push/pull rapides
```

#### 3. **Évite Conflits de Merge**
```
❌ SANS gitignore:
- Merge conflicts fréquents dans flow files
- Difficile de résoudre (JSON formatté)
- Risque de casser app.json

✅ AVEC gitignore:
- Seulement app.json peut avoir conflicts
- Facile à résoudre (rebuild depuis .homeycompose/)
- Structure garantie valide
```

---

## 🔄 WORKFLOW DE SYNCHRONISATION

### Workflow Standard

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DÉVELOPPEMENT                                            │
│    - Modifier .homeycompose/app.json                        │
│    - Modifier .homeycompose/flow/actions/*.json             │
│    - Modifier drivers/*/driver.compose.json                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SYNC                                                      │
│    node scripts/sync/SYNC_HOMEYCOMPOSE.js                   │
│    OU                                                        │
│    homey app build                                          │
│    → Génère app.json depuis .homeycompose/                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. VALIDATION                                                │
│    homey app validate --level publish                       │
│    → Vérifie app.json généré                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. COMMIT                                                    │
│    git add app.json                                         │
│    git commit -m "feat: ..."                                │
│    → Seulement app.json est committed                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PUSH (avec checks)                                        │
│    .\scripts\git\PUSH_WITH_SIZE_CHECK.ps1                   │
│    → Vérifie taille, sync, puis push                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ OUTILS CRÉÉS

### 1. `scripts/sync/SYNC_HOMEYCOMPOSE.js`

**Fonction:** Rebuild app.json depuis .homeycompose/

```bash
# Usage
node scripts/sync/SYNC_HOMEYCOMPOSE.js

# Ce qu'il fait:
✅ Vérifie existence .homeycompose/
✅ Backup app.json actuel
✅ Execute homey app build
✅ Vérifie app.json généré
✅ Restore backup si erreur
```

**Quand l'utiliser:**
- Après toute modification dans `.homeycompose/`
- Avant de committer
- Si app.json semble obsolète

### 2. `scripts/git/CHECK_HUGE_FILES.js`

**Fonction:** Détecte fichiers trop gros avant push

```bash
# Usage
node scripts/git/CHECK_HUGE_FILES.js

# Limites:
⚠️  WARNING: > 50MB
❌ ERROR: > 100MB (GitHub reject)
📊 INFO: Taille totale repo

# Exit codes:
0 = OK (peut push)
1 = ERREUR (ne peut pas push)
```

**Fichiers toujours ignorés:**
- `.git/`
- `node_modules/`
- `.homeybuild/`
- `.homeycompose/` ← **INTENTIONNEL**
- `backup/`, `.dev/`, `archive_old/`

### 3. `scripts/git/PUSH_WITH_SIZE_CHECK.ps1`

**Fonction:** Git push intelligent avec checks automatiques

```powershell
# Usage basique
.\scripts\git\PUSH_WITH_SIZE_CHECK.ps1

# Options
.\scripts\git\PUSH_WITH_SIZE_CHECK.ps1 -Branch develop
.\scripts\git\PUSH_WITH_SIZE_CHECK.ps1 -Force
.\scripts\git\PUSH_WITH_SIZE_CHECK.ps1 -SkipSizeCheck

# Process:
1. ✅ Sync .homeycompose/ → app.json
2. ✅ Check huge files (< 100MB)
3. ✅ Check git status
4. ✅ Push avec auto-retry si needed
```

**Features:**
- Auto-sync avant push
- Détection huge files
- Auto-rebase si non-fast-forward
- Smart error handling

### 4. `.github/workflows/homey-publish-enhanced.yml`

**Fonction:** GitHub Actions avec size checks

```yaml
# Jobs:
1. preflight:
   - Check huge files
   - Validate app.json exists
   - Homey validate (publish level)

2. build:
   - Test build
   - Report build size

3. publish:
   - Auto-publish si version nouvelle
   - Create GitHub release

4. notify:
   - Report status
```

---

## 📊 GESTION DES HUGE FILES

### Limites GitHub

| Type | Taille | Action |
|------|--------|--------|
| **Warning** | > 50MB | Alerte mais accepte |
| **Reject** | > 100MB | Rejette push |
| **Repo Max** | > 1GB | Problèmes performance |

### Solutions Automatiques

#### Option 1: .gitignore (Recommandé)
```bash
# Ajouter à .gitignore
echo "path/to/large/file" >> .gitignore
git rm --cached path/to/large/file
```

#### Option 2: Git LFS (Large File Storage)
```bash
# Installer Git LFS
git lfs install

# Track large files
git lfs track "*.zip"
git lfs track "*.tar.gz"
git lfs track "backup/**"

# Commit .gitattributes
git add .gitattributes
git commit -m "chore: Add Git LFS tracking"
```

#### Option 3: Compression
```bash
# Compresser avant commit
gzip largefile.json
# Resultat: largefile.json.gz (beaucoup plus petit)
```

#### Option 4: Split Files
```javascript
// Split large JSON
const data = require('./huge.json');
const chunks = [];
const chunkSize = 1000;

for (let i = 0; i < data.length; i += chunkSize) {
  chunks.push(data.slice(i, i + chunkSize));
}

chunks.forEach((chunk, i) => {
  fs.writeFileSync(`data-part${i}.json`, JSON.stringify(chunk));
});
```

---

## 🔒 FICHIERS DÉJÀ DANS .gitignore

### Configuration Actuelle

```gitignore
# Homey build artifacts (cache issues)
.homeybuild/
.homeycompose/  ← INTENTIONNEL POUR CACHE + TAILLE

# Large backups (repo size)
backup/
.dev/
archive_old/
dumps/
temp_clones/

# Large docs (generated)
*_REPORT*.md
*_STATUS*.md
*_SUMMARY*.md

# Temporary files
*.tmp
*.log
*.bak
```

### Pourquoi .homeycompose/ Est Ignoré

```
✅ AVANTAGES:
1. Évite cache conflicts (CRITIQUE)
2. Réduit taille repo (~2-3MB par commit)
3. Évite merge conflicts complexes
4. Force rebuild déterministe
5. Historique Git propre

❌ DÉSAVANTAGES:
Aucun! app.json (généré) contient tout

🎯 SOLUTION PARFAITE:
- .homeycompose/ local seulement
- app.json committed (source de vérité)
- Rebuild automatique avant publish
```

---

## 🚀 WORKFLOW GITHUB ACTIONS

### Pipeline Complet

```yaml
1. PRE-FLIGHT
   ├─ Check huge files
   ├─ Validate app.json
   └─ Homey validate --level publish

2. BUILD
   ├─ Test build
   └─ Report build size

3. PUBLISH
   ├─ Check version not already published
   ├─ Auto-publish to Homey App Store
   └─ Create GitHub Release

4. NOTIFY
   └─ Report all results
```

### Gestion .homeycompose/ dans CI

```yaml
# GitHub Actions n'a PAS .homeycompose/
# Car .gitignore l'exclut (INTENTIONNEL)

# Solution: app.json est déjà buildé et committed
steps:
  - name: Validate app.json exists
    run: |
      if [ ! -f "app.json" ]; then
        echo "❌ app.json not found!"
        echo "💡 Ensure app.json is committed"
        exit 1
      fi
```

---

## 📝 BEST PRACTICES

### ✅ À FAIRE

1. **Toujours sync avant commit**
   ```bash
   node scripts/sync/SYNC_HOMEYCOMPOSE.js
   git add app.json
   git commit -m "..."
   ```

2. **Utiliser le script de push intelligent**
   ```powershell
   .\scripts\git\PUSH_WITH_SIZE_CHECK.ps1
   ```

3. **Vérifier size avant gros commits**
   ```bash
   node scripts/git/CHECK_HUGE_FILES.js
   ```

4. **Garder .homeycompose/ local propre**
   ```bash
   # Si corrompu, rebuild:
   homey app build
   ```

### ❌ À ÉVITER

1. **Ne JAMAIS commit .homeycompose/**
   ```bash
   # Si accidentellement added:
   git rm -r --cached .homeycompose/
   ```

2. **Ne JAMAIS commit .homeybuild/**
   ```bash
   # Déjà dans .gitignore mais attention:
   git rm -r --cached .homeybuild/
   ```

3. **Ne PAS forcer push gros fichiers**
   ```bash
   # Au lieu de:
   git push --force
   
   # Utiliser:
   .\scripts\git\PUSH_WITH_SIZE_CHECK.ps1 -Force
   ```

4. **Ne PAS éditer app.json directement**
   ```bash
   # ❌ BAD:
   nano app.json  # Sera écrasé au rebuild
   
   # ✅ GOOD:
   nano .homeycompose/app.json
   node scripts/sync/SYNC_HOMEYCOMPOSE.js
   ```

---

## 🔧 TROUBLESHOOTING

### Problème: "app.json is outdated"

```bash
# Solution:
node scripts/sync/SYNC_HOMEYCOMPOSE.js
```

### Problème: "Push rejected: file too large"

```bash
# 1. Identifier le fichier:
node scripts/git/CHECK_HUGE_FILES.js

# 2. Choisir solution:
# Option A: Ajouter à .gitignore
echo "largefile.zip" >> .gitignore
git rm --cached largefile.zip

# Option B: Utiliser Git LFS
git lfs track "*.zip"
git add .gitattributes
```

### Problème: ".homeycompose/ est manquant"

```bash
# Si vous clonez le repo, .homeycompose/ n'existe pas (normal)
# app.json contient déjà tout

# Pour recréer .homeycompose/ (optionnel):
# 1. Créer structure de base
mkdir -p .homeycompose/flow/{actions,triggers,conditions}

# 2. Extraire depuis app.json
node scripts/extract/EXTRACT_COMPOSE.js  # (à créer si besoin)
```

### Problème: "Merge conflict in app.json"

```bash
# Solution simple:
# 1. Accepter une version (ours ou theirs)
git checkout --ours app.json
# OU
git checkout --theirs app.json

# 2. Rebuild depuis .homeycompose/ local
node scripts/sync/SYNC_HOMEYCOMPOSE.js

# 3. Continuer merge/rebase
git add app.json
git rebase --continue
```

---

## 📊 METRICS & MONITORING

### Taille Repo Recommandée

```
✅ OPTIMAL: < 100MB
🟡 ACCEPTABLE: 100-500MB
🟠 LOURD: 500MB-1GB
🔴 TROP GROS: > 1GB
```

### Vérifier Taille Actuelle

```bash
# Taille totale
du -sh .git

# Taille tracked files
node scripts/git/CHECK_HUGE_FILES.js

# Historique size par commit
git rev-list --objects --all |
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
  awk '/^blob/ {print substr($0,6)}' |
  sort --numeric-sort --key=2 |
  tail -20
```

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Configuration Actuelle

```
✅ .homeycompose/ dans .gitignore (INTENTIONNEL)
✅ app.json committed (généré depuis .homeycompose/)
✅ Scripts sync automatiques
✅ Pre-push size checks
✅ GitHub Actions avec validation
```

### Workflow Optimal

```
1. Modifier .homeycompose/
2. Sync → app.json
3. Validate
4. Commit app.json
5. Push avec size check
6. GitHub Actions auto-publish
```

### Bénéfices

```
✅ Cache Homey: Aucun problème
✅ Taille repo: Optimale (< 100MB)
✅ Merge conflicts: Minimisés
✅ Build: Déterministe
✅ CI/CD: Automatisé
```

---

**Créé:** 2025-10-21  
**Auteur:** Dylan Rajasekaram  
**Status:** 🔒 Production Strategy  
**Version:** 1.0.0
