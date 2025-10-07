#!/usr/bin/env node
/**
 * MASTER AUDIT AND FIX - Analyse et correction complète
 * 
 * Ce script analyse TOUT:
 * 1. Images et leurs chemins
 * 2. ManufacturerNames dans les bons dossiers
 * 3. ProductIds cohérents
 * 4. Features manquantes
 * 5. Cohérence des données
 * 
 * Puis génère un rapport détaillé et des scripts de correction
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const driversPath = path.join(rootPath, 'drivers');
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🔍 MASTER AUDIT - Analyse Complète App');
console.log('='.repeat(80));
console.log('');

// Charger app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Résultats d'audit
const audit = {
  images: {
    issues: [],
    recommendations: []
  },
  drivers: {
    total: 0,
    analyzed: 0,
    issues: [],
    manufacturerNameIssues: [],
    productIdIssues: [],
    missingFeatures: [],
    recommendations: []
  },
  appJson: {
    issues: [],
    recommendations: []
  },
  summary: {}
};

console.log('📊 PHASE 1: Analyse Images App');
console.log('-'.repeat(80));

// 1. Vérifier les images de l'app
const assetsPath = path.join(rootPath, 'assets');
const appImages = appJson.images || {};

for (const [key, imagePath] of Object.entries(appImages)) {
  const fullPath = path.join(rootPath, imagePath.replace(/^\//, ''));
  
  if (!fs.existsSync(fullPath)) {
    audit.images.issues.push({
      type: 'missing',
      key: key,
      path: imagePath,
      message: `Image ${key} manquante: ${imagePath}`
    });
    console.log(`   ❌ ${key}: ${imagePath} - MANQUANT`);
  } else {
    const stats = fs.statSync(fullPath);
    console.log(`   ✅ ${key}: ${imagePath} (${stats.size} bytes)`);
  }
}

// Vérifier les images dans assets/
const assetsFiles = fs.readdirSync(assetsPath).filter(f => 
  f.endsWith('.png') || f.endsWith('.svg')
);
console.log(`\n   Fichiers dans assets/: ${assetsFiles.join(', ')}`);

if (audit.images.issues.length > 0) {
  audit.images.recommendations.push({
    action: 'fix_image_paths',
    description: 'Corriger les chemins des images dans app.json',
    priority: 'HIGH'
  });
}

console.log('');
console.log('📊 PHASE 2: Analyse Drivers');
console.log('-'.repeat(80));

// 2. Analyser tous les drivers
const driverFolders = fs.readdirSync(driversPath).filter(f => {
  const fullPath = path.join(driversPath, f);
  return fs.statSync(fullPath).isDirectory();
});

audit.drivers.total = driverFolders.length;
console.log(`   Total drivers: ${driverFolders.length}`);
console.log('');

// Analyser chaque driver
for (const driverFolder of driverFolders) {
  const driverPath = path.join(driversPath, driverFolder);
  const driverJsonPath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(driverJsonPath)) {
    audit.drivers.issues.push({
      driver: driverFolder,
      type: 'missing_driver_json',
      message: 'driver.compose.json manquant'
    });
    continue;
  }
  
  const driverJson = JSON.parse(fs.readFileSync(driverJsonPath, 'utf8'));
  audit.drivers.analyzed++;
  
  // Vérifier manufacturerName
  const manufacturerName = driverJson.zigbee?.manufacturerName;
  if (!manufacturerName || manufacturerName.length === 0) {
    audit.drivers.manufacturerNameIssues.push({
      driver: driverFolder,
      issue: 'empty',
      message: 'manufacturerName vide'
    });
  }
  
  // Vérifier productId
  const productId = driverJson.zigbee?.productId;
  if (!productId || productId.length === 0) {
    audit.drivers.productIdIssues.push({
      driver: driverFolder,
      issue: 'empty',
      message: 'productId vide'
    });
  }
  
  // Vérifier cohérence nom du dossier vs type d'appareil
  const driverName = driverFolder;
  const capabilities = driverJson.capabilities || [];
  
  // Détecter type basé sur capabilities
  let detectedType = 'unknown';
  if (capabilities.includes('onoff')) detectedType = 'switch_or_plug';
  if (capabilities.includes('measure_temperature')) detectedType = 'sensor';
  if (capabilities.includes('measure_motion')) detectedType = 'motion_sensor';
  if (capabilities.includes('alarm_contact')) detectedType = 'door_sensor';
  if (capabilities.includes('dim')) detectedType = 'light_dimmer';
  if (capabilities.includes('light_hue')) detectedType = 'color_light';
  if (capabilities.includes('windowcoverings_state')) detectedType = 'curtain';
  
  // Vérifier cohérence
  if (detectedType !== 'unknown') {
    const nameMatchesType = 
      (detectedType === 'sensor' && (driverName.includes('sensor') || driverName.includes('temperature'))) ||
      (detectedType === 'motion_sensor' && driverName.includes('motion')) ||
      (detectedType === 'door_sensor' && (driverName.includes('door') || driverName.includes('window'))) ||
      (detectedType === 'switch_or_plug' && (driverName.includes('switch') || driverName.includes('plug'))) ||
      (detectedType === 'light_dimmer' && (driverName.includes('dimmer') || driverName.includes('light'))) ||
      (detectedType === 'color_light' && (driverName.includes('rgb') || driverName.includes('color'))) ||
      (detectedType === 'curtain' && driverName.includes('curtain'));
    
    if (!nameMatchesType) {
      audit.drivers.issues.push({
        driver: driverFolder,
        type: 'name_mismatch',
        detectedType: detectedType,
        capabilities: capabilities,
        message: `Nom du driver ne correspond pas au type détecté (${detectedType})`
      });
    }
  }
  
  // Vérifier images du driver
  const driverAssetsPath = path.join(driverPath, 'assets');
  if (fs.existsSync(driverAssetsPath)) {
    const hasIcon = fs.existsSync(path.join(driverAssetsPath, 'icon.svg'));
    const hasLarge = fs.existsSync(path.join(driverAssetsPath, 'large.png')) || 
                      fs.existsSync(path.join(driverAssetsPath, 'large.svg'));
    const hasSmall = fs.existsSync(path.join(driverAssetsPath, 'small.png')) ||
                      fs.existsSync(path.join(driverAssetsPath, 'small.svg'));
    
    if (!hasIcon || !hasLarge || !hasSmall) {
      audit.drivers.issues.push({
        driver: driverFolder,
        type: 'missing_images',
        missing: {
          icon: !hasIcon,
          large: !hasLarge,
          small: !hasSmall
        },
        message: 'Images manquantes'
      });
    }
  } else {
    audit.drivers.issues.push({
      driver: driverFolder,
      type: 'no_assets_folder',
      message: 'Dossier assets/ manquant'
    });
  }
}

console.log(`   Drivers analysés: ${audit.drivers.analyzed}/${audit.drivers.total}`);
console.log(`   Issues manufacturerName: ${audit.drivers.manufacturerNameIssues.length}`);
console.log(`   Issues productId: ${audit.drivers.productIdIssues.length}`);
console.log(`   Autres issues: ${audit.drivers.issues.length}`);
console.log('');

console.log('📊 PHASE 3: Analyse app.json');
console.log('-'.repeat(80));

// 3. Vérifier app.json
if (!appJson.version) {
  audit.appJson.issues.push({
    field: 'version',
    message: 'Version manquante'
  });
}

if (!appJson.name || !appJson.name.en) {
  audit.appJson.issues.push({
    field: 'name',
    message: 'Nom en anglais manquant'
  });
}

if (!appJson.description || !appJson.description.en) {
  audit.appJson.issues.push({
    field: 'description',
    message: 'Description en anglais manquante'
  });
}

console.log(`   Version: ${appJson.version || 'MANQUANT'}`);
console.log(`   Nom: ${appJson.name?.en || 'MANQUANT'}`);
console.log(`   Description: ${appJson.description?.en ? 'OK' : 'MANQUANT'}`);
console.log(`   Category: ${appJson.category || 'MANQUANT'}`);
console.log(`   Issues: ${audit.appJson.issues.length}`);
console.log('');

// 4. Générer le résumé
audit.summary = {
  totalDrivers: audit.drivers.total,
  analyzedDrivers: audit.drivers.analyzed,
  totalIssues: audit.images.issues.length + 
                audit.drivers.issues.length + 
                audit.drivers.manufacturerNameIssues.length +
                audit.drivers.productIdIssues.length +
                audit.appJson.issues.length,
  criticalIssues: audit.images.issues.length + audit.appJson.issues.length,
  driverIssues: audit.drivers.issues.length,
  dataIssues: audit.drivers.manufacturerNameIssues.length + audit.drivers.productIdIssues.length
};

console.log('📊 RÉSUMÉ AUDIT');
console.log('='.repeat(80));
console.log('');
console.log(`   Total drivers: ${audit.summary.totalDrivers}`);
console.log(`   Drivers analysés: ${audit.summary.analyzedDrivers}`);
console.log(`   Issues TOTAL: ${audit.summary.totalIssues}`);
console.log(`   - Issues critiques (images, app.json): ${audit.summary.criticalIssues}`);
console.log(`   - Issues drivers: ${audit.summary.driverIssues}`);
console.log(`   - Issues données: ${audit.summary.dataIssues}`);
console.log('');

// Sauvegarder le rapport
const reportPath = path.join(rootPath, 'AUDIT_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(audit, null, 2));
console.log(`✅ Rapport sauvegardé: ${reportPath}`);
console.log('');

// Générer les priorités
console.log('🎯 PRIORITÉS DE CORRECTION');
console.log('='.repeat(80));
console.log('');

const priorities = [];

if (audit.images.issues.length > 0) {
  priorities.push({
    priority: 1,
    category: 'CRITIQUE',
    task: 'Corriger les chemins d\'images dans app.json',
    count: audit.images.issues.length,
    script: 'FIX_IMAGES.js'
  });
}

if (audit.drivers.manufacturerNameIssues.length > 0) {
  priorities.push({
    priority: 2,
    category: 'HAUTE',
    task: 'Corriger les manufacturerNames vides',
    count: audit.drivers.manufacturerNameIssues.length,
    script: 'FIX_MANUFACTURER_NAMES.js'
  });
}

if (audit.drivers.productIdIssues.length > 0) {
  priorities.push({
    priority: 3,
    category: 'HAUTE',
    task: 'Corriger les productIds vides',
    count: audit.drivers.productIdIssues.length,
    script: 'FIX_PRODUCT_IDS.js'
  });
}

if (audit.drivers.issues.length > 0) {
  priorities.push({
    priority: 4,
    category: 'MOYENNE',
    task: 'Corriger issues drivers (noms, images)',
    count: audit.drivers.issues.length,
    script: 'FIX_DRIVER_ISSUES.js'
  });
}

priorities.forEach((p, i) => {
  console.log(`${i + 1}. [${p.category}] ${p.task}`);
  console.log(`   Issues: ${p.count}`);
  console.log(`   Script: ${p.script}`);
  console.log('');
});

console.log('✅ AUDIT TERMINÉ');
console.log('');
console.log('📋 Prochaines étapes:');
console.log('   1. Examiner AUDIT_REPORT.json');
console.log('   2. Exécuter les scripts de correction par priorité');
console.log('   3. Valider les corrections avec homey app validate');
console.log('');

process.exit(audit.summary.totalIssues > 0 ? 1 : 0);
