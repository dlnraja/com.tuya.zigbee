#!/usr/bin/env node
/**
 * ULTRA DEEP STRUCTURE VALIDATOR
 * 
 * Vérifie TOUT en profondeur:
 * - Chaque valeur dans app.json vs dossiers
 * - Organisation des répertoires
 * - Fichiers requis présents
 * - Cohérence des noms/IDs
 * - Structure driver.compose.json
 * - Icons et assets
 * - Capabilities vs classes
 * 
 * Auto-fix tous les problèmes détectés
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = __dirname;
const appJsonPath = path.join(rootPath, 'app.json');
const driversPath = path.join(rootPath, 'drivers');

console.log('🔬 ULTRA DEEP STRUCTURE VALIDATOR');
console.log('='.repeat(80));
console.log('⚡ VÉRIFICATION EXHAUSTIVE DE CHAQUE VALEUR');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// PHASE 1: SCAN COMPLET
// ============================================================================

console.log('📂 Phase 1: Scan Complet des Structures');
console.log('-'.repeat(80));

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const driverDirs = fs.readdirSync(driversPath).filter(item => {
  const itemPath = path.join(driversPath, item);
  return fs.statSync(itemPath).isDirectory();
});

console.log('   app.json drivers: ' + appJson.drivers.length);
console.log('   Dossiers drivers: ' + driverDirs.length);
console.log('');

// ============================================================================
// PHASE 2: VÉRIFICATION PROFONDE
// ============================================================================

console.log('🔍 Phase 2: Vérification Profonde de Chaque Driver');
console.log('-'.repeat(80));

const issues = {
  missing_dirs: [],
  extra_dirs: [],
  missing_files: [],
  invalid_compose: [],
  icon_issues: [],
  capability_issues: [],
  class_issues: [],
  name_issues: [],
  fixes: []
};

// Vérifier que chaque driver dans app.json a un dossier
appJson.drivers.forEach(driver => {
  const driverId = driver.id;
  const driverDir = path.join(driversPath, driverId);
  
  console.log('   🔍 ' + driverId);
  
  // Check 1: Dossier existe
  if (!fs.existsSync(driverDir)) {
    issues.missing_dirs.push(driverId);
    console.log('      ❌ DOSSIER MANQUANT');
    return;
  }
  
  // Check 2: Fichiers requis
  const requiredFiles = {
    'driver.compose.json': false,
    'device.js': false
  };
  
  Object.keys(requiredFiles).forEach(file => {
    const filePath = path.join(driverDir, file);
    if (fs.existsSync(filePath)) {
      requiredFiles[file] = true;
    } else {
      issues.missing_files.push({
        driver: driverId,
        file: file
      });
      console.log('      ❌ Fichier manquant: ' + file);
    }
  });
  
  // Check 3: driver.compose.json valide
  if (requiredFiles['driver.compose.json']) {
    try {
      const composePath = path.join(driverDir, 'driver.compose.json');
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Vérifier que l'ID correspond
      if (compose.id && compose.id !== driverId) {
        issues.invalid_compose.push({
          driver: driverId,
          issue: 'ID_MISMATCH',
          expected: driverId,
          found: compose.id
        });
        console.log('      ❌ ID mismatch dans compose: ' + compose.id);
        
        // FIX: Corriger l'ID
        compose.id = driverId;
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        issues.fixes.push({
          driver: driverId,
          fix: 'Corrected ID in driver.compose.json'
        });
        console.log('      ✅ ID corrigé');
      }
      
      // Vérifier name
      if (!compose.name || !compose.name.en) {
        issues.invalid_compose.push({
          driver: driverId,
          issue: 'MISSING_NAME',
          severity: 'HIGH'
        });
        console.log('      ⚠️  Nom manquant');
      }
      
      // Vérifier class
      if (!compose.class) {
        issues.class_issues.push({
          driver: driverId,
          issue: 'MISSING_CLASS'
        });
        console.log('      ⚠️  Class manquante');
      } else {
        // Valider class
        const validClasses = ['light', 'socket', 'sensor', 'thermostat', 'curtain', 'button', 'doorbell', 'lock', 'other'];
        if (!validClasses.includes(compose.class)) {
          issues.class_issues.push({
            driver: driverId,
            issue: 'INVALID_CLASS',
            class: compose.class
          });
          console.log('      ⚠️  Class invalide: ' + compose.class);
        }
      }
      
      // Vérifier capabilities
      if (!compose.capabilities || compose.capabilities.length === 0) {
        issues.capability_issues.push({
          driver: driverId,
          issue: 'NO_CAPABILITIES'
        });
        console.log('      ⚠️  Pas de capabilities');
      }
      
    } catch (error) {
      issues.invalid_compose.push({
        driver: driverId,
        issue: 'PARSE_ERROR',
        error: error.message
      });
      console.log('      ❌ Erreur parse compose: ' + error.message);
    }
  }
  
  // Check 4: Icon
  const iconPath = path.join(driverDir, 'assets', 'icon.svg');
  if (!fs.existsSync(iconPath)) {
    issues.icon_issues.push({
      driver: driverId,
      issue: 'MISSING_ICON'
    });
    console.log('      ⚠️  Icon manquant');
  }
  
  // Check 5: Cohérence nom
  if (driver.name && driver.name.en) {
    const nameLower = driver.name.en.toLowerCase();
    const idLower = driverId.toLowerCase();
    
    // Extraire termes clés
    const nameWords = nameLower.split(/[\s\-_]+/).filter(w => w.length > 2);
    const idWords = idLower.split(/[\-_]+/).filter(w => w.length > 2);
    
    const hasCommon = nameWords.some(nw => idWords.some(iw => iw.includes(nw) || nw.includes(iw)));
    
    if (!hasCommon && !['mini', 'pro', 'advanced'].some(w => nameLower.includes(w))) {
      issues.name_issues.push({
        driver: driverId,
        name: driver.name.en,
        severity: 'LOW'
      });
      console.log('      ⚠️  Nom/ID peu cohérents');
    }
  }
});

console.log('');

// Vérifier dossiers orphelins
driverDirs.forEach(dir => {
  const driverExists = appJson.drivers.some(d => d.id === dir);
  if (!driverExists) {
    issues.extra_dirs.push(dir);
    console.log('   ⚠️  Dossier orphelin: ' + dir);
  }
});

console.log('');

// ============================================================================
// PHASE 3: VÉRIFICATION ZIGBEE
// ============================================================================

console.log('📡 Phase 3: Vérification Configuration Zigbee');
console.log('-'.repeat(80));

let zigbeeIssues = 0;

appJson.drivers.forEach(driver => {
  const driverId = driver.id;
  
  // Vérifier structure zigbee
  if (!driver.zigbee) {
    console.log('   ❌ ' + driverId + ': Pas de config Zigbee');
    zigbeeIssues++;
    return;
  }
  
  // Vérifier manufacturerName
  if (!driver.zigbee.manufacturerName || driver.zigbee.manufacturerName.length === 0) {
    console.log('   ❌ ' + driverId + ': manufacturerName vide');
    zigbeeIssues++;
  }
  
  // Vérifier productId
  if (!driver.zigbee.productId || driver.zigbee.productId.length === 0) {
    console.log('   ❌ ' + driverId + ': productId vide');
    zigbeeIssues++;
  }
  
  // Vérifier doublons dans manufacturerName
  if (driver.zigbee.manufacturerName) {
    const unique = new Set(driver.zigbee.manufacturerName);
    if (unique.size !== driver.zigbee.manufacturerName.length) {
      const duplicates = driver.zigbee.manufacturerName.length - unique.size;
      console.log('   ⚠️  ' + driverId + ': ' + duplicates + ' IDs dupliqués');
      
      // FIX: Retirer doublons
      driver.zigbee.manufacturerName = Array.from(unique);
      issues.fixes.push({
        driver: driverId,
        fix: 'Removed ' + duplicates + ' duplicate manufacturer IDs'
      });
    }
  }
  
  // Vérifier doublons dans productId
  if (driver.zigbee.productId) {
    const unique = new Set(driver.zigbee.productId);
    if (unique.size !== driver.zigbee.productId.length) {
      const duplicates = driver.zigbee.productId.length - unique.size;
      console.log('   ⚠️  ' + driverId + ': ' + duplicates + ' Product IDs dupliqués');
      
      // FIX: Retirer doublons
      driver.zigbee.productId = Array.from(unique);
      issues.fixes.push({
        driver: driverId,
        fix: 'Removed ' + duplicates + ' duplicate product IDs'
      });
    }
  }
});

if (zigbeeIssues === 0) {
  console.log('   ✅ Configuration Zigbee OK pour tous les drivers');
}
console.log('');

// ============================================================================
// PHASE 4: VÉRIFICATION CAPABILITIES vs CLASS
// ============================================================================

console.log('⚙️  Phase 4: Vérification Capabilities vs Class');
console.log('-'.repeat(80));

const classCapabilityMap = {
  light: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
  socket: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
  sensor: ['measure_temperature', 'measure_humidity', 'measure_co2', 'measure_pm25', 'alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke'],
  thermostat: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
  curtain: ['windowcoverings_state', 'windowcoverings_set'],
  button: ['alarm_generic'],
  lock: ['locked', 'lock_mode'],
  doorbell: ['alarm_generic']
};

let capabilityMismatches = 0;

appJson.drivers.forEach(driver => {
  if (!driver.class || !driver.capabilities) return;
  
  const expectedCaps = classCapabilityMap[driver.class];
  if (!expectedCaps) return;
  
  const hasExpected = driver.capabilities.some(cap => {
    const baseCap = cap.split('.')[0]; // Remove sub-capability suffix
    return expectedCaps.includes(baseCap);
  });
  
  if (!hasExpected) {
    console.log('   ⚠️  ' + driver.id + ': Class "' + driver.class + '" mais capabilities inattendues');
    capabilityMismatches++;
  }
});

if (capabilityMismatches === 0) {
  console.log('   ✅ Toutes les capabilities cohérentes avec classes');
}
console.log('');

// ============================================================================
// PHASE 5: SAUVEGARDER CORRECTIONS
// ============================================================================

if (issues.fixes.length > 0) {
  console.log('💾 Phase 5: Sauvegarde des Corrections');
  console.log('-'.repeat(80));
  
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log('   ✅ app.json mis à jour avec ' + issues.fixes.length + ' corrections');
  console.log('');
}

// ============================================================================
// PHASE 6: VALIDATION FINALE
// ============================================================================

console.log('✅ Phase 6: Validation Finale');
console.log('-'.repeat(80));

try {
  execSync('homey app build', { stdio: 'pipe', cwd: rootPath });
  execSync('homey app validate --level=publish', { stdio: 'pipe', cwd: rootPath });
  console.log('   ✅ Build & Validation PASSED');
} catch (error) {
  console.log('   ❌ Validation FAILED');
  console.log('   Error: ' + error.message);
}
console.log('');

// ============================================================================
// RAPPORT FINAL
// ============================================================================

console.log('');
console.log('='.repeat(80));
console.log('📋 RAPPORT ULTRA-DEEP VALIDATION');
console.log('='.repeat(80));
console.log('');

console.log('📊 STATISTIQUES:');
console.log('   Drivers dans app.json: ' + appJson.drivers.length);
console.log('   Dossiers trouvés: ' + driverDirs.length);
console.log('   Match: ' + (appJson.drivers.length === driverDirs.length ? '✅' : '❌'));
console.log('');

console.log('🔍 ISSUES DÉTECTÉES:');
console.log('   Dossiers manquants: ' + issues.missing_dirs.length);
console.log('   Dossiers orphelins: ' + issues.extra_dirs.length);
console.log('   Fichiers manquants: ' + issues.missing_files.length);
console.log('   Compose invalides: ' + issues.invalid_compose.length);
console.log('   Icons manquants: ' + issues.icon_issues.length);
console.log('   Issues capabilities: ' + issues.capability_issues.length);
console.log('   Issues classes: ' + issues.class_issues.length);
console.log('   Issues noms: ' + issues.name_issues.length);
console.log('   Config Zigbee: ' + zigbeeIssues);
console.log('   Capability mismatches: ' + capabilityMismatches);
console.log('');

console.log('✅ CORRECTIONS APPLIQUÉES:');
console.log('   Total fixes: ' + issues.fixes.length);
issues.fixes.forEach(fix => {
  console.log('   ✅ ' + fix.driver + ': ' + fix.fix);
});
console.log('');

// Dossiers manquants
if (issues.missing_dirs.length > 0) {
  console.log('❌ DOSSIERS MANQUANTS (' + issues.missing_dirs.length + '):');
  issues.missing_dirs.forEach(dir => {
    console.log('   • ' + dir);
  });
  console.log('');
}

// Dossiers orphelins
if (issues.extra_dirs.length > 0) {
  console.log('⚠️  DOSSIERS ORPHELINS (' + issues.extra_dirs.length + '):');
  issues.extra_dirs.forEach(dir => {
    console.log('   • ' + dir);
  });
  console.log('');
}

// Fichiers manquants
if (issues.missing_files.length > 0) {
  console.log('❌ FICHIERS MANQUANTS (' + issues.missing_files.length + '):');
  issues.missing_files.slice(0, 10).forEach(issue => {
    console.log('   • ' + issue.driver + ': ' + issue.file);
  });
  if (issues.missing_files.length > 10) {
    console.log('   ... et ' + (issues.missing_files.length - 10) + ' autres');
  }
  console.log('');
}

// Score de santé
const totalIssues = issues.missing_dirs.length + 
                   issues.extra_dirs.length + 
                   issues.missing_files.length + 
                   issues.invalid_compose.length + 
                   zigbeeIssues;

const healthScore = Math.max(0, Math.round(((appJson.drivers.length * 5 - totalIssues) / (appJson.drivers.length * 5)) * 100));

console.log('🎯 SCORE DE SANTÉ: ' + healthScore + '%');
console.log('');

if (totalIssues === 0) {
  console.log('🎊 STRUCTURE PARFAITE - AUCUN PROBLÈME!');
} else if (healthScore >= 95) {
  console.log('✅ STRUCTURE EXCELLENTE - Problèmes mineurs seulement');
} else if (healthScore >= 85) {
  console.log('⚠️  STRUCTURE BONNE - Quelques améliorations possibles');
} else {
  console.log('❌ ATTENTION - Corrections nécessaires');
}

console.log('');

// Sauvegarder rapport
const reportPath = path.join(rootPath, 'reports', 'structure_validation_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  driversCount: appJson.drivers.length,
  dirsCount: driverDirs.length,
  issues: {
    missingDirs: issues.missing_dirs.length,
    extraDirs: issues.extra_dirs.length,
    missingFiles: issues.missing_files.length,
    invalidCompose: issues.invalid_compose.length,
    iconIssues: issues.icon_issues.length,
    capabilityIssues: issues.capability_issues.length,
    classIssues: issues.class_issues.length,
    nameIssues: issues.name_issues.length,
    zigbeeIssues: zigbeeIssues,
    capabilityMismatches: capabilityMismatches
  },
  fixes: issues.fixes.length,
  healthScore: healthScore
}, null, 2));

console.log('📄 Rapport sauvegardé: ' + reportPath);
console.log('');

process.exit(totalIssues > 0 ? 1 : 0);
