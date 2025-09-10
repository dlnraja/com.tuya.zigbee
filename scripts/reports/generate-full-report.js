#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  reportsDir: path.join(__dirname, '..', 'reports'),
  driversDir: path.join(__dirname, '..', 'drivers'),
  outputFile: path.join('reports', 'integration-report.md'),
  
  // Sources externes
  sources: {
    blakadder: 'https://zigbee.blakadder.com/tuya.json',
    z2m: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    githubIssues: 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/issues?per_page=200',
    githubRepo: 'https://api.github.com/repos/dlnraja/com.tuya.zigbee'
  },
  
  // Fichiers de sortie
  outputFiles: {
    blakadder: 'blakadder-devices.json',
    z2m: 'z2m-devices.ts',
    issues: 'github-issues.json',
    report: 'integration-report.md'
  }
};

// Créer les dossiers nécessaires
function setupDirectories() {
  [CONFIG.reportsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Récupérer les données des sources externes
async function fetchExternalData() {
  console.log('🔄 Récupération des données externes...');
  
  try {
    // Récupérer les données de Blakadder
    console.log('  - Récupération des données Blakadder...');
    const blakadderData = await axios.get(CONFIG.sources.blakadder);
    fs.writeFileSync(
      path.join(CONFIG.reportsDir, CONFIG.outputFiles.blakadder),
      JSON.stringify(blakadderData.data, null, 2)
    );

    // Récupérer les données de Zigbee2MQTT
    console.log('  - Récupération des données Zigbee2MQTT...');
    const z2mData = await axios.get(CONFIG.sources.z2m);
    fs.writeFileSync(
      path.join(CONFIG.reportsDir, CONFIG.outputFiles.z2m),
      z2mData.data
    );

    // Récupérer les issues GitHub
    console.log('  - Récupération des issues GitHub...');
    const issuesData = await axios.get(CONFIG.sources.githubIssues, {
      headers: { 'User-Agent': 'Tuya-Integration-Report' }
    });
    fs.writeFileSync(
      path.join(CONFIG.reportsDir, CONFIG.outputFiles.issues),
      JSON.stringify(issuesData.data, null, 2)
    );
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données:', error.message);
    return false;
  }
}

// Analyser les drivers locaux
function analyzeLocalDrivers() {
  console.log('🔍 Analyse des drivers locaux...');
  
  const drivers = [];
  const driverDirs = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  driverDirs.forEach(driverName => {
    const driverPath = path.join(CONFIG.driversDir, driverName);
    const configPath = path.join(driverPath, 'driver.compose.json');
    
    const driverInfo = {
      name: driverName,
      hasConfig: false,
      hasIcons: false,
      issues: [],
      metadata: {}
    };
    
    // Vérifier le fichier de configuration
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        driverInfo.hasConfig = true;
        driverInfo.metadata = config;
        
        // Vérifier les icônes
        if (config.images) {
          const smallIcon = path.join(driverPath, config.images.small || '');
          const largeIcon = path.join(driverPath, config.images.large || '');
          
          driverInfo.hasIcons = fs.existsSync(smallIcon) && fs.existsSync(largeIcon);
          
          if (!fs.existsSync(smallIcon)) driverInfo.issues.push(`Icône manquante: ${config.images.small}`);
          if (!fs.existsSync(largeIcon)) driverInfo.issues.push(`Icône manquante: ${config.images.large}`);
        } else {
          driverInfo.issues.push("Section 'images' manquante dans la configuration");
        }
        
      } catch (error) {
        driverInfo.issues.push(`Erreur de lecture du fichier de configuration: ${error.message}`);
      }
    } else {
      driverInfo.issues.push("Fichier de configuration manquant");
    }
    
    drivers.push(driverInfo);
  });
  
  return drivers;
}

// Générer la matrice des appareils
function generateDeviceMatrix(drivers) {
  console.log('📊 Génération de la matrice des appareils...');
  
  const headers = [
    'ID', 'Device', 'Manufacturer', 'ProductId', 'Clusters', 
    'Datapoints', 'Capabilities', 'Traductions', 'Icone', 'Code', 'Source'
  ];
  
  const rows = drivers.map((driver, index) => {
    const metadata = driver.metadata || {};
    const zigbee = metadata.zigbee || {};
    
    return [
      index + 1,
      metadata.name?.en || driver.name,
      zigbee.manufacturerName?.[0] || '?',
      zigbee.productId?.[0] || '?',
      zigbee.endpoints ? Object.keys(zigbee.endpoints).length + ' endpoints' : '?',
      metadata.capabilities ? metadata.capabilities.length + ' capabilities' : '?',
      metadata.capabilities ? metadata.capabilities.join(', ') : '?',
      metadata.name ? Object.keys(metadata.name).join(', ') : '?',
      driver.hasIcons ? '✅' : '❌',
      driver.hasConfig ? '✅' : '❌',
      'local'
    ];
  });
  
  return { headers, rows };
}

// Générer le rapport Markdown
function generateMarkdownReport(matrix, drivers) {
  console.log('📝 Génération du rapport Markdown...');
  
  const now = new Date().toISOString();
  const validDrivers = drivers.filter(d => d.hasConfig && d.issues.length === 0).length;
  const driversWithIssues = drivers.filter(d => d.issues.length > 0);
  
  let markdown = `# Rapport d'Intégration Tuya Zigbee

**Date de génération:** ${now}  
**Dépôt:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)

## 📊 Résumé

- **Nombre total de drivers:** ${drivers.length}
- **Drivers valides:** ${validDrivers} (${Math.round((validDrivers / drivers.length) * 100)}%)
- **Drivers avec problèmes:** ${driversWithIssues.length}

## 📋 Matrice des Appareils

`;

  // Ajouter la matrice au format Markdown
  markdown += `| ${matrix.headers.join(' | ')} |\n`;
  markdown += `|${' --- |'.repeat(matrix.headers.length)}\n`;
  
  matrix.rows.forEach(row => {
    markdown += `| ${row.join(' | ')} |\n`;
  });
  
  // Ajouter la section des problèmes
  if (driversWithIssues.length > 0) {
    markdown += '\n## ⚠️ Problèmes Identifiés\n\n';
    
    driversWithIssues.forEach(driver => {
      markdown += `### ${driver.name}\n`;
      markdown += driver.issues.map(issue => `- ${issue}`).join('\n');
      markdown += '\n\n';
    });
  }
  
  // Ajouter les recommandations
  markdown += `## 🚀 Recommandations

1. **Corriger les problèmes critiques**
   - ${driversWithIssues.length} drivers nécessitent une attention immédiate
   - Mettre à jour les configurations manquantes ou invalides

2. **Gestion des icônes**
   - Standardiser le format des icônes (PNG recommandé)
   - S'assurer que tous les drivers ont des icônes aux bonnes tailles

3. **Validation des drivers**
   - Implémenter des tests automatisés
   - Vérifier la compatibilité avec les appareils cibles

4. **Documentation**
   - Mettre à jour la documentation pour refléter les changements
   - Documenter les exigences pour les nouveaux drivers

---
*Rapport généré automatiquement - Tuya Zigbee Integration*`;
  
  return markdown;
}

// Fonction principale
async function main() {
  console.log('🚀 Démarrage de la génération du rapport...');
  
  // 1. Configurer les dossiers
  setupDirectories();
  
  // 2. Récupérer les données externes
  const externalDataFetched = await fetchExternalData();
  if (!externalDataFetched) {
    console.warn('⚠️ Certaines données externes n\'ont pas pu être récupérées');
  }
  
  // 3. Analyser les drivers locaux
  const drivers = analyzeLocalDrivers();
  
  // 4. Générer la matrice des appareils
  const deviceMatrix = generateDeviceMatrix(drivers);
  
  // 5. Générer le rapport Markdown
  const report = generateMarkdownReport(deviceMatrix, drivers);
  
  // 6. Enregistrer le rapport
  const reportPath = path.join(CONFIG.rootDir, CONFIG.outputFile);
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log(`\n✅ Rapport généré avec succès: ${reportPath}`);
  
  // 7. Mettre à jour la liste des tâches
  todo_list({
    todos: [
      { id: "1", content: "Créer un script principal pour générer le rapport d'intégration complet", status: "completed", priority: "high" },
      { id: "2", content: "Implémenter le scraping des sources externes (GitHub, Blakadder, etc.)", status: "completed", priority: "high" },
      { id: "3", content: "Générer la matrice maître des appareils", status: "completed", priority: "high" },
      { id: "4", content: "Identifier et documenter les trous dans les données", status: "in_progress", priority: "medium" },
      { id: "5", content: "Créer un script de mise à jour automatique", status: "pending", priority: "high" },
      { id: "6", content: "Mettre à jour la documentation", status: "pending", priority: "medium" },
      { id: "7", content: "Tester l'ensemble des fonctionnalités", status: "pending", priority: "high" }
    ]
  });
}

// Démarrer le processus
main().catch(error => {
  console.error('❌ Erreur lors de la génération du rapport:', error);
  process.exit(1);
});
