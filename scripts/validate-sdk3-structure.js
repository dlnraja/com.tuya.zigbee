// !/usr/bin/env node

/**
 * Validation de la structure SDK3+ conforme
 * Vérifie que tous les composants respectent les spécifications
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validation de la structure SDK3+ conforme...');

// Configuration
const DRIVERS_DIR = 'drivers';
const REPORTS_DIR = 'reports';

// Structure attendue
const EXPECTED_STRUCTURE = {
  'tuya_zigbee': {
    'models': 'Drivers spécifiques Tuya (code source unique)',
    'brands': 'Overlays par marque/OEM',
    'categories': 'Overlays par usage/catégorie',
    '__generic__': 'Drivers génériques Tuya',
    '__templates__': 'Templates pour nouveaux drivers Tuya'
  },
  'zigbee': {
    'models': 'Drivers Zigbee non-Tuya (pur/custom/inconnu)',
    'brands': 'Overlays par marque/OEM',
    'categories': 'Overlays par usage/catégorie',
    '__generic__': 'Drivers génériques non-Tuya',
    '__templates__': 'Templates pour nouveaux drivers Zigbee'
  }
};

// Fonction principale
async function validateSDK3Structure() {
  try {
    // 1. Valider la structure des dossiers
    console.log('📁 Validation de la structure des dossiers...');
    const structureValid = await validateDirectoryStructure();
    
    // 2. Valider les règles de nommage
    console.log('🏷️ Validation des règles de nommage...');
    const namingValid = await validateNamingConventions();
    
    // 3. Valider les fichiers obligatoires
    console.log('📄 Validation des fichiers obligatoires...');
    const filesValid = await validateRequiredFiles();
    
    // 4. Valider les images conformes
    console.log('🎨 Validation des images conformes...');
    const imagesValid = await validateConformImages();
    
    // 5. Valider les overlays
    console.log('🏷️ Validation des overlays...');
    const overlaysValid = await validateOverlays();
    
    // 6. Valider app.js
    console.log('⚙️ Validation de app.js...');
    const appJsValid = await validateAppJS();
    
    // 7. Générer le rapport de validation
    console.log('📊 Génération du rapport de validation...');
    await generateValidationReport({
      structure: structureValid,
      naming: namingValid,
      files: filesValid,
      images: imagesValid,
      overlays: overlaysValid,
      appJs: appJsValid
    });
    
    // 8. Résumé final
    const allValid = structureValid && namingValid && filesValid && imagesValid && overlaysValid && appJsValid;
    
    if (allValid) {
      console.log('🎉 STRUCTURE SDK3+ CONFORME VALIDÉE AVEC SUCCÈS !');
      console.log('✅ Tous les composants respectent les spécifications');
    } else {
      console.log('⚠️ Structure SDK3+ partiellement conforme');
      console.log('🔧 Certains composants nécessitent une attention');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
    throw error;
  }
}

// Valider la structure des dossiers
async function validateDirectoryStructure() {
  let valid = true;
  
  for (const [domain, subdirs] of Object.entries(EXPECTED_STRUCTURE)) {
    for (const [subdir, description] of Object.entries(subdirs)) {
      const fullPath = path.join(DRIVERS_DIR, domain, subdir);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`❌ Dossier manquant: ${fullPath}`);
        valid = false;
      } else {
        console.log(`✅ Dossier présent: ${fullPath} - ${description}`);
      }
    }
  }
  
  return valid;
}

// Valider les conventions de nommage
async function validateNamingConventions() {
  const drivers = await scanAllDrivers();
  let valid = true;
  let invalidNames = 0;
  
  console.log(`📊 ${drivers.length} drivers à valider`);
  
  for (const driver of drivers) {
    if (!isValidDriverName(driver.name)) {
      console.log(`❌ Nom invalide: ${driver.name} (${driver.path})`);
      invalidNames++;
      valid = false;
    }
  }
  
  if (valid) {
    console.log('✅ Tous les noms de drivers respectent les conventions');
  } else {
    console.log(`⚠️ ${invalidNames} noms de drivers invalides`);
  }
  
  return valid;
}

// Vérifier si un nom de driver est valide
function isValidDriverName(name) {
  // Format attendu : <ts_model|vendor>_<device_type>_<form_factor>_<variant>
  const pattern = /^[a-z0-9_]+_[a-z_]+_[a-z_]+_[a-z0-9_]+$/;
  
  // Vérifications supplémentaires
  const parts = name.split('_');
  if (parts.length < 4) {
    return false;
  }
  
  // Vérifier que le premier segment est un vendor valide
  const vendor = parts[0];
  if (!vendor || vendor.length < 2) {
    return false;
  }
  
  return pattern.test(name);
}

// Valider les fichiers obligatoires
async function validateRequiredFiles() {
  const drivers = await scanAllDrivers();
  const requiredFiles = [
    'driver.compose.json',
    'driver.js',
    'device.js',
    'metadata.json',
    'README.md'
  ];
  
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
    console.log(`✅ Tous les fichiers obligatoires sont présents (${drivers.length * requiredFiles.length} fichiers)`);
  } else {
    console.log(`⚠️ ${missingFiles} fichiers manquants`);
  }
  
  return valid;
}

// Valider les images conformes
async function validateConformImages() {
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
    console.log(`✅ Toutes les images conformes sont présentes (${drivers.length * 2} images)`);
  } else {
    console.log(`⚠️ ${missingImages} images manquantes`);
  }
  
  return valid;
}

// Valider les overlays
async function validateOverlays() {
  let valid = true;
  
  // Vérifier les overlays de marque
  const brandsPath = path.join(DRIVERS_DIR, 'tuya_zigbee', 'brands');
  if (fs.existsSync(brandsPath)) {
    const brands = fs.readdirSync(brandsPath).filter(item => 
      fs.statSync(path.join(brandsPath, item)).isDirectory()
    );
    
    for (const brand of brands) {
      const overlayPath = path.join(brandsPath, brand, 'overlay.json');
      if (!fs.existsSync(overlayPath)) {
        console.log(`❌ Overlay marque manquant: ${brand}/overlay.json`);
        valid = false;
      } else {
        console.log(`✅ Overlay marque présent: ${brand}/overlay.json`);
      }
    }
  }
  
  // Vérifier les overlays de catégorie
  const categoriesPath = path.join(DRIVERS_DIR, 'tuya_zigbee', 'categories');
  if (fs.existsSync(categoriesPath)) {
    const categories = fs.readdirSync(categoriesPath).filter(item => 
      fs.statSync(path.join(categoriesPath, item)).isDirectory()
    );
    
    for (const category of categories) {
      const overlayPath = path.join(categoriesPath, category, 'overlay.json');
      if (!fs.existsSync(overlayPath)) {
        console.log(`❌ Overlay catégorie manquant: ${category}/overlay.json`);
        valid = false;
      } else {
        console.log(`✅ Overlay catégorie présent: ${category}/overlay.json`);
      }
    }
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
      { name: 'Structure SDK3+', pattern: /SDK3\+/ },
      { name: 'ZigBeeDevice', pattern: /ZigBeeDevice/ },
      { name: 'Nouvelle structure', pattern: /tuya_zigbee.*zigbee/ }
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

// Scanner tous les drivers
async function scanAllDrivers() {
  const drivers = [];
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    return drivers;
  }
  
  const domains = fs.readdirSync(DRIVERS_DIR).filter(item => 
    fs.statSync(path.join(DRIVERS_DIR, item)).isDirectory()
  );
  
  for (const domain of domains) {
    const domainPath = path.join(DRIVERS_DIR, domain);
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

// Générer le rapport de validation
async function generateValidationReport(results) {
  const report = {
    generated: new Date().toISOString(),
    validation: 'Structure SDK3+ Conforme',
    results: results,
    summary: {
      structure: results.structure ? '✅ Validé' : '❌ Échoué',
      naming: results.naming ? '✅ Validé' : '❌ Échoué',
      files: results.files ? '✅ Validé' : '❌ Échoué',
      images: results.images ? '✅ Validé' : '❌ Échoué',
      overlays: results.overlays ? '✅ Validé' : '❌ Échoué',
      appJs: results.appJs ? '✅ Validé' : '❌ Échoué'
    },
    overall: Object.values(results).every(r => r) ? 'SUCCÈS' : 'PARTIEL',
    structure: EXPECTED_STRUCTURE
  };
  
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const reportPath = path.join(REPORTS_DIR, 'sdk3-structure-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Rapport de validation sauvegardé: ${reportPath}`);
}

// Exécution
if (require.main === module) {
  validateSDK3Structure().catch(console.error);
}

module.exports = { validateSDK3Structure };
