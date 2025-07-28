# 🚀 Règles du Projet com.tuya.zigbee

## 📋 Stratégie de Traitement Local

### 🎯 Principe Fondamental
**Au lieu de supprimer les fichiers locaux d'optimisation, les déplacer dans un dossier de traitement et les ignorer via .gitignore**

### 📁 Structure de Traitement Local

```
local-processing/
├── *.ps1                    # Scripts PowerShell locaux
├── *.sh                     # Scripts Bash locaux  
├── cursor_*.md             # Fichiers de configuration Cursor
├── TODO_*.md               # Fichiers TODO locaux
├── *.log                   # Fichiers de logs
├── *.tmp                   # Fichiers temporaires
├── *.backup                # Fichiers de sauvegarde
├── mega_prompt_*.txt       # Prompts Cursor
├── readme_fold_*.md        # Références fold
├── tasks.md                # Tâches locales
├── project-tasks.md        # Tâches projet locales
├── PROGRESS.md             # Progression locale
└── fold-processing-report.md # Rapport de traitement
```

### 🔄 Workflows Automatisés

#### 1. Local Processing Cleanup
- **Fréquence**: Toutes les semaines le dimanche à 2h
- **Action**: Déplace automatiquement les fichiers locaux vers `local-processing/`
- **Fichier**: `.github/workflows/local-processing-cleanup.yml`

#### 2. Auto Local Processing  
- **Fréquence**: Tous les jours à 3h
- **Action**: Traite le contenu de `D:\Download\fold` et l'intègre
- **Fichier**: `.github/workflows/auto-local-processing.yml`

### 📝 Règles Git

#### .gitignore
```gitignore
# Dossier de traitement local (NE PAS PUSHER)
local-processing/
```

#### Format des Commits
```
feat(processing): Apply local processing rules // FR: Application des règles de traitement local
```

### 🛠️ Scripts de Traitement

#### tools/process-fold-content.js
- Traite intelligemment le contenu de `D:\Download\fold`
- Déplace les fichiers pertinents vers `local-processing/`
- Génère un rapport de traitement
- Maintient la cohérence du projet

### 📊 Monitoring

#### Rapports Automatiques
- `local-processing/processing-report.md`
- `PROCESSING_SUMMARY.md`
- `PROJECT_RULES.md`

### 🔄 Synchronisation

#### Branches
- `master`: Projet principal avec règles de traitement local
- `tuya-light`: Version simplifiée sans traitement local

#### Workflows
- Validation SDK Homey
- Release tuya-light
- Traduction commits
- Mise à jour documentation
- **Nouveau**: Traitement local automatique

### 🎯 Avantages de cette Stratégie

1. **Préservation**: Les fichiers locaux ne sont pas perdus
2. **Organisation**: Structure claire avec `local-processing/`
3. **Automatisation**: Workflows GitHub Actions
4. **Traçabilité**: Rapports et règles documentées
5. **Flexibilité**: Accès aux fichiers locaux si nécessaire
6. **Propreté**: Repository principal propre
7. **Cohérence**: Règles appliquées uniformément

### 📈 Évolution

Cette stratégie sera appliquée de manière permanente dans tous les futurs projets et sessions Cursor, selon la politique globale définie dans `cursor_global_policy.md`. 