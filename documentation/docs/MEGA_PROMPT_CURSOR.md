# 🚀 MÉGA-PROMPT CURSOR — COM.TUYA.ZIGBEE PROJECT
## Version: Ultra-Enriched 2025-09-01
## Repository: dlnraja/com.tuya.zigbee
## Status: AUTONOME & ÉVOLUTIVE

---

## 🎯 MISSION PRINCIPALE
You are working on the **dlnraja/com.tuya.zigbee** project, a comprehensive autonomous Tuya Zigbee integration for Homey Pro. Your mission is to analyze, fix, complete, enrich, and evolve the project without regression, while maintaining full autonomy and multi-language support.

---

## 📊 CONTEXTE TECHNIQUE

### Architecture du Projet
- **Framework**: Homey SDK v3.6.0+
- **Langage**: Node.js 14.0.0+ / ES6+
- **Protocole**: Zigbee via Zigbee2MQTT & Zigbee-Herdsman
- **Structure**: Modulaire (drivers/, scripts/, docs/, workflows/)
- **Persistance**: MongoDB intégré Homey
- **CI/CD**: GitHub Actions complet

### Sources Externes d'Enrichissement
- 🏠 **Blakadder Zigbee** - Base de données communautaire
- 🔄 **Zigbee2MQTT** - Intégrations standards
- 💬 **Homey Community Forum** - Retours utilisateurs
- 🏭 **Fabricants** (Tuya, Lidl, IKEA, Aqara, Sonoff, etc.)
- 🌍 **Sources Régionales** (EU, US, China, India)

---

## 🎯 OBJECTIFS STRATÉGIQUES

### 1. Analyse Complète du Repository
```
✅ Analyse des commits récents et corrections
✅ État des drivers (présents/manquants/broken)
✅ Revue des workflows GitHub Actions
✅ État de la documentation multilingue
✅ Contrôle des dépendances et compatibilité
✅ Vérification des scripts d'automatisation
```

### 2. Système de Scoring des Drivers
```javascript
const DRIVER_SCORES = {
  COMPLETENESS: 0-100,    // Couverture des fonctionnalités
  RELIABILITY: 0-100,     // Taux de succès des connexions
  SOURCE_COVERAGE: 0-100, // Sources externes validées
  LAST_UPDATE: 0-100,     // Fraicheur des données
  COMMUNITY_FEEDBACK: 0-100 // Avis utilisateurs
}
```

### 3. Enrichissement Automatique
- **Mensuel**: Synchronisation avec sources externes
- **Quotidien**: Mise à jour des drivers critiques
- **Sur-Demande**: Enrichissement manuel via scripts

---

## 📝 RÈGLES DE COMMIT BILINGUES

### Format des Commits
```
[TAG] English commit message (max 72 chars)
French translation of the commit message

[TAG] Fix device interview parsing for Tuya TS0601 dimmer
Correction de l'interview des appareils Tuya TS0601 dimmer
```

### Tags Standards
- `[FIX]` - Corrections de bugs
- `[FEAT]` - Nouvelles fonctionnalités
- `[DOCS]` - Documentation
- `[REFactor]` - Refactorisation
- `[ENRICH]` - Enrichissement de données
- `[SYNC]` - Synchronisation
- `[AUTO]` - Actions automatisées

### Logs dans les Scripts
```javascript
// English first, French second
console.log('✅ Device successfully paired');
console.log('✅ Appareil appairé avec succès');

// Error handling
console.error('❌ Failed to connect to Zigbee network');
console.error('❌ Échec de connexion au réseau Zigbee');
```

---

## 🔄 WORKFLOWS GITHUB ACTIONS

### 1. Maintenance Mensuelle (`monthly-maintenance.yml`)
```yaml
name: 🚀 Monthly Maintenance & Enrichment
on:
  schedule:
    - cron: '0 2 1 * *'  # 1st of each month at 02:00 UTC
  workflow_dispatch:

jobs:
  enrich-and-update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: "REDACTED"}}
      
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: 📦 Install Dependencies
        run: npm ci
      
      - name: 🔍 Run Multi-IA Analysis
        run: |
          node scripts/scout.js
          node scripts/architect.js
          node scripts/optimizer.js
          node scripts/validator.js
      
      - name: 📊 Generate Reports
        run: node scripts/generate-reports.js
      
      - name: 🔄 Sync with Lite Version
        run: node scripts/sync-lite.js
      
      - name: 📝 Update Documentation
        run: |
          node scripts/update-readme.js
          node scripts/update-device-matrix.js
      
      - name: ✅ Validate Changes
        run: |
          npm run validate
          npm run test
      
      - name: 🚀 Commit & Push Changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "[AUTO] Monthly enrichment and maintenance
          Enrichissement et maintenance mensuels automatiques" || echo "No changes to commit"
          git push
```

### 2. Enrichissement Quotidien (`daily-enrichment.yml`)
```yaml
name: 🔄 Daily Driver Enrichment
on:
  schedule:
    - cron: '0 6 * * *'  # Every day at 06:00 UTC
  workflow_dispatch:

jobs:
  enrich-drivers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 🔧 Setup Environment
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: 📦 Install Dependencies
        run: npm ci
      
      - name: 🌐 Fetch External Data
        run: |
          node scripts/fetch-blakadder.js
          node scripts/fetch-z2m-updates.js
          node scripts/fetch-community-feedback.js
      
      - name: ⚡ Update Driver Scores
        run: node scripts/update-driver-scores.js
      
      - name: 🔧 Auto-Fix Issues
        run: node scripts/auto-fix-drivers.js
      
      - name: 📝 Update Device Matrix
        run: node scripts/update-device-matrix.js
      
      - name: 🚀 Commit Changes
        run: |
          git add drivers/ docs/
          git commit -m "[ENRICH] Daily driver enrichment
          Enrichissement quotidien des drivers" || echo "No changes"
          git push
```

### 3. Validation Continue (`validate-pr.yml`)
```yaml
name: ✅ PR Validation & Testing
on:
  pull_request:
    branches: [ master, main ]
  push:
    branches: [ master, main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: 📦 Install Dependencies
        run: npm ci
      
      - name: 🧪 Run Tests
        run: npm run test
      
      - name: 🔍 Run Linting
        run: npm run lint
      
      - name: 🏠 Validate Homey App
        run: npm run validate
      
      - name: 📊 Generate Coverage Report
        run: npm run test:coverage
      
      - name: 📈 Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

---

## 🌍 DOCUMENTATION MULTILINGUE

### Structure du README
```markdown
# 🔌 Tuya Zigbee for Homey
> Universal Tuya Zigbee device support for Homey Pro

[![GitHub stars](https://img.shields.io/github/stars/dlnraja/com.tuya.zigbee)](https://github.com/dlnraja/com.tuya.zigbee)
[![GitHub issues](https://img.shields.io/github/issues/dlnraja/com.tuya.zigbee)](https://github.com/dlnraja/com.tuya.zigbee)

## 🇺🇸 English

### Overview
This is a comprehensive autonomous Tuya Zigbee integration for Homey Pro...

### Features
- ✅ 500+ Supported Devices
- 🔄 Auto-Enrichment System
- 🌍 Multi-Language Support
- 📊 Driver Scoring System
- 🔧 Auto-Repair Pipeline

## 🇫🇷 Français

### Vue d'ensemble
Il s'agit d'une intégration autonome complète Tuya Zigbee pour Homey Pro...

## 🇳🇱 Nederlands

### Overzicht
Dit is een uitgebreide autonome Tuya Zigbee integratie voor Homey Pro...

## 🇱🇰 தமிழ் (Tamil)

### கண்ணோட்டம்
இது Homey Pro க்கான விரிவான தன்னாட்சி Tuya Zigbee ஒருங்கிணைப்பாகும்...

---

## ⚠️ IMPORTANT NOTICE

🚨 **This repository is a BASE and needs enrichment every cycle!**

This is not a complete solution but a foundation that must be enriched:
- ✅ Monthly automated enrichment
- ✅ Community contributions
- ✅ External source integration
- ✅ Driver scoring and validation

**Last enrichment:** `2025-09-01`
**Next scheduled:** `2025-10-01`

---
```

---

## 🔄 SYNCHRONISATION TUYA-LIGHT

### Repository Léger
```javascript
// scripts/sync-lite.js
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function syncToLite() {
  const liteRepo = 'https://github.com/dlnraja/tuya-light.git';
  
  // Clone or update lite repo
  if (!fs.existsSync('tuya-light')) {
    execSync(`git clone ${liteRepo} tuya-light`);
  } else {
    execSync('cd tuya-light && git pull');
  }
  
  // Copy only essential files
  const essentialFiles = [
    'drivers/',
    'app.js',
    'package.json',
    'README.md'
  ];
  
  essentialFiles.forEach(file => {
    fs.copySync(file, path.join('tuya-light', file));
  });
  
  // Update lite README
  const liteReadme = `# 🔌 Tuya Light - Zigbee for Homey

This is a lightweight version of [com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) containing only essential drivers.

## Purpose
- 🚀 Faster installation
- 📦 Smaller footprint
- 🔧 No AI automation features
- 💾 Backup repository

## Sync
This repository is automatically synced from the main repository monthly.

**Last sync:** ${new Date().toISOString()}
**Source:** https://github.com/dlnraja/com.tuya.zigbee

---

*For full features and automation, use the main repository.*
`;
  
  fs.writeFileSync('tuya-light/README.md', liteReadme);
  
  // Commit and push
  execSync('cd tuya-light && git add .');
  execSync(`cd tuya-light && git commit -m "[SYNC] Monthly sync from main repo
  Synchronisation mensuelle depuis le dépôt principal" || echo "No changes"`);
  execSync('cd tuya-light && git push');
}

syncToLite();
```

---

## 📊 SYSTÈME DE SCORING

### Script de Scoring (`scripts/update-driver-scores.js`)
```javascript
const fs = require('fs-extra');
const path = require('path');

class DriverScorer {
  constructor() {
    this.scores = {};
  }
  
  async scoreDriver(driverName) {
    const driverPath = path.join('drivers', driverName);
    const devicePath = path.join(driverPath, 'device.js');
    
    if (!await fs.pathExists(devicePath)) {
      return { score: 0, issues: ['Device file missing'] };
    }
    
    const content = await fs.readFile(devicePath, 'utf8');
    
    let score = 100;
    const issues = [];
    
    // Check for datapoints
    const dpCount = (content.match(/registerTuyaDatapoint/g) || []).length;
    if (dpCount < 5) {
      score -= 20;
      issues.push('Low datapoint coverage');
    }
    
    // Check for capabilities
    const capCount = (content.match(/registerCapability/g) || []).length;
    if (capCount < 3) {
      score -= 15;
      issues.push('Limited capabilities');
    }
    
    // Check for error handling
    const hasErrorHandling = content.includes('try') && content.includes('catch');
    if (!hasErrorHandling) {
      score -= 10;
      issues.push('Missing error handling');
    }
    
    // Check for documentation
    const hasComments = content.includes('//') || content.includes('/*');
    if (!hasComments) {
      score -= 5;
      issues.push('Missing documentation');
    }
    
    return { score: Math.max(0, score), issues };
  }
  
  async updateAllScores() {
    const driversDir = 'drivers';
    const driverFolders = await fs.readdir(driversDir);
    
    for (const folder of driverFolders) {
      const stat = await fs.stat(path.join(driversDir, folder));
      if (stat.isDirectory()) {
        const score = await this.scoreDriver(folder);
        this.scores[folder] = score;
      }
    }
    
    // Save scores
    await fs.writeJson('driver-scores.json', {
      timestamp: new Date().toISOString(),
      scores: this.scores
    });
  }
}

const scorer = new DriverScorer();
scorer.updateAllScores();
```

---

## 🔧 TÂCHES PRINCIPALES DANS CURSOR

### Analyse et Corrections
1. **Analyser** tous les drivers existants
2. **Identifier** les problèmes et manques
3. **Corriger** les erreurs de syntaxe et logique
4. **Enrichir** avec données externes

### Enrichissement Automatique
1. **Récupérer** données Blakadder et Zigbee2MQTT
2. **Synchroniser** avec forums communautaires
3. **Mettre à jour** les drivers avec nouvelles infos
4. **Valider** les changements

### Documentation et Maintenance
1. **Générer** README multilingue mis à jour
2. **Créer** matrice des appareils enrichie
3. **Mettre à jour** workflows GitHub Actions
4. **Synchroniser** avec version lite

---

## 🎯 COMMANDES DE COMMIT EXEMPLE

```bash
# Après corrections
git add .
git commit -m "[FIX] Fix TS0601 dimmer interview parsing
Correction de l'interview des dimmers TS0601"

# Après enrichissement
git add drivers/ docs/
git commit -m "[ENRICH] Add support for new Aqara devices
Ajout du support pour nouveaux appareils Aqara"

# Après synchronisation
git add .
git commit -m "[SYNC] Monthly enrichment and maintenance
Enrichissement et maintenance mensuels"
```

---

## 📋 CHECKLIST DE VALIDATION

### ✅ Qualité du Code
- [ ] ESLint sans erreurs
- [ ] Tests passant (unit + integration)
- [ ] Homey validation réussie
- [ ] Pas de régressions

### ✅ Enrichissement
- [ ] Sources externes intégrées
- [ ] Drivers mis à jour
- [ ] Scores recalculés
- [ ] Documentation à jour

### ✅ Autonomie
- [ ] GitHub Actions fonctionnels
- [ ] Synchronisation lite OK
- [ ] Maintenance mensuelle programmée
- [ ] Auto-réparation opérationnelle

---

## 🚀 PROCHAINES ÉTAPES DANS CURSOR

1. **Analyser** l'état actuel du repository
2. **Appliquer** les corrections identifiées
3. **Enrichir** avec sources externes
4. **Générer** la documentation mise à jour
5. **Valider** tous les changements
6. **Commiter** selon les règles bilingues
7. **Pousser** la version enrichie

---

*Ce méga-prompt est conçu pour maintenir l'autonomie et l'évolutivité du projet com.tuya.zigbee. Chaque cycle d'enrichissement améliore la couverture et la qualité des drivers.*

**🔄 État actuel :** Base fonctionnelle nécessitant enrichissement continu
**📅 Prochain cycle :** Maintenance mensuelle automatisée
**🎯 Objectif :** Couverture complète des appareils Tuya Zigbee
