// !/usr/bin/env node

/**
 * Validation finale de la migration 3.2 → 3.3
 * Vérifie que tout est en place et fonctionnel
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validation finale de la migration 3.2 → 3.3...');

// Fonction principale
async function validateMigration33() {
  try {
    // 1. Vérifier la structure
    console.log('📁 Vérification de la structure...');
    const structureValid = await validateStructure();
    
    // 2. Vérifier les drivers
    console.log('🔧 Vérification des drivers...');
    const driversValid = await validateDrivers();
    
    // 3. Vérifier les fichiers requis
    console.log('📄 Vérification des fichiers requis...');
    const filesValid = await validateRequiredFiles();
    
    // 4. Vérifier les images
    console.log('🎨 Vérification des images...');
    const imagesValid = await validateImages();
    
    // 5. Vérifier app.js
    console.log('⚙️ Vérification de app.js...');
    const appJsValid = await validateAppJS();
    
    // 6. Générer le rapport de validation
    console.log('📊 Génération du rapport de validation...');
    await generateValidationReport({
      structure: structureValid,
      drivers: driversValid,
      files: filesValid,
      images: imagesValid,
      appJs: appJsValid
    });
    
    // 7. Résumé final
    const allValid = structureValid && driversValid && filesValid && imagesValid && appJsValid;
    
    if (allValid) {
      console.log('🎉 MIGRATION 3.3 VALIDÉE AVEC SUCCÈS !');
      console.log('✅ Tous les composants sont en place et fonctionnels');
    } else {
      console.log('⚠️ Migration 3.3 partiellement validée');
      console.log('🔧 Certains composants nécessitent une attention');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
    throw error;
  }
}

// Valider la structure
async function validateStructure() {
  const requiredDirs = [
    'drivers/tuya_zigbee/models',
    'drivers/tuya_zigbee/__generic__',
    'drivers/tuya_zigbee/__templates__',
    'drivers/zigbee/models',
    'drivers/zigbee/__generic__',
    'drivers/zigbee/__templates__'
  ];
  
  let valid = true;
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.log(`❌ Dossier manquant: ${dir}`);
      valid = false;
    } else {
      console.log(`✅ Dossier présent: ${dir}`);
    }
  }
  
  return valid;
}

// Valider les drivers
async function validateDrivers() {
  const drivers = await scanAllDrivers();
  let valid = true;
  
  console.log(`📊 ${drivers.length} drivers trouvés`);
  
  // Vérifier qu'il y a des drivers dans chaque domaine
  const tuyaZigbeeCount = drivers.filter(d => d.domain === 'tuya_zigbee').length;
  const zigbeeCount = drivers.filter(d => d.domain === 'zigbee').length;
  
  if (tuyaZigbeeCount === 0) {
    console.log('❌ Aucun driver Tuya Zigbee trouvé');
    valid = false;
  } else {
    console.log(`✅ ${tuyaZigbeeCount} drivers Tuya Zigbee`);
  }
  
  if (zigbeeCount === 0) {
    console.log('❌ Aucun driver Zigbee trouvé');
    valid = false;
  } else {
    console.log(`✅ ${zigbeeCount} drivers Zigbee`);
  }
  
  return valid;
}

// Scanner tous les drivers
async function scanAllDrivers() {
  const drivers = [];
  
  if (!fs.existsSync('drivers')) {
    return drivers;
  }
  
  const domains = fs.readdirSync('drivers').filter(item => 
    fs.statSync(path.join('drivers', item)).isDirectory()
  );
  
  for (const domain of domains) {
    const domainPath = path.join('drivers', domain);
    const subdirs = fs.readdirSync(domainPath).filter(item => 
      fs.statSync(path.join(domainPath, item)).isDirectory()
    );
    
    for (const subdir of subdirs) {
      if (subdir === 'models' || subdir === '__generic__' || subdir === '__templates__') {
        const subdirPath = path.join(domainPath, subdir);
        const driverDirs = fs.readdirSync(subdirPath).filter(item => 
          fs.statSync(path.join(subdirPath, item)).isDirectory()
        );
        
        for (const driverDir of driverDirs) {
          const driverPath = path.join(subdirPath, driverDir);
          drivers.push({
            path: `${domain}/${subdir}/${driverDir}`,
            fullPath: driverPath,
            domain,
            type: subdir,
            name: driverDir
          });
        }
      }
    }
  }
  
  return drivers;
}

// Valider les fichiers requis
async function validateRequiredFiles() {
  const drivers = await scanAllDrivers();
  const requiredFiles = ['driver.compose.json', 'device.js', 'metadata.json', 'README.md'];
  let valid = true;
  let missingFiles = 0;
  
  for (const driver of drivers) {
    for (const file of requiredFiles) {
      const filePath = path.join(driver.fullPath, file);
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Fichier manquant: ${driver.path}/${file}`);
        missingFiles++;
        valid = false;
      }
    }
  }
  
  if (valid) {
    console.log(`✅ Tous les fichiers requis sont présents (${drivers.length * requiredFiles.length} fichiers)`);
  } else {
    console.log(`⚠️ ${missingFiles} fichiers manquants`);
  }
  
  return valid;
}

// Valider les images
async function validateImages() {
  const drivers = await scanAllDrivers();
  let valid = true;
  let missingImages = 0;
  
  for (const driver of drivers) {
    const assetsPath = path.join(driver.fullPath, 'assets');
    const imagesPath = path.join(assetsPath, 'images');
    
    if (!fs.existsSync(imagesPath)) {
      console.log(`❌ Dossier images manquant: ${driver.path}/assets/images`);
      missingImages++;
      valid = false;
      continue;
    }
    
    const requiredImages = ['small.png', 'large.png'];
    
    for (const image of requiredImages) {
      const imagePath = path.join(imagesPath, image);
      if (!fs.existsSync(imagePath)) {
        console.log(`❌ Image manquante: ${driver.path}/assets/images/${image}`);
        missingImages++;
        valid = false;
      }
    }
  }
  
  if (valid) {
    console.log(`✅ Toutes les images sont présentes (${drivers.length * 2} images)`);
  } else {
    console.log(`⚠️ ${missingImages} images manquantes`);
  }
  
  return valid;
}

// Valider app.js
async function validateAppJS() {
  const appJsPath = 'app.js';
  
  if (!fs.existsSync(appJsPath)) {
    console.log('❌ app.js manquant');
    return false;
  }
  
  try {
    const content = fs.readFileSync(appJsPath, 'utf8');
    
    // Vérifier les éléments clés
    const checks = [
      { name: 'Version 3.3.0', pattern: /3\.3\.0/ },
      { name: 'Structure 3.3', pattern: /tuya_zigbee.*zigbee/ },
      { name: 'SDK3+', pattern: /ZigBeeDevice/ }
    ];
    
    let valid = true;
    
    for (const check of checks) {
      if (!check.pattern.test(content)) {
        console.log(`❌ ${check.name} non trouvé dans app.js`);
        valid = false;
      } else {
        console.log(`✅ ${check.name} trouvé dans app.js`);
      }
    }
    
    return valid;
    
  } catch (error) {
    console.log(`❌ Erreur lecture app.js: ${error.message}`);
    return false;
  }
}

// Générer le rapport de validation
async function generateValidationReport(results) {
  const report = {
    generated: new Date().toISOString(),
    migration: '3.2 → 3.3',
    validation: results,
    summary: {
      structure: results.structure ? '✅ Validé' : '❌ Échoué',
      drivers: results.drivers ? '✅ Validé' : '❌ Échoué',
      files: results.files ? '✅ Validé' : '❌ Échoué',
      images: results.images ? '✅ Validé' : '❌ Échoué',
      appJs: results.appJs ? '✅ Validé' : '❌ Échoué'
    },
    overall: Object.values(results).every(r => r) ? 'SUCCÈS' : 'PARTIEL'
  };
  
  const reportsDir = 'reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, 'migration-3.3-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Rapport de validation sauvegardé: ${reportPath}`);
}

// Exécution
if (require.main === module) {
  validateMigration33().catch(console.error);
}

module.exports = { validateMigration33 };
