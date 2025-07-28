# 📁 Structure du Projet com.tuya.zigbee

## 🏗️ Architecture Générale

```
com.tuya.zigbee/
├── 📁 src/                    # Code source principal
│   ├── 📁 core/               # Fonctionnalités principales
│   ├── 📁 ai/                 # Modules d'intelligence artificielle
│   ├── 📁 automation/         # Scripts d'automatisation
│   └── 📁 utils/              # Utilitaires
├── 📁 drivers/                # Drivers Tuya Zigbee (249 actifs)
│   ├── 📁 active/             # Drivers en production
│   ├── 📁 sdk3/               # Drivers SDK3
│   ├── 📁 legacy/             # Drivers legacy
│   └── 📁 testing/            # Drivers en test
├── 📁 docs/                   # Documentation complète
│   ├── 📁 i18n/               # Documentation multilingue
│   ├── 📁 guides/             # Guides d'utilisation
│   ├── 📁 api/                # Documentation API
│   └── 📁 dashboard/          # Documentation dashboard
├── 📁 scripts/                # Scripts d'automatisation
│   ├── 📁 maintenance/        # Scripts de maintenance
│   └── 📁 deployment/         # Scripts de déploiement
├── 📁 dashboard/              # Dashboard GitHub Pages
├── 📁 templates/              # Templates automatiques
├── 📁 tools/                  # Outils de développement
├── 📁 ref/                    # Référentiel Zigbee
├── 📁 .github/workflows/      # Workflows CI/CD (92 actifs)
└── 📁 logs/                   # Logs et rapports
```

## 🎯 Organisation par Fonctionnalité

### 🤖 Intelligence Artificielle
- **src/ai/** : Modules IA (OpenAI, Claude, génération automatique)
- **templates/** : Templates générés par IA
- **scripts/ai/** : Scripts d'automatisation IA

### 🔌 Drivers Zigbee
- **drivers/active/** : 249 drivers en production
- **drivers/sdk3/** : Drivers compatibles SDK3
- **drivers/legacy/** : Drivers legacy maintenus
- **drivers/testing/** : Drivers en développement

### 🌍 Support Multilingue
- **docs/i18n/** : Documentation en 4 langues
- **locales/** : Fichiers de traduction
- **scripts/translate/** : Scripts de traduction

### ⚡ Automatisation
- **.github/workflows/** : 92 workflows CI/CD
- **scripts/maintenance/** : Scripts de maintenance
- **scripts/deployment/** : Scripts de déploiement

### 📊 Dashboard & Analytics
- **dashboard/** : Interface GitHub Pages
- **docs/dashboard/** : Documentation dashboard
- **logs/** : Rapports et métriques

## 🔧 Fichiers de Configuration

### Configuration Principale
- **package.json** : Configuration Node.js et dépendances
- **app.json** : Configuration Homey App
- **_config.yml** : Configuration GitHub Pages
- **.homeyignore** : Fichiers ignorés par Homey

### Documentation
- **README.md** : Documentation principale
- **CHANGELOG.md** : Historique des versions
- **LICENSE** : Licence MIT
- **CONTRIBUTING.md** : Guide de contribution

## 🚀 Workflows CI/CD

### Automatisation Principale
- **build.yml** : Construction de l'application
- **ci.yml** : Tests et validation
- **github-pages-deploy.yml** : Déploiement dashboard
- **auto-translate.yml** : Traduction automatique

### Maintenance Mensuelle
- **monthly-optimization.yml** : Optimisation mensuelle
- **monthly-backup.yml** : Sauvegarde mensuelle
- **monthly-zigbee-update.yml** : Mise à jour Zigbee

## 📈 Métriques du Projet

| Composant | Quantité | Statut |
|-----------|----------|--------|
| **Drivers** | 249 | ✅ Actifs |
| **Workflows** | 92 | ✅ Opérationnels |
| **Langues** | 4 | ✅ Supportées |
| **IA Modules** | 4 | ✅ Intégrés |

## 🎨 Standards de Nommage

### Fichiers
- **kebab-case** : `update-dashboard-auto.ps1`
- **PascalCase** : `ZigbeeClusterSystem.js`
- **snake_case** : `driver_template.js`

### Dossiers
- **lowercase** : `drivers/`, `docs/`
- **kebab-case** : `ai-modules/`, `workflows/`

## 🔍 Règles de Nettoyage

### Fichiers à Supprimer
- **.backup** : Sauvegardes temporaires
- **.tmp** : Fichiers temporaires
- **.log** : Logs de développement
- **.old** : Anciennes versions

### Fichiers à Conserver
- **Configuration** : package.json, app.json, _config.yml
- **Documentation** : README.md, CHANGELOG.md, LICENSE
- **Code source** : src/, drivers/, scripts/
- **Workflows** : .github/workflows/

## 🚀 Commandes de Maintenance

```bash
# Nettoyage automatique
npm run clean

# Mise à jour dashboard
npm run update-dashboard

# Traduction automatique
npm run auto-translate

# Validation complète
npm run validate
```

---

**📊 Dernière mise à jour** : 2025-07-27 19:00  
**🔧 Version** : 1.0.19  
**👨‍💻 Auteur** : Dylan Rajasekaram 