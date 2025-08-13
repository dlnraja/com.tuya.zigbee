// !/usr/bin/env node

/**
 * Script de correction de la structure des drivers
 * Élimine les duplications et restaure la nomenclature standard
 */

const fs = require('fs');
const path = require('path');

// Structure standard des drivers
const STANDARD_STRUCTURE = {
  'drivers/tuya': {
    'switch': ['ts0001', 'ts0002', 'ts0003'],
    'dimmer': ['ts110f'],
    'light': ['ts0505a', 'ts0505b', 'ts0505c', 'ts0502a'],
    'plug': ['ts011f', 'ts0121'],
    'sensor': ['ts0201', 'ts0202', 'ts0203', 'ts0204', 'ts0205', 'ts0207'],
    'climate': ['ts0601'],
    'cover': ['ts130f'],
    'siren': ['ts004f', 'ts1001']
  },
  'drivers/zigbee': {
    'light': ['aqara', 'ikea', 'tuya', 'generic'],
    'plug': ['aqara', 'ikea', 'tuya', 'generic'],
    'sensor': ['aqara', 'ikea', 'tuya', 'generic'],
    'cover': ['aqara', 'ikea', 'tuya', 'generic'],
    'lock': ['aqara', 'ikea', 'tuya', 'generic'],
    'siren': ['aqara', 'ikea', 'tuya', 'generic'],
    'switch': ['generic']
  }
};

// Dossiers à supprimer (duplications)
const DIRECTORIES_TO_REMOVE = [
  'drivers/tuya/sensor-motion',
  'drivers/tuya/sensor-presence', 
  'drivers/tuya/sensor-temperature',
  'drivers/tuya/climate-thermostat',
  'drivers/tuya/siren',
  'drivers/zigbee/climate',
  'drivers/zigbee/light/tuya',
  'drivers/zigbee/plug/tuya',
  'drivers/zigbee/sensor/tuya',
  'drivers/zigbee/cover/tuya',
  'drivers/zigbee/lock/tuya',
  'drivers/zigbee/siren/tuya'
];

// Dossiers à conserver et réorganiser
const PRESERVE_AND_REORGANIZE = {
  'drivers/tuya/plug/tuya': 'drivers/tuya/plug',
  'drivers/tuya/sensor/tuya': 'drivers/tuya/sensor',
  'drivers/tuya/switch/tuya': 'drivers/tuya/switch',
  'drivers/tuya/light/tuya': 'drivers/tuya/light',
  'drivers/tuya/dimmer/tuya': 'drivers/tuya/dimmer',
  'drivers/tuya/climate/tuya': 'drivers/tuya/climate',
  'drivers/tuya/cover/tuya': 'drivers/tuya/cover',
  'drivers/tuya/siren/tuya': 'drivers/tuya/siren'
};

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function safeRemoveDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      log(`✅ Supprimé: ${dirPath}`);
      return true;
    }
  } catch (error) {
    log(`❌ Erreur suppression ${dirPath}: ${error.message}`);
  }
  return false;
}

function safeMoveDirectory(src, dest) {
  try {
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.renameSync(src, dest);
      log(`✅ Déplacé: ${src} → ${dest}`);
      return true;
    }
  } catch (error) {
    log(`❌ Erreur déplacement ${src} → ${dest}: ${error.message}`);
  }
  return false;
}

function createStandardStructure() {
  log('🏗️  Création de la structure standard...');
  
  for (const [domain, categories] of Object.entries(STANDARD_STRUCTURE)) {
    for (const [category, models] of Object.entries(categories)) {
      const categoryPath = path.join(domain, category);
      
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
        log(`📁 Créé: ${categoryPath}`);
      }
      
      for (const model of models) {
        const modelPath = path.join(categoryPath, model);
        if (!fs.existsSync(modelPath)) {
          fs.mkdirSync(modelPath, { recursive: true });
          log(`📁 Créé: ${modelPath}`);
        }
      }
    }
  }
}

function cleanupDuplicatedDirectories() {
  log('🧹 Nettoyage des dossiers dupliqués...');
  
  let removedCount = 0;
  for (const dir of DIRECTORIES_TO_REMOVE) {
    if (safeRemoveDirectory(dir)) {
      removedCount++;
    }
  }
  
  log(`✅ ${removedCount} dossiers dupliqués supprimés`);
}

function reorganizePreservedDirectories() {
  log('🔄 Réorganisation des dossiers préservés...');
  
  let movedCount = 0;
  for (const [src, dest] of Object.entries(PRESERVE_AND_REORGANIZE)) {
    if (safeMoveDirectory(src, dest)) {
      movedCount++;
    }
  }
  
  log(`✅ ${movedCount} dossiers réorganisés`);
}

function validateStructure() {
  log('🔍 Validation de la structure...');
  
  let errors = [];
  
  for (const [domain, categories] of Object.entries(STANDARD_STRUCTURE)) {
    if (!fs.existsSync(domain)) {
      errors.push(`❌ Domaine manquant: ${domain}`);
      continue;
    }
    
    for (const [category, models] of Object.entries(categories)) {
      const categoryPath = path.join(domain, category);
      if (!fs.existsSync(categoryPath)) {
        errors.push(`❌ Catégorie manquante: ${categoryPath}`);
        continue;
      }
      
      for (const model of models) {
        const modelPath = path.join(categoryPath, model);
        if (!fs.existsSync(modelPath)) {
          errors.push(`❌ Modèle manquant: ${modelPath}`);
        }
      }
    }
  }
  
  if (errors.length === 0) {
    log('✅ Structure validée avec succès');
  } else {
    log('❌ Erreurs de structure détectées:');
    errors.forEach(error => log(error));
  }
  
  return errors.length === 0;
}

function generateReport() {
  log('📊 Génération du rapport...');
  
  const report = {
    timestamp: new Date().toISOString(),
    action: 'Correction de la structure des drivers',
    directoriesRemoved: DIRECTORIES_TO_REMOVE.length,
    directoriesReorganized: Object.keys(PRESERVE_AND_REORGANIZE).length,
    standardStructure: STANDARD_STRUCTURE
  };
  
  const reportPath = 'reports/structure-fix-report.json';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`📄 Rapport généré: ${reportPath}`);
}

function main() {
  log('🚀 Début de la correction de la structure des drivers...');
  
  try {
    // 1. Nettoyage des duplications
    cleanupDuplicatedDirectories();
    
    // 2. Réorganisation des dossiers préservés
    reorganizePreservedDirectories();
    
    // 3. Création de la structure standard
    createStandardStructure();
    
    // 4. Validation
    const isValid = validateStructure();
    
    // 5. Rapport
    generateReport();
    
    if (isValid) {
      log('🎉 Structure des drivers corrigée avec succès !');
      process.exit(0);
    } else {
      log('⚠️  Structure corrigée mais des erreurs persistent');
      process.exit(1);
    }
    
  } catch (error) {
    log(`💥 Erreur fatale: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fixDriverStructure: main,
  validateStructure,
  STANDARD_STRUCTURE
};
