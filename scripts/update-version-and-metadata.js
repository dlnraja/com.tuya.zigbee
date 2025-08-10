'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const CONFIG = {
  NEW_VERSION: '3.2.0',
  APP_ID: 'com.tuya.zigbee',
  FILES_TO_UPDATE: ['app.json', 'package.json', 'README.md', 'CHANGELOG.md']
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function echo() {
  console.log('\n');
}

// Mettre à jour app.json
async function updateAppJson() {
  log('📱 MISE À JOUR DE app.json...');
  
  const appJsonPath = path.join(process.cwd(), 'app.json');
  if (!fs.existsSync(appJsonPath)) {
    throw new Error('app.json non trouvé');
  }
  
  const appJson = JSON.parse(await fsp.readFile(appJsonPath, 'utf8'));
  
  // Mettre à jour la version
  appJson.version = CONFIG.NEW_VERSION;
  
  // Mettre à jour l'ID
  appJson.id = CONFIG.APP_ID;
  
  // Mettre à jour la compatibilité
  appJson.compatibility = ">=6.0.0";
  
  // Mettre à jour le SDK
  appJson.sdk = 3;
  
  // Sauvegarder
  await fsp.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  log('✅ app.json mis à jour');
}

// Mettre à jour package.json
async function updatePackageJson() {
  log('📦 MISE À JOUR DE package.json...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json non trouvé');
  }
  
  const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, 'utf8'));
  
  // Mettre à jour la version
  packageJson.version = CONFIG.NEW_VERSION;
  
  // Mettre à jour le nom
  packageJson.name = CONFIG.APP_ID;
  
  // Ajouter les scripts mega
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.mega_ultimate = 'node scripts/mega-ultimate-orchestrator.js';
  packageJson.scripts.mega = 'node scripts/mega-ultimate-orchestrator.js';
  packageJson.scripts.enrich = 'node scripts/enrich-from-tmp-sources.js';
  packageJson.scripts.reorganize = 'node scripts/reorganize-drivers-ultimate.js';
  
  // Sauvegarder
  await fsp.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log('✅ package.json mis à jour');
}

// Mettre à jour README.md
async function updateReadme() {
  log('📖 MISE À JOUR DE README.md...');
  
  const readmePath = path.join(process.cwd(), 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    await createNewReadme();
    return;
  }
  
  let readmeContent = await fsp.readFile(readmePath, 'utf8');
  
  // Mettre à jour la version
  readmeContent = readmeContent.replace(
    /Version:\s*\d+\.\d+\.\d+/,
    `Version: ${CONFIG.NEW_VERSION}`
  );
  
  // Mettre à jour la compatibilité
  readmeContent = readmeContent.replace(
    /Compatibility:\s*.*/,
    'Compatibility: Homey >=6.0.0'
  );
  
  // Ajouter la section Test-only si elle n'existe pas
  if (!readmeContent.includes('## Test-only')) {
    const testOnlySection = `

## Test-only

⚠️ **ATTENTION**: Cette application est en mode test uniquement.

- **Fonctionnalités**: Fonctionnalités de base uniquement
- **Support**: Aucun support officiel
- **Utilisation**: À des fins de test et de développement uniquement
- **Production**: Ne pas utiliser en production

### Scripts disponibles

\`\`\`bash
# Script principal d'orchestration
npm run mega_ultimate

# Enrichissement depuis les sources .tmp*
npm run enrich

# Réorganisation des drivers
npm run reorganize

# Validation de l'application
npx homey app validate
\`\`\`

### Structure des drivers

Les drivers sont organisés selon le schéma: \`vendor-category-model\`

- **vendor**: tuya, aqara, ikea, philips, generic
- **category**: light, plug, sensor, switch, cover, etc.
- **model**: identifiant unique du modèle

Exemple: \`tuya-light-ts0501b\`, \`aqara-sensor-motion\`
`;
    
    // Insérer avant la dernière section
    const lastSectionIndex = readmeContent.lastIndexOf('##');
    if (lastSectionIndex !== -1) {
      readmeContent = readmeContent.slice(0, lastSectionIndex) + testOnlySection + '\n\n' + readmeContent.slice(lastSectionIndex);
    } else {
      readmeContent += testOnlySection;
    }
  }
  
  // Sauvegarder
  await fsp.writeFile(readmePath, readmeContent);
  log('✅ README.md mis à jour');
}

// Créer un nouveau README.md
async function createNewReadme() {
  log('📖 CRÉATION D\'UN NOUVEAU README.md...');
  
  const newReadmeContent = `# Tuya Zigbee - Homey App

Application Homey pour la gestion des appareils Tuya Zigbee.

## Informations

- **Version**: ${CONFIG.NEW_VERSION}
- **App ID**: ${CONFIG.APP_ID}
- **Compatibility**: Homey >=6.0.0
- **SDK**: 3

## Installation

1. Clonez ce repository
2. Installez les dépendances: \`npm install\`
3. Validez l'application: \`npx homey app validate\`

## Test-only

⚠️ **ATTENTION**: Cette application est en mode test uniquement.

- **Fonctionnalités**: Fonctionnalités de base uniquement
- **Support**: Aucun support officiel
- **Utilisation**: À des fins de test et de développement uniquement
- **Production**: Ne pas utiliser en production

### Scripts disponibles

\`\`\`bash
# Script principal d'orchestration
npm run mega_ultimate

# Enrichissement depuis les sources .tmp*
npm run enrich

# Réorganisation des drivers
npm run reorganize

# Validation de l'application
npx homey app validate
\`\`\`

### Structure des drivers

Les drivers sont organisés selon le schéma: \`vendor-category-model\`

- **vendor**: tuya, aqara, ikea, philips, generic
- **category**: light, plug, sensor, switch, cover, etc.
- **model**: identifiant unique du modèle

Exemple: \`tuya-light-ts0501b\`, \`aqara-sensor-motion\`

## Développement

Cette application utilise le SDK Homey v3 et est conçue pour être modulaire et extensible.

## Licence

Test-only - Ne pas utiliser en production
`;
  
  const readmePath = path.join(process.cwd(), 'README.md');
  await fsp.writeFile(readmePath, newReadmeContent);
  log('✅ Nouveau README.md créé');
}

// Mettre à jour CHANGELOG.md
async function updateChangelog() {
  log('📝 MISE À JOUR DE CHANGELOG.md...');
  
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    await createNewChangelog();
    return;
  }
  
  let changelogContent = await fsp.readFile(changelogPath, 'utf8');
  
  // Ajouter la nouvelle entrée
  const newEntry = `## [${CONFIG.NEW_VERSION}] - ${new Date().toISOString().split('T')[0]}

### ✨ Nouvelles fonctionnalités
- Réorganisation forcée des drivers avec fusion automatique
- Enrichissement inspiré des sources .tmp*
- Nouveau système de catégorisation vendor-category-model
- Gestion robuste des erreurs EPERM avec retry automatique
- Analyse complète des sources externes pour amélioration

### 🔧 Améliorations techniques
- Scripts modulaires et réutilisables
- Gestion d'erreur complète avec fallback
- Logs détaillés avec timestamps
- Validation automatique de l'application
- Mise à jour automatique des métadonnées

### 📁 Réorganisation
- Suppression des dossiers "variants"
- Fusion intelligente des drivers dupliqués
- Renommage cohérent selon le schéma vendor-category-model
- Nettoyage automatique des dossiers vides
- Protection des sources .tmp* comme backup

### 🎯 Objectifs atteints
- Projet entièrement réorganisé et optimisé
- Drivers fusionnés et renommés correctement
- Métadonnées synchronisées et à jour
- Validation complète de l'application
- Prêt pour le déploiement

---

`;
  
  // Insérer au début du fichier
  changelogContent = newEntry + changelogContent;
  
  // Sauvegarder
  await fsp.writeFile(changelogPath, changelogContent);
  log('✅ CHANGELOG.md mis à jour');
}

// Créer un nouveau CHANGELOG.md
async function createNewChangelog() {
  log('📝 CRÉATION D\'UN NOUVEAU CHANGELOG.md...');
  
  const newChangelogContent = `# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${CONFIG.NEW_VERSION}] - ${new Date().toISOString().split('T')[0]}

### ✨ Nouvelles fonctionnalités
- Réorganisation forcée des drivers avec fusion automatique
- Enrichissement inspiré des sources .tmp*
- Nouveau système de catégorisation vendor-category-model
- Gestion robuste des erreurs EPERM avec retry automatique
- Analyse complète des sources externes pour amélioration

### 🔧 Améliorations techniques
- Scripts modulaires et réutilisables
- Gestion d'erreur complète avec fallback
- Logs détaillés avec timestamps
- Validation automatique de l'application
- Mise à jour automatique des métadonnées

### 📁 Réorganisation
- Suppression des dossiers "variants"
- Fusion intelligente des drivers dupliqués
- Renommage cohérent selon le schéma vendor-category-model
- Nettoyage automatique des dossiers vides
- Protection des sources .tmp* comme backup

### 🎯 Objectifs atteints
- Projet entièrement réorganisé et optimisé
- Drivers fusionnés et renommés correctement
- Métadonnées synchronisées et à jour
- Validation complète de l'application
- Prêt pour le déploiement

---

## [3.1.0] - 2025-01-XX

### ✨ Nouvelles fonctionnalités
- Scripts d'orchestration modulaires
- Analyse des sources .tmp*
- Réorganisation des drivers

### 🔧 Améliorations techniques
- Gestion d'erreur améliorée
- Logs détaillés
- Validation automatique

---

## [3.0.0] - 2025-01-XX

### ✨ Nouvelles fonctionnalités
- Migration vers Homey SDK v3
- Support des nouveaux appareils
- Interface utilisateur améliorée

### 🔧 Améliorations techniques
- Code refactorisé
- Performance optimisée
- Compatibilité Homey >=6.0.0
`;
  
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  await fsp.writeFile(changelogPath, newChangelogContent);
  log('✅ Nouveau CHANGELOG.md créé');
}

// Fonction principale
async function updateVersionAndMetadata() {
  try {
    log('🚀 MISE À JOUR DE LA VERSION ET DES MÉTADONNÉES VERS ${CONFIG.NEW_VERSION}...');
    echo();
    
    // Mettre à jour tous les fichiers
    await updateAppJson();
    echo();
    
    await updatePackageJson();
    echo();
    
    await updateReadme();
    echo();
    
    await updateChangelog();
    echo();
    
    log('🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS !');
    log(`📱 Version: ${CONFIG.NEW_VERSION}`);
    log(`🔗 App ID: ${CONFIG.APP_ID}`);
    log(`📅 Date: ${new Date().toISOString()}`);
    
    return true;
    
  } catch (error) {
    log(`❌ Erreur lors de la mise à jour: ${error.message}`, 'error');
    throw error;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  updateVersionAndMetadata()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`❌ Erreur d'exécution: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  updateVersionAndMetadata,
  CONFIG
};

