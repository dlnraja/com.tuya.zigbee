# 🤖 Système d'Automation Autonome

## Vue d'Ensemble

Le système d'automation autonome se déclenche **automatiquement à chaque commit** et effectue:
1. ✅ Mise à jour du README.md avec les dernières stats
2. ✅ Mise à jour du README.txt (compatibilité)
3. ✅ Réorganisation intelligente des fichiers
4. ✅ Préservation des fichiers essentiels à la racine

## 🔄 Workflow Automatique

### Quand vous faites un commit:

```bash
node scripts/deployment/SAFE_PUSH_AND_PUBLISH.js
```

**Le système exécute automatiquement:**

```
STEP 0: 🤖 Automation
  ├─ README.md updated (version, stats, commits)
  ├─ README.txt created (compatibility)
  ├─ Files organized intelligently
  └─ Root kept clean

STEP 1: 🔒 Security (.homeycompose cleaned)
STEP 2: 📋 Validation (homey app validate)
STEP 3: 📊 Git Status
STEP 4: 💾 Git Stash
STEP 5: 🔄 Git Pull
STEP 6: 📤 Git Stash Pop
STEP 7: ➕ Git Add
STEP 8: 💬 Git Commit
STEP 9: 🚀 Git Push
STEP 10: ⚙️ GitHub Actions
```

## 📁 Organisation des Fichiers

### Fichiers Préservés à la Racine

Ces fichiers **RESTENT TOUJOURS** à la racine:
```
✅ README.md           # Documentation principale
✅ README.txt          # Compatibilité
✅ LICENSE             # Licence
✅ CHANGELOG.md        # Historique versions
✅ CONTRIBUTING.md     # Guide contribution
✅ .gitignore          # Git config
✅ .gitattributes      # Git attributes
✅ .homeyignore        # Homey ignore
✅ .homeychangelog.json # Homey changelog
✅ app.json            # Manifest app
✅ app.js              # Entry point
✅ package.json        # Dependencies
✅ package-lock.json   # Lock file
✅ jest.config.js      # Tests config
```

### Fichiers Automatiquement Organisés

**Documentation → `docs/`**
```
GUIDE.md
MANUAL.md
TUTORIAL.md
*_SUMMARY.md
*_REPORT.md (sauf reports/)
```

**Reports → `reports/`**
```
*_REPORT.json
*_ANALYSIS.json
DIAGNOSTIC_*.md
```

**Archives → `.archive/`**
```
*.backup
*.old
*.bak
backup-*
Fichiers avec timestamp (1234567890.js)
```

**Temporaires → `.temp/`**
```
temp_*
test_*
*.temp
*.tmp
```

**Scripts → `scripts/organized/`**
```
UPPERCASE_SCRIPT.js
UPPERCASE_SCRIPT.ps1
```

## 🔧 Scripts d'Automation

### 1. AUTO_README_UPDATER.js

**Fonction:**
- Met à jour automatiquement README.md
- Génère README.txt pour compatibilité
- Extrait stats de app.json
- Liste derniers commits Git
- Compte drivers par catégorie
- Ajoute badges dynamiques

**Contenu Auto-Généré:**
```markdown
- Version actuelle (app.json)
- Nombre de drivers
- SDK version
- Derniers 5 commits Git
- Stats par catégorie
- Liens GitHub
- Date de dernière mise à jour
```

**Usage:**
```bash
node scripts/automation/AUTO_README_UPDATER.js
```

**Sortie:**
```
✅ README.md updated successfully
✅ README.txt created for compatibility
📊 Updated Info:
   Version: 4.9.7
   Drivers: 163
   SDK: 3
```

### 2. SMART_FILE_ORGANIZER.js

**Fonction:**
- Scanne les fichiers à la racine
- Identifie fichiers à déplacer
- Préserve fichiers essentiels
- Organise intelligemment
- Nettoie dossiers vides

**Règles d'Organisation:**
```javascript
{
  documentation: { 
    patterns: [/^[A-Z_]+\.md$/, /GUIDE/i],
    destination: 'docs/'
  },
  reports: {
    patterns: [/REPORT/i, /ANALYSIS/i],
    destination: 'reports/'
  },
  archive: {
    patterns: [/\.backup$/, /\.old$/],
    destination: '.archive/'
  },
  temporary: {
    patterns: [/^temp_/i, /\.tmp$/],
    destination: '.temp/'
  }
}
```

**Usage:**
```bash
node scripts/automation/SMART_FILE_ORGANIZER.js
```

**Sortie:**
```
📂 Organizing root files...
📄 CLEANUP_REPORT.md
  → docs/CLEANUP_REPORT.md
📄 FINAL_STATS.txt
  → docs/FINAL_STATS.txt
...
📊 ORGANIZATION SUMMARY
   Files scanned: 75
   Files moved: 26
   Files preserved: 17
   Errors: 0
✅ Organization completed!
```

### 3. SAFE_PUSH_AND_PUBLISH.js (Enhanced)

**Nouveau:** STEP 0 - Automation
- Appelle AUTO_README_UPDATER.js
- Appelle SMART_FILE_ORGANIZER.js
- Erreurs non-critiques (continue si échec)

**Workflow Complet:**
```
STEP 0: Automation (nouveau)
  ↓
STEP 1: Security
  ↓
STEP 2: Validation
  ↓
STEP 3-10: Git & Deploy
```

## 📊 Statistiques Auto-Générées

### Dans README.md

**Badges Dynamiques:**
```markdown
![Version](https://img.shields.io/badge/version-4.9.7-blue)
![Drivers](https://img.shields.io/badge/drivers-163-green)
![SDK](https://img.shields.io/badge/SDK-3-orange)
```

**Stats par Catégorie:**
```
- Switches: 45 drivers
- Sensors: 32 drivers
- Lighting: 23 drivers
- Power: 28 drivers
- Climate: 15 drivers
- Buttons: 12 drivers
- Other: 8 drivers
```

**Derniers Commits:**
```
- [eb5052b] Deep coherence fixes (2 hours ago)
- [95f5a16] Bseed 2-gang switch fix (4 hours ago)
- [9c7857e] Fix duplicate Flow IDs (1 day ago)
```

## 🎯 Avantages

### Pour le Développeur
✅ **Zéro maintenance manuelle** du README
✅ **Organisation automatique** des fichiers
✅ **Racine toujours propre**
✅ **Documentation toujours à jour**
✅ **Stats en temps réel**

### Pour les Utilisateurs
✅ **README actuel** avec vraies stats
✅ **Derniers commits** visibles
✅ **Version exacte** affichée
✅ **Structure claire** du projet

### Pour le Projet
✅ **Image professionnelle**
✅ **Facilite contributions**
✅ **Historique transparent**
✅ **Maintenabilité accrue**

## 🔄 Cycle de Vie

### À chaque commit:
```
1. Code modifié
2. Run SAFE_PUSH_AND_PUBLISH.js
3. → AUTO_README_UPDATER (stats mises à jour)
4. → SMART_FILE_ORGANIZER (fichiers rangés)
5. → Validation Homey
6. → Git commit avec README à jour
7. → Git push
8. → GitHub Actions déclenchées
```

### Résultat:
- ✅ README toujours synchronisé avec app.json
- ✅ Stats toujours exactes
- ✅ Racine toujours propre
- ✅ Documentation toujours accessible

## 🛠️ Configuration

### Ajouter un fichier à préserver:

**Éditer:** `scripts/automation/SMART_FILE_ORGANIZER.js`

```javascript
this.preservedRootFiles = [
  'README.md',
  'LICENSE',
  // Ajouter ici:
  'MON_FICHIER.md'
];
```

### Ajouter une règle d'organisation:

```javascript
this.organizationRules = {
  // ...
  monNouveauType: {
    patterns: [/PATTERN/i],
    destination: 'mon-dossier',
    exclude: ['FICHIER_A_GARDER.md']
  }
};
```

### Personnaliser README:

**Éditer:** `scripts/automation/AUTO_README_UPDATER.js`

Modifier la méthode `generateReadme()`:
```javascript
generateReadme() {
  return `# ${appInfo.name}
  
  // Votre contenu personnalisé ici
  
  `;
}
```

## 📝 Exemples

### Exécution Manuelle

```bash
# Mettre à jour README seulement
node scripts/automation/AUTO_README_UPDATER.js

# Organiser fichiers seulement
node scripts/automation/SMART_FILE_ORGANIZER.js

# Workflow complet (recommandé)
node scripts/deployment/SAFE_PUSH_AND_PUBLISH.js
```

### Sortie Typique

```
🤖 STEP 0: Automation - README & File Organization...
   ✅ README.md updated automatically
   ✅ Files organized intelligently
✅ Automation completed

🔒 STEP 1: Security - Cleaning .homeycompose...
✅ .homeycompose does not exist

📋 STEP 2: Homey Validation...
✅ Homey validation PASSED

📊 STEP 3: Git Status...
✅ 4 files changed
    M README.md
    M README.txt
    M scripts/deployment/SAFE_PUSH_AND_PUBLISH.js
   ?? docs/NEW_FILE.md

💾 STEP 4: Git Stash...
✅ Changes stashed

[... suite du workflow ...]
```

## 🎉 Résultat Final

### Avant l'Automation:
```
tuya_repair/
├── README.md (dépassé, version 4.5.0)
├── CLEANUP_REPORT.md
├── FINAL_STATS.txt
├── EMAIL_RESPONSE.txt
├── GUIDE.md
├── OLD_REPORT.json
├── backup_file.js
├── temp_test.txt
└── [50+ fichiers désorganisés]
```

### Après l'Automation:
```
tuya_repair/
├── README.md (✅ à jour, version 4.9.7, stats actuelles)
├── README.txt (✅ généré automatiquement)
├── LICENSE
├── CHANGELOG.md
├── app.json
├── package.json
├── docs/ (26 fichiers organisés)
├── reports/ (analyses et diagnostics)
├── .archive/ (backups et old files)
└── .temp/ (fichiers temporaires)
```

## 🔮 Évolutions Futures

### Possibilités:
- [ ] Auto-génération CHANGELOG.md
- [ ] Detection breaking changes
- [ ] Auto-tagging versions Git
- [ ] Génération badges coverage
- [ ] Stats d'utilisation drivers
- [ ] Health check automatique
- [ ] Performance metrics

---

**Status:** ✅ **ACTIF & OPÉRATIONNEL**  
**Version:** 1.0  
**Dernière Mise à Jour:** 25 Oct 2025  
**Testé:** ✅ Production Ready
