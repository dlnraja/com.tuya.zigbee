const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  outputDir: path.join(__dirname, '../reports'),
  reportFile: 'local-report.md'
};

// Analyser un driver
function analyzeDriver(driverName) {
  const driverPath = path.join(CONFIG.rootDir, 'drivers', driverName);
  const configPath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Vérifier les icônes
    let hasIcon = false;
    if (config.images) {
      const smallIcon = path.join(driverPath, config.images.small || '');
      const largeIcon = path.join(driverPath, config.images.large || '');
      hasIcon = fs.existsSync(smallIcon) && fs.existsSync(largeIcon);
    }
    
    // Compter les traductions
    const translationCount = (config.name && typeof config.name === 'object') 
      ? Object.keys(config.name).length 
      : 0;
    
    return {
      name: driverName,
      hasConfig: true,
      hasIcon,
      translationCount,
      capabilities: Array.isArray(config.capabilities) ? config.capabilities : [],
      zigbee: config.zigbee || {}
    };
  } catch (error) {
    console.error(`Erreur avec le driver ${driverName}:`, error.message);
    return {
      name: driverName,
      hasConfig: false,
      error: error.message
    };
  }
}

// Générer le rapport
function generateReport(drivers) {
  const date = new Date().toISOString();
  let report = `# Rapport d'Analyse des Drivers Tuya Zigbee

**Généré le:** ${date}
**Nombre de drivers analysés:** ${drivers.length}

`;

  // Tableau de synthèse
  report += '## 📊 Synthèse

';
  report += '| Driver | Icône | Traductions | Capacités | Statut |\n';
  report += '|--------|-------|-------------|------------|---------|\n';
  
  drivers.forEach(driver => {
    if (!driver.hasConfig) {
      report += `| ${driver.name} | ❌ | ❌ | ❌ | Erreur: ${driver.error} |\n`;
      return;
    }
    
    const iconStatus = driver.hasIcon ? '✅' : '❌';
    const translations = driver.translationCount > 0 ? `✅ (${driver.translationCount})` : '❌';
    const capabilities = driver.capabilities.length > 0 
      ? `✅ (${driver.capabilities.length})` 
      : '❌';
    
    report += `| ${driver.name} | ${iconStatus} | ${translations} | ${capabilities} | OK |\n`;
  });

  // Détails par driver
  report += '\n## 🔍 Détails par Driver\n\n';
  
  drivers.forEach(driver => {
    if (!driver.hasConfig) return;
    
    report += `### ${driver.name}\n`;
    report += `- **Icône:** ${driver.hasIcon ? '✅ Présente' : '❌ Manquante'}\n`;
    report += `- **Traductions:** ${driver.translationCount} langues\n`;
    report += `- **Capacités (${driver.capabilities.length}):** ${driver.capabilities.join(', ') || 'Aucune'}\n`;
    
    if (driver.zigbee.manufacturerName) {
      report += `- **Fabricant:** ${driver.zigbee.manufacturerName.join(', ')}\n`;
    }
    
    if (driver.zigbee.productId) {
      report += `- **ID Produit:** ${driver.zigbee.productId.join(', ')}\n`;
    }
    
    report += '\n';
  });
  
  return report;
}

// Fonction principale
function main() {
  try {
    // Créer le dossier de sortie
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Lister les dossiers de drivers
    const driverDirs = fs.readdirSync(path.join(CONFIG.rootDir, 'drivers'), { 
      withFileTypes: true 
    })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
    
    console.log(`Analyse de ${driverDirs.length} drivers...`);
    
    // Analyser chaque driver
    const drivers = driverDirs.map(driverName => analyzeDriver(driverName)).filter(Boolean);
    
    // Générer le rapport
    const report = generateReport(drivers);
    
    // Enregistrer le rapport
    const reportPath = path.join(CONFIG.outputDir, CONFIG.reportFile);
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n✅ Rapport généré avec succès !`);
    console.log(`📄 Chemin: ${reportPath}`);
    
    // Afficher un aperçu
    console.log('\n--- APERÇU DU RAPPORT ---');
    console.log(report.substring(0, 1000) + '...');
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport:', error);
    process.exit(1);
  }
}

// Démarrer l'analyse
main();
