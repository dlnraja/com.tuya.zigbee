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
        
        if (!fs.existsSync(smallIcon)) result.issues.push(`Icône manquante: ${config.images.small}`);
        if (!fs.existsSync(largeIcon)) result.issues.push(`Icône manquante: ${config.images.large}`);
      } else {
        result.issues.push("Section 'images' manquante dans la configuration");
      }
      
      // Vérifier les champs obligatoires
      const requiredFields = ['id', 'class', 'name'];
      requiredFields.forEach(field => {
        if (!config[field]) {
          result.issues.push(`Champ obligatoire manquant: ${field}`);
        }
      });
      
    } catch (error) {
      result.issues.push(`Erreur de lecture du fichier de configuration: ${error.message}`);
    }
  } else {
    result.issues.push("Fichier de configuration manquant");
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
**Dépôt:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)

## 📊 Résumé

- **Total des drivers:** ${drivers.length}
- **Drivers valides:** ${validDrivers.length} (${Math.round((validDrivers.length / drivers.length) * 100 || 0)}%)
- **Drivers avec problèmes:** ${invalidDrivers.length}

## 📋 Liste des Drivers

| Nom | Statut | Problèmes |
|-----|--------|-----------|
`;
  
  // Ajouter chaque driver au rapport
  drivers.forEach(driver => {
    const status = driver.issues.length === 0 ? '✅ Valide' : `❌ ${driver.issues.length} problème(s)`;
    const issues = driver.issues.length > 0 ? driver.issues.join('<br>') : 'Aucun';
    report += `| ${driver.name} | ${status} | ${issues} |\n`;
  });
  
  // Ajouter la section des problèmes détaillés
  if (invalidDrivers.length > 0) {
    report += '\n## ⚠️ Problèmes Détailés\n\n';
    
    invalidDrivers.forEach(driver => {
      report += `### ${driver.name}\n`;
      driver.issues.forEach(issue => {
        report += `- ${issue}\n`;
      });
      report += '\n';
    });
  }
  
  // Ajouter les recommandations
  report += `## 🚀 Recommandations

1. **Corriger les problèmes critiques**
   - ${invalidDrivers.length} drivers nécessitent une attention immédiate
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
*Rapport généré automatiquement - Intégration Tuya Zigbee*
`;
  
  return report;
}

// Fonction principale
function main() {
  console.log('🚀 Démarrage de la génération du rapport...');
  
  // Créer le dossier des rapports s'il n'existe pas
  if (!fs.existsSync(CONFIG.reportsDir)) {
    fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
  }
  
  // Vérifier si le dossier des drivers existe
  if (!fs.existsSync(CONFIG.driversDir)) {
    console.error(`❌ Erreur: Le dossier des drivers n'existe pas: ${CONFIG.driversDir}`);
    process.exit(1);
  }
  
  // Lire les dossiers de drivers
  const driverDirs = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(CONFIG.driversDir, dirent.name));
  
  console.log(`🔍 ${driverDirs.length} drivers trouvés à analyser...`);
  
  // Analyser chaque driver
  const drivers = [];
  driverDirs.forEach((dir, index) => {
    process.stdout.write(`\r📊 Analyse en cours... ${index + 1}/${driverDirs.length}`);
    drivers.push(analyzeDriver(dir));
  });
  
  console.log('\n📝 Génération du rapport...');
  
  // Générer et sauvegarder le rapport
  const report = generateMarkdownReport(drivers);
  const reportPath = path.join(CONFIG.reportsDir, CONFIG.outputFile);
  
  try {
    fs.writeFileSync(reportPath, report, 'utf8');
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
    console.error(`\n❌ Erreur lors de l'enregistrement du rapport: ${error.message}`);
    process.exit(1);
  }
}

// Démarrer le processus
main().catch(error => {
  console.error('❌ Erreur lors de la génération du rapport:', error);
  process.exit(1);
});
