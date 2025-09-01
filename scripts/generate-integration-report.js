const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  outputDir: path.join(__dirname, '../reports'),
  repoUrl: 'https://github.com/dlnraja/com.tuya.zigbee',
  sources: {
    blakadder: 'https://zigbee.blakadder.com/tuya.json',
    z2m: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    issues: 'https://api.github.com/repos/dlnraja/com.tuya.zigbee/issues?per_page=200&state=all'
  },
  reportFile: 'integration-report.md',
  matrixFile: 'device-matrix.csv'
};

// Fonction pour récupérer les données des sources externes
async function fetchExternalData() {
  console.log('🔍 Récupération des données externes...');
  
  try {
    const [blakadderRes, z2mRes, issuesRes] = await Promise.all([
      axios.get(CONFIG.sources.blakadder),
      axios.get(CONFIG.sources.z2m),
      axios.get(CONFIG.sources.issues, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      })
    ]);

    return {
      blakadder: blakadderRes.data,
      z2m: z2mRes.data,
      issues: issuesRes.data
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des données externes:', error.message);
    return { blakadder: [], z2m: '', issues: [] };
  }
}

// Analyser les drivers locaux
function analyzeLocalDrivers() {
  console.log('🔍 Analyse des drivers locaux...');
  
  const driversDir = path.join(CONFIG.rootDir, 'drivers');
  const drivers = [];
  
  fs.readdirSync(driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .forEach(dirent => {
      const driverPath = path.join(driversDir, dirent.name);
      const configPath = path.join(driverPath, 'driver.compose.json');
      
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          drivers.push({
            id: config.id || dirent.name,
            name: dirent.name,
            config: config,
            hasIcon: checkDriverIcons(driverPath, config),
            hasTranslations: checkTranslations(config)
          });
        } catch (error) {
          console.error(`Erreur lors de l'analyse du driver ${dirent.name}:`, error.message);
        }
      }
    });
  
  return drivers;
}

// Vérifier les icônes du driver
function checkDriverIcons(driverPath, config) {
  if (!config.images) return false;
  
  const iconPaths = [
    path.join(driverPath, config.images.small || ''),
    path.join(driverPath, config.images.large || '')
  ];
  
  return iconPaths.every(iconPath => fs.existsSync(iconPath));
}

// Vérifier les traductions
function checkTranslations(config) {
  if (!config.name || typeof config.name !== 'object') return 0;
  return Object.keys(config.name).length;
}

// Générer la matrice des appareils
function generateDeviceMatrix(drivers, externalData) {
  console.log('📊 Génération de la matrice des appareils...');
  
  const headers = [
    'ID', 'Device', 'Manufacturer', 'ProductId', 'Clusters', 
    'Datapoints', 'Capabilities', 'Traductions', 'Icone', 'Code', 'Source', 'MissingFields'
  ];
  
  const rows = drivers.map((driver, index) => {
    const config = driver.config;
    const zigbee = config.zigbee || {};
    
    // Détecter les champs manquants
    const missingFields = [];
    if (!driver.hasIcon) missingFields.push('icon');
    if (driver.hasTranslations < 5) missingFields.push('translations');
    
    return [
      index + 1,
      config.name?.en || driver.name,
      zigbee.manufacturerName?.[0] || 'N/A',
      zigbee.productId?.[0] || 'N/A',
      zigbee.endpoints ? Object.values(zigbee.endpoints).flat().join(',') : 'N/A',
      'N/A', // Datapoints
      config.capabilities?.join(',') || 'N/A',
      driver.hasTranslations,
      driver.hasIcon ? '✅' : '❌',
      '✅', // Code toujours présent
      'GitHub',
      missingFields.join(',')
    ];
  });
  
  return { headers, rows };
}

// Générer le rapport Markdown
function generateMarkdownReport(matrix, drivers, externalData) {
  console.log('📝 Génération du rapport...');
  
  let report = `# 🚀 Rapport d'Intégration Tuya Zigbee

`;
  
  // En-tête
  report += `**Date:** ${new Date().toISOString()}\n`;
  report += `**Dépôt:** ${CONFIG.repoUrl}\n`;
  report += `**Commit:** ${getCurrentCommitHash()}\n\n`;
  
  // Résumé
  report += `## 📊 Résumé\n\n`;
  report += `- **Total des drivers:** ${drivers.length}\n`;
  report += `- **Drivers avec icônes:** ${drivers.filter(d => d.hasIcon).length}\n`;
  report += `- **Moyenne des traductions par driver:** ${(drivers.reduce((sum, d) => sum + d.hasTranslations, 0) / drivers.length).toFixed(1)}\n\n`;
  
  // Matrice des appareils
  report += `## 📋 Matrice des Appareils\n\n`;
  report += generateMarkdownTable(matrix.headers, matrix.rows);
  
  // Problèmes identifiés
  report += `\n## ⚠️ Problèmes Identifiés\n\n`;
  
  const issues = [];
  drivers.forEach((driver, index) => {
    if (!driver.hasIcon) {
      issues.push(`- ❌ **${driver.name}**: Icône manquante`);
    }
    if (driver.hasTranslations < 5) {
      issues.push(`- 🌐 **${driver.name}**: Traductions manquantes (${driver.hasTranslations}/5)`);
    }
  });
  
  report += issues.length > 0 ? issues.join('\n') : 'Aucun problème critique identifié.';
  
  // Sources externes
  report += `\n\n## 🔗 Sources Externes\n\n`;
  report += `- **Blakadder:** ${CONFIG.sources.blakadder}\n`;
  report += `- **Zigbee2MQTT:** ${CONFIG.sources.z2m}\n`;
  report += `- **Issues GitHub:** ${CONFIG.sources.issues}\n`;
  
  return report;
}

// Générer un tableau Markdown
function generateMarkdownTable(headers, rows) {
  let table = `| ${headers.join(' | ')} |\n`;
  table += `|${' --- |'.repeat(headers.length)}\n`;
  
  rows.forEach(row => {
    table += `| ${row.join(' | ')} |\n`;
  });
  
  return table;
}

// Obtenir le hash du commit actuel
function getCurrentCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    return 'N/A';
  }
}

// Fonction principale
async function main() {
  try {
    // Créer le dossier de sortie s'il n'existe pas
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Récupérer les données externes
    const externalData = await fetchExternalData();
    
    // Analyser les drivers locaux
    const drivers = analyzeLocalDrivers();
    
    // Générer la matrice des appareils
    const matrix = generateDeviceMatrix(drivers, externalData);
    
    // Générer le rapport Markdown
    const markdown = generateMarkdownReport(matrix, drivers, externalData);
    
    // Enregistrer les fichiers
    const reportPath = path.join(CONFIG.outputDir, CONFIG.reportFile);
    fs.writeFileSync(reportPath, markdown);
    
    const matrixPath = path.join(CONFIG.outputDir, CONFIG.matrixFile);
    const csvContent = [
      matrix.headers.join(','),
      ...matrix.rows.map(row => row.join(','))
    ].join('\n');
    fs.writeFileSync(matrixPath, csvContent);
    
    console.log(`\n✅ Rapport généré avec succès !`);
    console.log(`📄 Rapport: ${reportPath}`);
    console.log(`📊 Matrice: ${matrixPath}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport:', error);
    process.exit(1);
  }
}

// Démarrer le processus
main();
