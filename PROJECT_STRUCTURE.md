# 📂 STRUCTURE PROJET - UNIVERSAL TUYA ZIGBEE

**Date:** 16 Octobre 2025  
**Version:** 2.15.130  
**Organisation:** Optimisée et rangée

---

## 🗂️ STRUCTURE PRINCIPALE

```
tuya_repair/
├── 📄 FICHIERS RACINE (essentiels seulement)
│   ├── README.md              ← Documentation principale
│   ├── CHANGELOG.md           ← Historique versions
│   ├── LICENSE                ← Licence MIT
│   ├── app.json              ← Config Homey (généré)
│   ├── package.json          ← Dépendances Node
│   └── .env                  ← Variables environnement
│
├── 📁 DOSSIERS HOMEY (SDK)
│   ├── drivers/              ← 183 drivers Zigbee
│   ├── lib/                  ← Bibliothèques partagées
│   ├── utils/                ← Utilitaires helpers
│   ├── assets/               ← Images app
│   ├── locales/              ← Traductions
│   ├── settings/             ← Interface settings
│   └── api/                  ← API endpoints
│
├── 📁 DOCUMENTATION
│   ├── docs/
│   │   ├── fixes/            ← Docs corrections bugs
│   │   ├── workflow/         ← Docs workflow GitHub
│   │   ├── community/        ← Analyse apps communautaires
│   │   └── forum/            ← Réponses forum users
│   │
│   └── references/           ← Références techniques
│
├── 📁 SCRIPTS
│   ├── scripts/
│   │   ├── fixes/            ← Scripts correction bugs
│   │   ├── automation/       ← Scripts Git/Publish
│   │   └── utils/            ← Scripts utilitaires
│   │
│   └── ultimate_system/      ← Système automatisation avancé
│
├── 📁 DATA & REPORTS
│   ├── project-data/         ← Données projet
│   ├── reports/              ← Rapports validation
│   └── github-analysis/      ← Analyses GitHub
│
└── 📁 CONFIGURATION
    ├── .github/              ← GitHub Actions workflows
    ├── .vscode/              ← Config VS Code
    ├── .gitignore            ← Fichiers ignorés Git
    └── .homeyignore          ← Fichiers ignorés Homey
```

---

## 📄 FICHIERS RACINE (À GARDER)

### Essentiels Homey:
- ✅ `README.md` - Documentation principale
- ✅ `CHANGELOG.md` - Historique versions
- ✅ `LICENSE` - Licence MIT
- ✅ `app.json` - Configuration Homey (généré par Homey Compose)
- ✅ `package.json` - Dépendances Node.js
- ✅ `package-lock.json` - Lock des dépendances

### Configuration:
- ✅ `.env` - Variables d'environnement (secrets)
- ✅ `.env.example` - Template variables
- ✅ `.gitignore` - Fichiers ignorés par Git
- ✅ `.homeyignore` - Fichiers ignorés par Homey
- ✅ `.prettierrc` - Config formatage code

### Fichiers Build:
- ✅ `.homeychangelog.json` - Changelog Homey format

---

## 📁 DOSSIERS HOMEY (SDK3)

### `/drivers/` (183 drivers)
Tous les drivers Zigbee organisés par type de device:
```
drivers/
├── motion_temp_humidity_illumination_multi_battery/
├── sos_emergency_button_cr2032/
├── smart_plug_energy_ac/
└── ... (180+ autres drivers)
```

### `/lib/`
Bibliothèques partagées entre drivers:
```
lib/
├── IASZoneEnroller.js     ← Enrollment IAS Zone universel
├── TuyaZigbeeDevice.js    ← Classe de base Tuya
├── cluster-handlers.js    ← Handlers clusters Zigbee
└── ...
```

### `/utils/`
Utilitaires et helpers:
```
utils/
├── converter.js           ← Conversions valeurs
├── logger.js             ← Système logging
├── validator.js          ← Validation données
└── ...
```

### `/assets/`
Images et icônes app:
```
assets/
├── images/
│   ├── small.png         ← 250x175px
│   ├── large.png         ← 500x350px
│   └── xlarge.png        ← 1000x700px
└── icon.svg
```

---

## 📁 DOCUMENTATION

### `/docs/fixes/`
Documentation des corrections de bugs:
- `CRITICAL_FIX_SUMMARY_v2.15.130.md` - Fix module manquant
- `PETER_IAS_ZONE_FIX_COMPLETE.md` - Fix IAS Zone enrollment
- `EMAIL_CORRECTION_SUMMARY.md` - Correction emails
- `STATUS_FINAL.md` - Status final corrections

### `/docs/workflow/`
Documentation workflow GitHub Actions:
- `WORKFLOW_GUIDE.md` - Guide complet workflow
- `QUICK_WORKFLOW.md` - Référence rapide
- `README_WORKFLOW.md` - Résumé workflow
- `PUBLICATION_SUCCESS.md` - Succès publication
- `FORCE_PUBLISH.md` - Publication manuelle

### `/docs/community/`
Analyse apps communautaires Homey:
- `COMMUNITY_APPS_ANALYSIS.md` - Analyse Philips Hue, Aqara, SONOFF
- `QUICK_IMPROVEMENTS.md` - Priorités amélioration

### `/docs/forum/`
Réponses forum utilisateurs:
- `FORUM_POSTS_COPY_PASTE.txt` - Réponses prêtes à poster
- `FORUM_RESPONSE_PETER_DUTCHDUKE.md` - Réponses détaillées

---

## 📁 SCRIPTS

### `/scripts/fixes/`
Scripts de correction automatique:
- `FIX_APP_IMAGES_FINAL.js` - Fix images app
- `FIX_DEVICE_FILES.js` - Fix fichiers devices
- `ULTIMATE_FIX_ALL.js` - Fix complet automatique
- `fix-images.js` - Correction images
- `fix-flows.js` - Correction flow cards

### `/scripts/automation/`
Scripts automation Git & Publish:
- `commit-analysis.ps1` - Commit analyse community
- `commit-critical-fixes.ps1` - Commit fixes critiques
- `commit-push.ps1` - Commit & push générique
- `auto-publish.js` - Publication automatique
- `push-native.js` - Push vers GitHub

### `/scripts/utils/`
Scripts utilitaires divers:
- `organize-project.ps1` - Organisation projet (ce script!)
- `add-all-images.ps1` - Ajout images en masse
- `create-app-images.js` - Création images app
- `remove-driver-images.js` - Suppression images drivers

---

## 📁 DATA & REPORTS

### `/project-data/`
Données projet (analyses, stats, etc.)

### `/reports/`
Rapports de validation Homey CLI

### `/github-analysis/`
Analyses repos GitHub community

---

## 📁 CONFIGURATION

### `/.github/workflows/`
GitHub Actions workflows:
- `homey-official-publish.yml` - Publication automatique officielle
- `validate.yml` - Validation automatique
- `tests.yml` - Tests automatiques

### `/.vscode/`
Configuration VS Code / Windsurf

---

## 🚫 FICHIERS À IGNORER

### `.gitignore`
Fichiers ignorés par Git:
```
node_modules/
.env
*.log
reports/
.DS_Store
```

### `.homeyignore`
Fichiers ignorés par Homey build:
```
scripts/
docs/
reports/
project-data/
github-analysis/
```

---

## 🔄 WORKFLOW DÉVELOPPEMENT

### 1. Modifications Code
```bash
# Éditer drivers, lib, utils
code drivers/motion_sensor/device.js
```

### 2. Validation Locale
```bash
homey app build
homey app validate --level publish
```

### 3. Commit & Push
```bash
git add -A
git commit -m "Description"
git push origin master
```

### 4. GitHub Actions
- ✅ Validation automatique
- ✅ Version bump automatique
- ✅ Publication automatique sur Homey App Store

---

## 📊 STATISTIQUES PROJET

```
Drivers:              183
Fichiers total:       ~3000+
Lignes de code:       ~50,000+
Images:               ~550 (183 drivers × 3)
Documentation:        20+ fichiers
Scripts:              30+ fichiers
```

---

## 🧹 MAINTENANCE

### Organisation Automatique
```bash
# Exécuter script d'organisation
powershell scripts/organize-project.ps1
```

### Nettoyage
```bash
# Supprimer fichiers temporaires
Remove-Item reports/*.html
Remove-Item *.log
```

### Validation
```bash
# Valider app
homey app validate --level publish
```

---

## 📚 RÉFÉRENCES

### Documentation Officielle:
- **Homey SDK3:** https://apps.developer.homey.app
- **Zigbee Clusters:** https://github.com/athombv/node-zigbee-clusters
- **GitHub Actions:** https://docs.github.com/actions

### Repos Communautaires:
- **Philips Hue Zigbee:** https://github.com/JohanBendz/com.philips.hue.zigbee
- **Aqara/Xiaomi:** https://github.com/Maxmudjon/com.maxmudjon.mihomey
- **SONOFF Zigbee:** https://github.com/StyraHem/Homey.Sonoff.Zigbee

---

## ✅ CHECKLIST ORGANISATION

- ✅ Fichiers essentiels à la racine uniquement
- ✅ Documentation dans `/docs/` organisée par catégorie
- ✅ Scripts dans `/scripts/` organisés par type
- ✅ Data dans `/project-data/` et `/reports/`
- ✅ Configuration dans `/.github/` et `/.vscode/`
- ✅ `.gitignore` et `.homeyignore` à jour
- ✅ Structure claire et maintenable
- ✅ Documentation complète

---

**Version:** 2.15.130  
**Organisation:** 16 Octobre 2025  
**Status:** ✅ PROPRE ET ORGANISÉ

🎯 **Structure optimale pour développement et maintenance!**
