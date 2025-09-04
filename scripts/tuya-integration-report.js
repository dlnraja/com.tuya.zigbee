#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');
const glob = promisify(require('glob'));

// Configuration
const CONFIG = {
  rootDir: __dirname,
  reportsDir: path.join(__dirname, 'reports'),
  driversDir: path.join(__dirname, 'drivers'),
  outputFile: 'tuya-integration-report.md',
  repoUrl: 'https://github.com/dlnraja/com.tuya.zigbee'
};

// Fonction pour analyser un driver
async function analyzeDriver(driverPath) {
  const driverName = path.basename(driverPath);
  const result = {
    name: driverName,
    hasConfig: false,
    hasIcons: false,
    issues: [],
    metadata: {}
  };

  try {
    // Vérifier le fichier de configuration
    const configPath = path.join(driverPath, 'driver.compose.json');
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    
    if (configExists) {
      result.hasConfig = true;
      const configContent = await fs.readFile(configPath, 'utf8');
      result.metadata = JSON.parse(configContent);
      
      // Vérifier les icônes
      const iconFiles = await glob(path.join(driverPath, '*.{png,svg,jpg,jpeg}'), { nocase: true });
      result.hasIcons = iconFiles.length > 0;
      
      if (!result.hasIcons) {
        result.issues.push('Aucune icône trouvée');
      }
      
      // Vérifier les champs obligatoires
      const requiredFields = ['id', 'class', 'name'];
      for (const field of requiredFields) {
        if (!result.metadata[field]) {
          result.issues.push(`Champ manquant: ${field}`);
        }
      }
      
      // Vérifier les capacités
      if (!result.metadata.capabilities || result.metadata.capabilities.length === 0) {
        result.issues.push('Aucune capacité définie');
      }
      
    } else {
      result.issues.push('Fichier de configuration manquant');
    }
  } catch (error) {
    result.issues.push(`Erreur d'analyse: ${error.message}`);
  }
  
  return result;
}

// Fonction pour générer le rapport Markdown
function generateMarkdownReport(drivers) {
  const now = new Date().toISOString();
  const validDrivers = drivers.filter(d => d.issues.length === 0);
  const invalidDrivers = drivers.filter(d => d.issues.length > 0);
  
  let report = `# Rapport d'Integration Tuya Zigbee

**Généré le:** ${now}  
**Dépôt:** [${CONFIG.repoUrl}](${CONFIG.repoUrl})

## 📊 Résumé

`;
  
  // Statistiques
  report += `- **Total des drivers:** ${drivers.length}\n`;
  report += `- **Drivers valides:** ${validDrivers.length} (${Math.round((validDrivers.length / drivers.length) * 100 || 0)}%)\n`;
  report += `- **Drivers avec problèmes:** ${invalidDrivers.length}\n\n`;
  
  // Tableau des drivers
  report += '## 📋 Liste des Drivers\n\n';
  report += '| Nom | Statut | Problèmes |\n';
  report += '|-----|--------|-----------|\n';
  
  for (const driver of drivers) {
    const status = driver.issues.length === 0 ? '✅ Valide' : `❌ ${driver.issues.length} problème(s)`;
    const issues = driver.issues.length > 0 ? driver.issues.join('<br>') : 'Aucun';
    report += `| ${driver.name} | ${status} | ${issues} |\n`;
  }
  
  // Détails des problèmes
  if (invalidDrivers.length > 0) {
    report += '\n## ⚠️ Problèmes Détail\n\n';
    
    for (const driver of invalidDrivers) {
      report += `### ${driver.name}\n`;
      for (const issue of driver.issues) {
        report += `- ${issue}\n`;
      }
      report += '\n';
    }
  }
  
  // Recommandations
  report += '## 🚀 Recommandations\n\n';
  report += '1. **Corriger les problèmes critiques**\n';
  report += `   - ${invalidDrivers.length} drivers nécessitent une attention immédiate\n`;
  report += '   - Mettre à jour les configurations manquantes ou invalides\n\n';
  
  report += '2. **Gestion des icônes**\n';
  report += `   - ${drivers.filter(d => !d.hasIcons).length} drivers n'ont pas d'icônes\n`;
  report += '   - Standardiser le format des icônes (PNG recommandé)\n\n';
  
  report += '3. **Validation des drivers**\n';
  report += '   - Implémenter des tests automatisés\n';
  report += '   - Vérifier la compatibilité avec les appareils cibles\n\n';
  
  report += '4. **Documentation**\n';
  report += '   - Mettre à jour la documentation pour refléter les changements\n';
  report += '   - Documenter les exigences pour les nouveaux drivers\n\n';
  
  report += '---\n';
  report += '*Rapport généré automatiquement - Tuya Zigbee Integration*\n';
  
  return report;
}

// Fonction principale
async function main() {
  try {
    console.log('🚀 Démarrage de la génération du rapport...');
    
    // Créer le dossier des rapports s'il n'existe pas
    await fs.mkdir(CONFIG.reportsDir, { recursive: true });
    
    // Vérifier si le dossier des drivers existe
    try {
      await fs.access(CONFIG.driversDir);
    } catch (error) {
      console.error(`❌ Erreur: Le dossier des drivers n'existe pas: ${CONFIG.driversDir}`);
      process.exit(1);
    }
    
    // Lire les dossiers de drivers
    const driverDirs = (await fs.readdir(CONFIG.driversDir, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(CONFIG.driversDir, dirent.name));
    
    console.log(`🔍 ${driverDirs.length} drivers trouvés à analyser...`);
    
    // Analyser chaque driver
    const drivers = [];
    for (let i = 0; i < driverDirs.length; i++) {
      const dir = driverDirs[i];
      process.stdout.write(`\r📊 Analyse en cours... ${i + 1}/${driverDirs.length}`);
      drivers.push(await analyzeDriver(dir));
    }
    
    console.log('\n📝 Génération du rapport...');
    
    // Générer et sauvegarder le rapport
    const report = generateMarkdownReport(drivers);
    const reportPath = path.join(CONFIG.reportsDir, CONFIG.outputFile);
    
    await fs.writeFile(reportPath, report, 'utf8');
    console.log(`\n✅ Rapport généré avec succès: ${reportPath}`);
    
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
      console.log('\n⚠️ Impossible d\'ouvrir le rapport automatiquement. Veuillez l\'ouvrir manuellement.');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la génération du rapport:', error);
    process.exit(1);
  }
}

// Démarrer le processus
main();
