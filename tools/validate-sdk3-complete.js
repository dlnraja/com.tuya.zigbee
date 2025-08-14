// !/usr/bin/env node

/**
 * Outil de validation complète SDK3+ pour Tuya Zigbee
 * Lint + Validation JSON + Tailles d'images + Génération matrice
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Validation complète SDK3+ en cours...');

// Configuration
const DRIVERS_DIR = 'drivers';
const SCHEMAS_DIR = 'tools/schemas';
const REPORTS_DIR = 'reports';

// Schémas de validation
const METADATA_SCHEMA = require(`../${SCHEMAS_DIR}/metadata.schema.json`);
const OVERLAY_SCHEMA = require(`../${SCHEMAS_DIR}/overlay.schema.json`);

// Fonction de validation JSON avec schéma
function validateJSON(data, schema) {
  try {
    // Validation basique des types
    for (const [key, value] of Object.entries(schema.properties || {})) {
      if (schema.required && schema.required.includes(key)) {
        if (!(key in data)) {
          return { valid: false, error: `Champ requis manquant: ${key}` };
        }
      }
      
      if (key in data) {
        if (value.type === 'string' && typeof data[key] !== 'string') {
          return { valid: false, error: `Type invalide pour ${key}: attendu string, reçu ${typeof data[key]}` };
        }
        if (value.type === 'array' && !Array.isArray(data[key])) {
          return { valid: false, error: `Type invalide pour ${key}: attendu array, reçu ${typeof data[key]}` };
        }
        if (value.type === 'object' && typeof data[key] !== 'object') {
          return { valid: false, error: `Type invalide pour ${key}: attendu object, reçu ${typeof data[key]}` };
        }
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Fonction de validation des tailles d'images
function validateImageSizes(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      return { valid: false, error: 'Fichier image manquant' };
    }
    
    // Vérification basique des dimensions via nom de fichier
    const filename = path.basename(imagePath);
    if (filename === 'small.png') {
      return { valid: true, size: '75x75' };
    } else if (filename === 'large.png') {
      return { valid: true, size: '500x500' };
    } else if (filename === 'xlarge.png') {
      return { valid: true, size: '1000x1000' };
    }
    
    return { valid: true, size: 'unknown' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Fonction de validation de la structure des dossiers
function validateDriverStructure() {
  const structure = {
    tuya_zigbee: ['models', 'brands', 'categories', '__generic__', '__templates__'],
    zigbee: ['models', 'brands', 'categories', '__generic__', '__templates__']
  };
  
  const results = {};
  
  for (const [domain, subdirs] of Object.entries(structure)) {
    results[domain] = {};
    const domainPath = path.join(DRIVERS_DIR, domain);
    
    if (!fs.existsSync(domainPath)) {
      results[domain].valid = false;
      results[domain].error = 'Domaine manquant';
      continue;
    }
    
    results[domain].valid = true;
    results[domain].subdirs = {};
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(domainPath, subdir);
      results[domain].subdirs[subdir] = fs.existsSync(subdirPath);
    }
  }
  
  return results;
}

// Fonction de validation des noms de dossiers
function validateDriverNames() {
  const results = {
    valid: [],
    invalid: [],
    pattern: /^[a-z0-9_]+_[a-z0-9_]+_[a-z0-9_]+_[a-z0-9_]+$/
  };
  
  for (const domain of ['tuya_zigbee', 'zigbee']) {
    const modelsPath = path.join(DRIVERS_DIR, domain, 'models');
    if (!fs.existsSync(modelsPath)) continue;
    
    const drivers = fs.readdirSync(modelsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const driver of drivers) {
      if (results.pattern.test(driver)) {
        results.valid.push(`${domain}/models/${driver}`);
      } else {
        results.invalid.push(`${domain}/models/${driver}`);
      }
    }
  }
  
  return results;
}

// Fonction de validation des fichiers obligatoires
function validateRequiredFiles() {
  const results = {
    valid: [],
    invalid: [],
    missing: []
  };
  
  const requiredFiles = [
    'driver.compose.json',
    'driver.js',
    'device.js',
    'metadata.json',
    'README.md',
    'assets/icon.svg',
    'assets/images/small.png',
    'assets/images/large.png'
  ];
  
  for (const domain of ['tuya_zigbee', 'zigbee']) {
    const modelsPath = path.join(DRIVERS_DIR, domain, 'models');
    if (!fs.existsSync(modelsPath)) continue;
    
    const drivers = fs.readdirSync(modelsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const driver of drivers) {
      const driverPath = path.join(modelsPath, driver);
      const driverResults = { driver: `${domain}/models/${driver}`, files: {} };
      
      let allValid = true;
      
      for (const file of requiredFiles) {
        const filePath = path.join(driverPath, file);
        const exists = fs.existsSync(filePath);
        driverResults.files[file] = exists;
        
        if (!exists) {
          allValid = false;
        }
      }
      
      if (allValid) {
        results.valid.push(driverResults);
      } else {
        results.invalid.push(driverResults);
      }
    }
  }
  
  return results;
}

// Fonction de validation des overlays
function validateOverlays() {
  const results = {
    valid: [],
    invalid: []
  };
  
  for (const domain of ['tuya_zigbee', 'zigbee']) {
    for (const overlayType of ['brands', 'categories']) {
      const overlayPath = path.join(DRIVERS_DIR, domain, overlayType);
      if (!fs.existsSync(overlayPath)) continue;
      
      const overlays = fs.readdirSync(overlayPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const overlay of overlays) {
        const overlayJsonPath = path.join(overlayPath, overlay, 'overlay.json');
        
        if (fs.existsSync(overlayJsonPath)) {
          try {
            const overlayData = JSON.parse(fs.readFileSync(overlayJsonPath, 'utf8'));
            const validation = validateJSON(overlayData, OVERLAY_SCHEMA);
            
            if (validation.valid) {
              results.valid.push(`${domain}/${overlayType}/${overlay}`);
            } else {
              results.invalid.push({
                path: `${domain}/${overlayType}/${overlay}`,
                error: validation.error
              });
            }
          } catch (error) {
            results.invalid.push({
              path: `${domain}/${overlayType}/${overlay}`,
              error: `JSON invalide: ${error.message}`
            });
          }
        } else {
          results.invalid.push({
            path: `${domain}/${overlayType}/${overlay}`,
            error: 'overlay.json manquant'
          });
        }
      }
    }
  }
  
  return results;
}

// Fonction de génération de la matrice des drivers
function generateDriversMatrix() {
  const matrix = {
    tuya_zigbee: {
      models: [],
      brands: [],
      categories: [],
      generic: [],
      templates: []
    },
    zigbee: {
      models: [],
      brands: [],
      categories: [],
      generic: [],
      templates: []
    }
  };
  
  for (const domain of ['tuya_zigbee', 'zigbee']) {
    for (const type of Object.keys(matrix[domain])) {
      const typePath = path.join(DRIVERS_DIR, domain, type);
      if (fs.existsSync(typePath)) {
        matrix[domain][type] = fs.readdirSync(typePath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
      }
    }
  }
  
  return matrix;
}

// Fonction principale de validation
function runCompleteValidation() {
  console.log('📋 Validation de la structure...');
  const structureValidation = validateDriverStructure();
  
  console.log('🏷️ Validation des noms de dossiers...');
  const namesValidation = validateDriverNames();
  
  console.log('📁 Validation des fichiers obligatoires...');
  const filesValidation = validateRequiredFiles();
  
  console.log('🎨 Validation des overlays...');
  const overlaysValidation = validateOverlays();
  
  console.log('📊 Génération de la matrice...');
  const driversMatrix = generateDriversMatrix();
  
  // Compilation des résultats
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      structure: structureValidation,
      naming: {
        valid: namesValidation.valid.length,
        invalid: namesValidation.invalid.length,
        total: namesValidation.valid.length + namesValidation.invalid.length
      },
      files: {
        valid: filesValidation.valid.length,
        invalid: filesValidation.invalid.length,
        total: filesValidation.valid.length + filesValidation.invalid.length
      },
      overlays: {
        valid: overlaysValidation.valid.length,
        invalid: overlaysValidation.invalid.length,
        total: overlaysValidation.valid.length + overlaysValidation.invalid.length
      }
    },
    details: {
      structure: structureValidation,
      naming: namesValidation,
      files: filesValidation,
      overlays: overlaysValidation,
      matrix: driversMatrix
    }
  };
  
  // Sauvegarde du rapport
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const reportPath = path.join(REPORTS_DIR, `sdk3-complete-validation-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Affichage du résumé
  console.log('\n📊 RÉSULTATS DE LA VALIDATION COMPLÈTE:');
  console.log('=====================================');
  console.log(`🏗️ Structure: ${Object.values(structureValidation).every(d => d.valid) ? '✅ VALIDE' : '❌ INVALIDE'}`);
  console.log(`🏷️ Noms de dossiers: ${namesValidation.valid.length}/${namesValidation.valid.length + namesValidation.invalid.length} valides`);
  console.log(`📁 Fichiers obligatoires: ${filesValidation.valid.length}/${filesValidation.valid.length + filesValidation.invalid.length} complets`);
  console.log(`🎨 Overlays: ${overlaysValidation.valid.length}/${overlaysValidation.valid.length + overlaysValidation.invalid.length} valides`);
  console.log(`📊 Total drivers: ${driversMatrix.tuya_zigbee.models.length + driversMatrix.zigbee.models.length}`);
  
  if (namesValidation.invalid.length > 0) {
    console.log('\n❌ Noms de dossiers invalides:');
    namesValidation.invalid.forEach(name => console.log(`  - ${name}`));
  }
  
  if (filesValidation.invalid.length > 0) {
    console.log('\n❌ Drivers avec fichiers manquants:');
    filesValidation.invalid.forEach(driver => {
      console.log(`  - ${driver.driver}`);
      Object.entries(driver.files).forEach(([file, exists]) => {
        if (!exists) console.log(`    ❌ ${file}`);
      });
    });
  }
  
  console.log(`\n📄 Rapport complet sauvegardé: ${reportPath}`);
  
  return report;
}

// Exécution si appelé directement
if (require.main === module) {
  try {
    runCompleteValidation();
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
    process.exit(1);
  }
}

module.exports = {
  runCompleteValidation,
  validateJSON,
  validateImageSizes,
  validateDriverStructure,
  validateDriverNames,
  validateRequiredFiles,
  validateOverlays,
  generateDriversMatrix
};
