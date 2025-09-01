const fs = require('fs');
const path = require('path');

// Configuration
const DRIVERS_DIR = path.join(__dirname, 'drivers');
const REPORT_FILE = path.join(__dirname, 'tuya-scan-report.txt');

// Fonction pour vérifier si un dossier existe
function dirExists(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch (e) {
    return false;
  }
}

// Fonction pour lister les dossiers de drivers
function listDriverDirs() {
  if (!dirExists(DRIVERS_DIR)) {
    console.error(`Erreur: Le dossier des drivers n'existe pas: ${DRIVERS_DIR}`);
    process.exit(1);
  }
  
  return fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

// Fonction pour analyser un driver
function analyzeDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const result = {
    name: driverName,
    hasConfig: false,
    hasIcons: false,
    issues: []
  };
  
  // Vérifier le fichier de configuration
  const configPath = path.join(driverPath, 'driver.compose.json');
  if (fs.existsSync(configPath)) {
    result.hasConfig = true;
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Vérifier les champs obligatoires
      if (!config.id) result.issues.push('ID manquant');
      if (!config.class) result.issues.push('Classe manquante');
      if (!config.name) result.issues.push('Nom manquant');
      
      // Vérifier les icônes
      const iconPath = path.join(driverPath, 'assets', 'icon.svg');
      const largeIconPath = path.join(driverPath, 'assets', 'images', 'large.png');
      
      result.hasIcons = fs.existsSync(iconPath) && fs.existsSync(largeIconPath);
      
      if (!result.hasIcons) {
        result.issues.push('Icônes manquantes');
      }
      
    } catch (e) {
      result.issues.push(`Erreur de configuration: ${e.message}`);
    }
  } else {
    result.issues.push('Fichier de configuration manquant');
  }
  
  return result;
}

// Générer le rapport
function generateReport(drivers) {
  const now = new Date().toISOString();
  const validDrivers = drivers.filter(d => d.issues.length === 0);
  const invalidDrivers = drivers.filter(d => d.issues.length > 0);
  
  let report = [
    '='.repeat(50),
    '  RAPPORT D\'INTÉGRATION TUYA ZIGBEE',
    '='.repeat(50),
    `Généré le: ${now}\n`,
    `Dépôt: https://github.com/dlnraja/com.tuya.zigbee\n`,
    '='.repeat(50),
    `Total des drivers: ${drivers.length}`,
    `Drivers valides: ${validDrivers.length} (${Math.round((validDrivers.length / drivers.length) * 100)}%)`,
    `Drivers avec problèmes: ${invalidDrivers.length}\n`,
    '='.repeat(50) + '\n'
  ];
  
  // Détails des drivers
  report.push('DÉTAILS DES DRIVERS\n');
  
  for (const driver of drivers) {
    const status = driver.issues.length === 0 ? '✅ VALIDE' : '❌ PROBLÈMES';
    report.push(`[${status}] ${driver.name}`);
    
    if (driver.issues.length > 0) {
      for (const issue of driver.issues) {
        report.push(`  - ${issue}`);
      }
    }
    
    report.push('');
  }
  
  // Recommandations
  report.push(...[
    '='.repeat(50),
    'RECOMMANDATIONS',
    '='.wide(50),
    '1. Corriger les problèmes critiques',
    `   - ${invalidDrivers.length} drivers nécessitent une attention immédiate`,
    '   - Mettre à jour les configurations manquantes ou invalides\n',
    
    '2. Gestion des icônes',
    `   - ${drivers.filter(d => !d.hasIcons).length} drivers n'ont pas d'icônes`,
    '   - Standardiser le format des icônes (SVG + PNG)\n',
    
    '3. Validation des drivers',
    '   - Implémenter des tests automatisés',
    '   - Vérifier la compatibilité avec les appareils cibles\n',
    
    '4. Documentation',
    '   - Mettre à jour la documentation pour refléter les changements',
    '   - Documenter les exigences pour les nouveaux drivers\n',
    
    '='.repeat(50),
    'FIN DU RAPPORT',
    '='.repeat(50)
  ]);
  
  return report.join('\n');
}

// Fonction principale
function main() {
  console.log('🚀 Démarrage de l\'analyse...');
  
  // Lire les dossiers de drivers
  const driverDirs = listDriverDirs();
  console.log(`🔍 ${driverDirs.length} drivers trouvés`);
  
  // Analyser chaque driver
  console.log('📊 Analyse en cours...');
  const results = [];
  
  for (const dir of driverDirs) {
    process.stdout.write(`\r   ${dir}...`);
    results.push(analyzeDriver(dir));
  }
  
  // Générer le rapport
  console.log('\n📝 Génération du rapport...');
  const report = generateReport(results);
  
  // Sauvegarder le rapport
  fs.writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`✅ Rapport généré avec succès: ${REPORT_FILE}`);
  
  // Afficher un résumé
  const validCount = results.filter(r => r.issues.length === 0).length;
  console.log(`\nRÉSUMÉ:`);
  console.log(`- Total: ${results.length}`);
  console.log(`- Valides: ${validCount} (${Math.round((validCount / results.length) * 100)}%)`);
  console.log(`- Problèmes: ${results.length - validCount}`);
  
  // Essayer d'ouvrir le rapport
  try {
    if (process.platform === 'win32') {
      require('child_process').execSync(`start "" "${REPORT_FILE}"`);
    } else if (process.platform === 'darwin') {
      require('child_process').execSync(`open "${REPORT_FILE}"`);
    } else {
      require('child_process').execSync(`xdg-open "${REPORT_FILE}"`);
    }
  } catch (e) {
    console.log('\n⚠️ Impossible d\'ouvrir le rapport automatiquement.');
  }
}

// Démarrer l'analyse
main();
