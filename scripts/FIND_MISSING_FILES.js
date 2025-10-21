#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔍 RECHERCHE DE FICHIERS ET DOSSIERS MANQUANTS\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const appJsonPath = path.join(__dirname, '..', 'app.json');

// Charger app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

console.log(`📊 Total drivers dans app.json: ${appJson.drivers.length}\n`);

const issues = {
  missingFolder: [],
  missingDeviceJs: [],
  missingCompose: [],
  missingImages: [],
  missingAssets: [],
  invalidImages: []
};

// Vérifier chaque driver
appJson.drivers.forEach(driver => {
  const driverId = driver.id;
  const driverPath = path.join(driversDir, driverId);
  
  // 1. Vérifier si le dossier existe
  if (!fs.existsSync(driverPath)) {
    issues.missingFolder.push(driverId);
    return;
  }
  
  // 2. Vérifier device.js
  const deviceJsPath = path.join(driverPath, 'device.js');
  if (!fs.existsSync(deviceJsPath)) {
    issues.missingDeviceJs.push(driverId);
  }
  
  // 3. Vérifier driver.compose.json
  const composePath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    issues.missingCompose.push(driverId);
  }
  
  // 4. Vérifier assets/images
  const assetsPath = path.join(driverPath, 'assets');
  const imagesPath = path.join(assetsPath, 'images');
  
  if (!fs.existsSync(assetsPath)) {
    issues.missingAssets.push(driverId);
    return;
  }
  
  if (!fs.existsSync(imagesPath)) {
    issues.missingImages.push(driverId);
    return;
  }
  
  // 5. Vérifier les images requises
  const requiredImages = ['small.png', 'large.png'];
  const existingImages = fs.readdirSync(imagesPath);
  
  const missingImgs = requiredImages.filter(img => !existingImages.includes(img));
  if (missingImgs.length > 0) {
    issues.invalidImages.push({ id: driverId, missing: missingImgs });
  }
});

// Afficher les résultats
console.log('📋 RÉSULTATS DE L\'ANALYSE:\n');

if (issues.missingFolder.length > 0) {
  console.log(`❌ Dossiers drivers manquants (${issues.missingFolder.length}):`);
  issues.missingFolder.forEach(d => console.log(`   - ${d}`));
  console.log();
}

if (issues.missingDeviceJs.length > 0) {
  console.log(`❌ device.js manquants (${issues.missingDeviceJs.length}):`);
  issues.missingDeviceJs.forEach(d => console.log(`   - ${d}`));
  console.log();
}

if (issues.missingCompose.length > 0) {
  console.log(`❌ driver.compose.json manquants (${issues.missingCompose.length}):`);
  issues.missingCompose.forEach(d => console.log(`   - ${d}`));
  console.log();
}

if (issues.missingAssets.length > 0) {
  console.log(`❌ Dossiers assets/ manquants (${issues.missingAssets.length}):`);
  issues.missingAssets.forEach(d => console.log(`   - ${d}`));
  console.log();
}

if (issues.missingImages.length > 0) {
  console.log(`❌ Dossiers images/ manquants (${issues.missingImages.length}):`);
  issues.missingImages.forEach(d => console.log(`   - ${d}`));
  console.log();
}

if (issues.invalidImages.length > 0) {
  console.log(`❌ Images manquantes (${issues.invalidImages.length}):`);
  issues.invalidImages.forEach(item => {
    console.log(`   - ${item.id}: ${item.missing.join(', ')}`);
  });
  console.log();
}

// Résumé
const totalIssues = issues.missingFolder.length + 
                    issues.missingDeviceJs.length + 
                    issues.missingCompose.length + 
                    issues.missingAssets.length + 
                    issues.missingImages.length + 
                    issues.invalidImages.length;

if (totalIssues === 0) {
  console.log('✅ AUCUN PROBLÈME DÉTECTÉ!\n');
} else {
  console.log(`⚠️  TOTAL PROBLÈMES: ${totalIssues}\n`);
  
  // Sauvegarder la liste pour correction
  const report = {
    timestamp: new Date().toISOString(),
    totalDrivers: appJson.drivers.length,
    issues: issues,
    summary: {
      missingFolder: issues.missingFolder.length,
      missingDeviceJs: issues.missingDeviceJs.length,
      missingCompose: issues.missingCompose.length,
      missingAssets: issues.missingAssets.length,
      missingImages: issues.missingImages.length,
      invalidImages: issues.invalidImages.length,
      total: totalIssues
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'MISSING_FILES_REPORT.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('📄 Rapport sauvegardé: MISSING_FILES_REPORT.json\n');
}
