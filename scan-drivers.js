const fs = require('fs');
const path = require('path');

// Configuration
const DRIVERS_DIR = path.join(__dirname, 'drivers');
const REPORT_FILE = path.join(__dirname, 'drivers-report.txt');

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
    console.error(`Error: Drivers directory not found: ${DRIVERS_DIR}`);
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
    config: null,
    issues: []
  };
  
  // Vérifier le fichier de configuration
  const configPath = path.join(driverPath, 'driver.compose.json');
  
  if (fs.existsSync(configPath)) {
    try {
      result.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      result.hasConfig = true;
    } catch (e) {
      result.issues.push('Invalid config file');
    }
  } else {
    result.issues.push('Missing config file');
  }
  
  // Vérifier les icônes
  const iconPath = path.join(driverPath, 'assets', 'icon.svg');
  const largeIconPath = path.join(driverPath, 'assets', 'images', 'large.png');
  
  result.hasIcons = fs.existsSync(iconPath) && fs.existsSync(largeIconPath);
  if (!result.hasIcons) {
    result.issues.push('Missing icons');
  }
  
  return result;
}

// Générer le rapport
function generateReport(drivers) {
  const now = new Date().toISOString();
  const validDrivers = drivers.filter(d => d.issues.length === 0);
  
  let report = [
    '='.repeat(60),
    'TUYA ZIGBEE DRIVERS REPORT',
    '='.repeat(60),
    `Generated: ${now}`,
    `Repository: https://github.com/dlnraja/com.tuya.zigbee`,
    '='.repeat(60),
    `Total drivers: ${drivers.length}`,
    `Valid drivers: ${validDrivers.length} (${Math.round((validDrivers.length / drivers.length) * 100)}%)`,
    `Drivers with issues: ${drivers.length - validDrivers.length}`,
    '='.repeat(60) + '\n'
  ];
  
  // Détails des drivers
  report.push('DRIVERS DETAILS\n');
  
  for (const driver of drivers) {
    const status = driver.issues.length === 0 ? 'VALID' : 'ISSUES';
    report.push(`[${status}] ${driver.name}`);
    
    if (driver.issues.length > 0) {
      report.push('  Issues:');
      for (const issue of driver.issues) {
        report.push(`  - ${issue}`);
      }
    }
    
    if (driver.config) {
      report.push('  Config:');
      if (driver.config.name) report.push(`  - Name: ${JSON.stringify(driver.config.name)}`);
      if (driver.config.class) report.push(`  - Class: ${driver.config.class}`);
      if (driver.config.capabilities) report.push(`  - Capabilities: ${driver.config.capabilities.join(', ')}`);
    }
    
    report.push('');
  }
  
  // Recommandations
  report.push(...[
    '='.repeat(60),
    'RECOMMENDATIONS',
    '='.repeat(60),
    '1. Fix critical issues first',
    '   - Start with drivers missing configuration files',
    '   - Then fix invalid JSON in config files\n',
    
    '2. Add missing icons',
    '   - Each driver should have both SVG and PNG icons',
    '   - Standard paths: assets/icon.svg and assets/images/large.png\n',
    
    '3. Validate configurations',
    '   - Check all required fields in driver.compose.json',
    '   - Verify capabilities match device functionality\n',
    
    '4. Documentation',
    '   - Update README with setup instructions',
    '   - Document any special requirements for each driver',
    '='.repeat(60),
    'END OF REPORT',
    '='.repeat(60)
  ]);
  
  return report.join('\n');
}

// Fonction principale
function main() {
  console.log('🚀 Starting driver analysis...');
  
  // Lire les dossiers de drivers
  const driverDirs = listDriverDirs();
  console.log(`🔍 Found ${driverDirs.length} drivers`);
  
  // Analyser chaque driver
  console.log('📊 Analyzing drivers...');
  const results = [];
  
  for (const dir of driverDirs) {
    process.stdout.write(`  ${dir}... `);
    const result = analyzeDriver(dir);
    results.push(result);
    console.log(result.issues.length > 0 ? '❌' : '✅');
  }
  
  // Générer le rapport
  console.log('\n📝 Generating report...');
  const report = generateReport(results);
  
  // Sauvegarder le rapport
  fs.writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`✅ Report generated: ${REPORT_FILE}`);
  
  // Afficher un résumé
  const validCount = results.filter(r => r.issues.length === 0).length;
  console.log('\nSUMMARY:');
  console.log(`- Total: ${results.length}`);
  console.log(`- Valid: ${validCount} (${Math.round((validCount / results.length) * 100)}%)`);
  console.log(`- With issues: ${results.length - validCount}`);
  
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
    console.log('\n⚠️ Could not open report automatically.');
  }
}

// Démarrer l'analyse
main();
