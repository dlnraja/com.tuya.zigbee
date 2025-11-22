# 🗂️ PLAN DE RÉORGANISATION DU PROJET

**Date:** 2025-11-20
**Objectif:** Simplifier et optimiser la structure du projet

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. **Trop de Dossiers** (80+ dossiers racine!)
- Structure illisible et difficile à maintenir
- Duplications nombreuses
- Fichiers éparpillés sans logique claire

### 2. **Dossiers Énormes**
- `.dev`: 249 MB (14,210 fichiers) ⚠️
- `docs`: 264 MB (1,138 fichiers) ⚠️
- `support`: 133 MB (21 fichiers)
- `.backup-enrichment`: 50 MB (1,697 fichiers)

### 3. **Duplications**
- Backups multiples: `.backup-enrichment`, `backup`, `lib_backup_*`
- Docs multiples: `docs`, `support`, `archive`, `references`
- Forums multiples: `forum`, `forum_requests`, `forum-responses`
- Diagnostics multiples: `diagnostic-reports`, `diagnostics`
- Planning multiples: `planning`, `planning_v5`

### 4. **Dossiers Temporaires**
- `.homeybuild`: Build temporaire
- `.dev`: Dev temporaire
- `test`, `tests`: Tests éparpillés

---

## ✅ STRUCTURE CIBLE (Simplifiée)

```
tuya_repair/
├── .github/              # GitHub Actions (existant)
├── .vscode/              # VS Code config (existant)
├── .homeychangelog.json  # Changelog Homey (existant)
├── .homeyignore          # Ignore Homey (existant)
├── app.json              # App manifest (existant)
├── package.json          # Dependencies (existant)
│
├── drivers/              # Drivers Zigbee (CONSERVER)
├── lib/                  # Librairies core (CONSERVER)
├── locales/              # Traductions (CONSERVER)
├── assets/               # Images, icônes (CONSERVER)
├── api/                  # API modules (CONSERVER si utilisé)
│
├── .archive/             # 🆕 TOUT consolider ici
│   ├── backups/          # Tous les backups
│   ├── old-docs/         # Anciennes docs
│   ├── old-scripts/      # Anciens scripts
│   ├── research/         # Recherches et analyses
│   └── temp/             # Fichiers temporaires
│
├── .analysis/            # 🆕 Analyses et rapports
│   ├── pdfs/             # Analyse PDFs
│   ├── github/           # Analyse GitHub
│   ├── diagnostics/      # Rapports diagnostics
│   └── reports/          # Rapports divers
│
├── scripts/              # 🆕 Scripts utilitaires ACTIFS
│   ├── enrichment/       # Scripts enrichissement
│   ├── validation/       # Scripts validation
│   └── automation/       # Scripts automation
│
├── docs/                 # 🆕 Documentation ACTIVE uniquement
│   ├── README.md         # Readme principal
│   ├── CHANGELOG.md      # Changelog détaillé
│   ├── CONTRIBUTING.md   # Guide contribution
│   └── guides/           # Guides utilisateur
│
└── .gitignore            # Git ignore
```

---

## 📋 ACTIONS À EFFECTUER

### Phase 1: CRÉER STRUCTURE CIBLE ✅

```bash
mkdir -p .archive/{backups,old-docs,old-scripts,research,temp}
mkdir -p .analysis/{pdfs,github,diagnostics,reports}
mkdir -p scripts/{enrichment,validation,automation}
mkdir -p docs/guides
```

### Phase 2: DÉPLACER & CONSOLIDER 🔄

#### A. Archives (Déplacer vers `.archive/`)

**Backups:**
```bash
.backup-enrichment → .archive/backups/enrichment
backup → .archive/backups/misc
lib_backup_* → .archive/backups/lib
```

**Anciennes docs:**
```bash
archive → .archive/old-docs/archive
support → .archive/old-docs/support (SI non utilisé)
references → .archive/old-docs/references
readme-variants → .archive/old-docs/readme-variants
```

**Anciens scripts:**
```bash
automation → .archive/old-scripts/automation (si obsolète)
tools → .archive/old-scripts/tools (si obsolète)
utils → .archive/old-scripts/utils (si obsolète)
```

**Recherches:**
```bash
research → .archive/research/
github-analysis → .archive/research/github
github-issues → .archive/research/issues
scraped_data → .archive/research/scraped
project-data → .archive/research/project-data
```

**Temporaires:**
```bash
.dev → .archive/temp/dev
.homeybuild → .archive/temp/homeybuild (ou SUPPRIMER)
test → .archive/temp/test
tests → .archive/temp/tests
```

#### B. Analyses (Déplacer vers `.analysis/`)

```bash
pdf_analysis → .analysis/pdfs/
pdfhomey → .analysis/pdfs/sources/
diagnostic-reports → .analysis/diagnostics/reports/
diagnostics → .analysis/diagnostics/data/
reports → .analysis/reports/
audit → .analysis/reports/audit/
audits → .analysis/reports/audits/
stats → .analysis/reports/stats/
```

#### C. Scripts Actifs (Consolider dans `scripts/`)

**Enrichment:**
```bash
enrichment/* → scripts/enrichment/
extract_pdfs.py → scripts/enrichment/
enrich_from_pdfs.js → scripts/enrichment/
```

**Validation:**
```bash
validation → scripts/validation/
```

**Automation:**
```bash
workflow → scripts/automation/workflow/
orchestrator → scripts/automation/orchestrator/
```

#### D. Documentation Active (Nettoyer `docs/`)

**Garder uniquement:**
- README.md (principal)
- CHANGELOG.md
- CONTRIBUTING.md
- guides/ (guides utilisateur essentiels)

**Déplacer le reste vers `.archive/old-docs/`**

#### E. SUPPRIMER Dossiers Temporaires/Obsolètes

```bash
# Build temporaires
.homeybuild → SUPPRIMER (regeneré automatiquement)

# Dossiers quasi-vides ou inutiles
achievements → SUPPRIMER ou .archive
analysis (quasi-vide) → .archive
compatibility → .archive
contributions → .archive
conversion → .archive
debug → .archive
deployments → .archive
finalization → .archive
forum → .archive (si obsolète)
forum_requests → .archive
forum-responses → .archive
implementation → .archive
instructions → .archive/old-docs
matrix → .archive
misc → .archive
organized → .archive
pairing → .archive/old-docs
planning → .archive
planning_v5 → .archive
project-status → .archive
releases → .archive/old-docs
run-everything → .archive
sdk3 → .archive
sessions → .archive
summaries → .archive
technical → .archive
templates → .archive
troubleshooting → .archive/old-docs
ultimate_system → .archive
users → .archive
v3 → .archive
```

### Phase 3: METTRE À JOUR `.homeyignore` 🔒

```
.archive/
.analysis/
scripts/
docs/
*.md
!README.md
!CHANGELOG.md
.git*
node_modules/
.vscode/
.DS_Store
*.log
package-lock.json
```

### Phase 4: NETTOYER & VALIDER ✅

1. Supprimer doublons
2. Vérifier que l'app fonctionne
3. Valider avec `homey app validate`
4. Tester build: `homey app build`
5. Vérifier taille finale

---

## 🎯 RÉSULTAT ATTENDU

### Avant
```
80+ dossiers racine
~900 MB de fichiers
Structure illisible
```

### Après
```
15-20 dossiers racine
~50-100 MB (hors archives)
Structure claire et logique
```

### Bénéfices
- ✅ Navigation facile
- ✅ Maintenance simplifiée
- ✅ Build plus rapide
- ✅ Git plus propre
- ✅ Déploiement optimisé

---

## ⚠️ PRÉCAUTIONS

1. **NE PAS TOUCHER:**
   - `drivers/`
   - `lib/` (core)
   - `locales/`
   - `assets/`
   - `app.json`
   - `package.json`
   - `.github/`

2. **BACKUP AVANT:**
   - Commit actuel
   - Tag de sécurité
   - Export complet du projet

3. **TESTER APRÈS:**
   - `homey app validate`
   - `homey app build`
   - Test sur Homey (si possible)

---

## 📝 COMMANDES D'EXÉCUTION

### Sécurité
```bash
git add .
git commit -m "chore: Backup before reorganization"
git tag reorganization-backup
```

### Réorganisation
```bash
# Créer structure
mkdir -p .archive/{backups,old-docs,old-scripts,research,temp}
mkdir -p .analysis/{pdfs,github,diagnostics,reports}
mkdir -p scripts/{enrichment,validation,automation}

# Déplacer (exemples)
mv .backup-enrichment .archive/backups/enrichment
mv pdf_analysis .analysis/pdfs/
mv extract_pdfs.py scripts/enrichment/
# ... (voir script automation)

# Nettoyer
rm -rf .homeybuild
rm -rf .dev

# Valider
homey app validate --level publish
```

---

**À EXÉCUTER UNIQUEMENT APRÈS VALIDATION UTILISATEUR**
