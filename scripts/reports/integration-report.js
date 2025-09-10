#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  rootDir: __dirname,
  reportsDir: path.join(__dirname, 'reports'),
  driversDir: path.join(__dirname, 'drivers'),
  outputFile: 'tuya-integration-report.md'
};

// Fonction pour analyser un driver
function analyzeDriver(driverPath) {
  const driverName = path.basename(driverPath);
  const configPath = path.join(driverPath, 'driver.compose.json');
  
  const result = {
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
      result.hasConfig = true;
      result.metadata = config;
      
      // Vérifier les icônes
      if (config.images) {
        const smallIcon = path.join(driverPath, config.images.small || '');
        const largeIcon = path.join(driverPath, config.images.large || '');
        
        result.hasIcons = fs.existsSync(smallIcon) && fs.existsSync(largeIcon);
        
        if (!fs.existsSync(smallIcon)) result.issues.push(`Missing icon: ${config.images.small}`);
        if (!fs.existsSync(largeIcon)) result.issues.push(`Missing icon: ${config.images.large}`);
      } else {
        result.issues.push("Missing 'images' section in config");
      }
      
      // Vérifier les champs obligatoires
      const requiredFields = ['id', 'class', 'name'];
      requiredFields.forEach(field => {
        if (!config[field]) {
          result.issues.push(`Missing required field: ${field}`);
        }
      });
      
    } catch (error) {
      result.issues.push(`Error reading config: ${error.message}`);
    }
  } else {
    result.issues.push("Missing driver.compose.json");
  }
  
  return result;
}

// Fonction pour générer le rapport Markdown
function generateReport(drivers) {
  const now = new Date().toISOString();
  const validDrivers = drivers.filter(d => d.issues.length === 0);
  const invalidDrivers = drivers.filter(d => d.issues.length > 0);
  
  let report = `# Tuya Zigbee Integration Report

**Generated:** ${now}  
**Repository:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)

## 📊 Summary

- **Total Drivers:** ${drivers.length}
- **Valid Drivers:** ${validDrivers.length} (${Math.round((validDrivers.length / drivers.length) * 100)}%)
- **Drivers with Issues:** ${invalidDrivers.length}

## 📋 Drivers List

| Name | Status | Issues |
|------|--------|--------|
`;

  // Ajouter chaque driver au rapport
  drivers.forEach(driver => {
    const status = driver.issues.length === 0 ? '✅ Valid' : `❌ ${driver.issues.length} issue(s)`;
    const issues = driver.issues.length > 0 ? driver.issues.join('<br>') : 'None';
    report += `| ${driver.name} | ${status} | ${issues} |\n`;
  });

  // Ajouter la section des problèmes détaillés
  if (invalidDrivers.length > 0) {
    report += '\n## ⚠️ Detailed Issues\n\n';
    
    invalidDrivers.forEach(driver => {
      report += `### ${driver.name}\n`;
      report += '- ' + driver.issues.join('\n- ') + '\n\n';
    });
  }

  // Ajouter les recommandations
  report += `## 🚀 Recommendations

1. **Fix Critical Issues**
   - ${invalidDrivers.length} drivers need attention
   - Update missing or invalid configurations

2. **Icon Management**
   - Standardize icon formats (recommended: PNG)
   - Ensure all drivers have properly sized icons

3. **Driver Validation**
   - Implement automated testing
   - Verify device compatibility

4. **Documentation**
   - Update documentation to reflect changes
   - Document requirements for new drivers

---
*Report generated automatically - Tuya Zigbee Integration*`;

  return report;
}

// Fonction principale
function main() {
  console.log('🚀 Starting Tuya Integration Report Generation...');
  
  // Créer le dossier des rapports s'il n'existe pas
  if (!fs.existsSync(CONFIG.reportsDir)) {
    fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
  }
  
  // Lire les dossiers de drivers
  const driverDirs = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(CONFIG.driversDir, dirent.name));
  
  console.log(`🔍 Found ${driverDirs.length} drivers to analyze...`);
  
  // Analyser chaque driver
  const drivers = [];
  driverDirs.forEach((dir, index) => {
    process.stdout.write(`\r📊 Analyzing drivers... ${index + 1}/${driverDirs.length}`);
    drivers.push(analyzeDriver(dir));
  });
  
  console.log('\n📝 Generating report...');
  
  // Générer et sauvegarder le rapport
  const report = generateReport(drivers);
  const reportPath = path.join(CONFIG.reportsDir, CONFIG.outputFile);
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log(`\n✅ Report generated successfully: ${reportPath}`);
  
  // Ouvrir le rapport dans l'éditeur par défaut
  try {
    if (process.platform === 'win32') {
      execSync(`start "" "${reportPath}"`, { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      execSync(`open "${reportPath}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${reportPath}"`, { stdio: 'ignore' });
    }
  } catch (error) {
    console.log('\n⚠️ Could not open report automatically. Please open it manually.');
  }
}

// Démarrer le processus
main().catch(error => {
  console.error('❌ Error generating report:', error);
  process.exit(1);
});
