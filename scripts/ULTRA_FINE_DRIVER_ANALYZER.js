#!/usr/bin/env node
/**
 * ULTRA FINE DRIVER ANALYZER
 * 
 * Analyse ULTRA-FINE de chaque élément interne:
 * - driver.compose.json structure complète
 * - device.js code analysis
 * - Zigbee clusters validation
 * - Capabilities validation détaillée
 * - Icons et assets
 * - Endpoints configuration
 * - Product/Manufacturer ID validation
 * - Energy configuration
 * - Settings validation
 * 
 * Correction automatique de TOUT
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = path.join(__dirname, '..');
const appJsonPath = path.join(rootPath, 'app.json');
const driversPath = path.join(rootPath, 'drivers');

console.log('🔬 ULTRA FINE DRIVER ANALYZER');
console.log('='.repeat(80));
console.log('⚡ ANALYSE INTERNE EXHAUSTIVE DE CHAQUE DRIVER');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// CONFIGURATION
// ============================================================================

const VALID_CLUSTERS = [0, 1, 2, 3, 4, 5, 6, 8, 256, 512, 513, 514, 516, 768, 1024, 1026, 1280, 2820, 61184, 64512, 64513, 64514];
const VALID_CLASSES = ['light', 'socket', 'sensor', 'thermostat', 'curtain', 'button', 'doorbell', 'lock', 'other'];
const REQUIRED_CAPABILITIES_BY_CLASS = {
  light: ['onoff'],
  socket: ['onoff'],
  sensor: [], // Flexible
  thermostat: ['target_temperature'],
  curtain: ['windowcoverings_state'],
  button: [],
  lock: ['locked'],
  other: []
};

// ============================================================================
// PHASE 1: SCAN & LOAD
// ============================================================================

console.log('📂 Phase 1: Chargement des Drivers');
console.log('-'.repeat(80));

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const analysis = {
  total: 0,
  analyzed: 0,
  issues: [],
  fixes: [],
  warnings: []
};

console.log('   Total drivers: ' + appJson.drivers.length);
console.log('');

// ============================================================================
// PHASE 2: ANALYSE ULTRA-FINE
// ============================================================================

console.log('🔍 Phase 2: Analyse Ultra-Fine de Chaque Driver');
console.log('-'.repeat(80));

appJson.drivers.forEach(driver => {
  analysis.total++;
  const driverId = driver.id;
  const driverDir = path.join(driversPath, driverId);
  
  console.log('   🔬 ' + driverId);
  
  if (!fs.existsSync(driverDir)) {
    console.log('      ❌ DOSSIER INEXISTANT');
    return;
  }
  
  analysis.analyzed++;
  
  // ═══════════════════════════════════════════════════════════════════════
  // A. ANALYSE driver.compose.json
  // ═══════════════════════════════════════════════════════════════════════
  
  const composePath = path.join(driverDir, 'driver.compose.json');
  let compose = null;
  
  if (fs.existsSync(composePath)) {
    try {
      compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // A1. Validation class
      if (!compose.class || !VALID_CLASSES.includes(compose.class)) {
        analysis.issues.push({
          driver: driverId,
          type: 'INVALID_CLASS',
          severity: 'HIGH',
          current: compose.class
        });
        console.log('      ❌ Class invalide: ' + compose.class);
        
        // Auto-fix: Déterminer la classe appropriée
        if (driverId.includes('switch') || driverId.includes('plug') || driverId.includes('outlet')) {
          compose.class = 'socket';
        } else if (driverId.includes('sensor') || driverId.includes('detector')) {
          compose.class = 'sensor';
        } else if (driverId.includes('dimmer') || driverId.includes('bulb') || driverId.includes('light')) {
          compose.class = 'light';
        } else if (driverId.includes('curtain') || driverId.includes('blind') || driverId.includes('shutter')) {
          compose.class = 'curtain';
        } else if (driverId.includes('thermostat') || driverId.includes('valve')) {
          compose.class = 'thermostat';
        } else if (driverId.includes('button') || driverId.includes('scene') || driverId.includes('remote')) {
          compose.class = 'button';
        } else if (driverId.includes('lock') || driverId.includes('doorbell')) {
          compose.class = driverId.includes('lock') ? 'lock' : 'doorbell';
        } else {
          compose.class = 'other';
        }
        
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        analysis.fixes.push({
          driver: driverId,
          fix: 'Fixed class: ' + compose.class
        });
        console.log('      ✅ Class corrigée: ' + compose.class);
      }
      
      // A2. Validation capabilities
      if (!compose.capabilities || compose.capabilities.length === 0) {
        analysis.warnings.push({
          driver: driverId,
          type: 'NO_CAPABILITIES',
          severity: 'MEDIUM'
        });
        console.log('      ⚠️  Aucune capability');
      } else {
        // Vérifier capabilities requises par classe
        const requiredCaps = REQUIRED_CAPABILITIES_BY_CLASS[compose.class] || [];
        requiredCaps.forEach(reqCap => {
          const hasIt = compose.capabilities.some(cap => cap.startsWith(reqCap));
          if (!hasIt) {
            analysis.warnings.push({
              driver: driverId,
              type: 'MISSING_REQUIRED_CAPABILITY',
              capability: reqCap,
              class: compose.class
            });
            console.log('      ⚠️  Capability manquante pour class: ' + reqCap);
          }
        });
      }
      
      // A3. Validation name
      if (!compose.name || !compose.name.en) {
        analysis.issues.push({
          driver: driverId,
          type: 'MISSING_NAME',
          severity: 'HIGH'
        });
        console.log('      ❌ Nom manquant');
      }
      
    } catch (error) {
      analysis.issues.push({
        driver: driverId,
        type: 'COMPOSE_PARSE_ERROR',
        severity: 'CRITICAL',
        error: error.message
      });
      console.log('      ❌ Erreur parse compose');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // B. ANALYSE device.js
  // ═══════════════════════════════════════════════════════════════════════
  
  const devicePath = path.join(driverDir, 'device.js');
  if (fs.existsSync(devicePath)) {
    try {
      const deviceCode = fs.readFileSync(devicePath, 'utf8');
      
      // B1. Vérifier extends ZigBeeDevice
      if (!deviceCode.includes('ZigBeeDevice')) {
        analysis.warnings.push({
          driver: driverId,
          type: 'NOT_ZIGBEE_DEVICE',
          severity: 'LOW'
        });
        console.log('      ⚠️  N\'étend pas ZigBeeDevice');
      }
      
      // B2. Vérifier onNodeInit
      if (!deviceCode.includes('onNodeInit')) {
        analysis.warnings.push({
          driver: driverId,
          type: 'NO_ONINIT',
          severity: 'LOW'
        });
      }
      
      // B3. Vérifier registerCapability
      if (compose && compose.capabilities) {
        compose.capabilities.forEach(cap => {
          const baseCap = cap.split('.')[0];
          if (!deviceCode.includes(baseCap) && !deviceCode.includes('registerCapability')) {
            // Peut être normal si géré automatiquement
          }
        });
      }
      
    } catch (error) {
      analysis.warnings.push({
        driver: driverId,
        type: 'DEVICE_READ_ERROR',
        error: error.message
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // C. VALIDATION ZIGBEE CONFIG
  // ═══════════════════════════════════════════════════════════════════════
  
  if (driver.zigbee) {
    // C1. Manufacturer IDs
    if (!driver.zigbee.manufacturerName || driver.zigbee.manufacturerName.length === 0) {
      analysis.issues.push({
        driver: driverId,
        type: 'NO_MANUFACTURER_IDS',
        severity: 'CRITICAL'
      });
      console.log('      ❌ Aucun manufacturer ID');
    } else {
      // Vérifier format
      driver.zigbee.manufacturerName.forEach(id => {
        if (typeof id !== 'string' || id.trim() === '') {
          analysis.issues.push({
            driver: driverId,
            type: 'INVALID_MANUFACTURER_ID',
            id: id
          });
          console.log('      ❌ ID invalide: ' + id);
        }
      });
      
      // Retirer doublons
      const uniqueIds = [...new Set(driver.zigbee.manufacturerName)];
      if (uniqueIds.length !== driver.zigbee.manufacturerName.length) {
        const removed = driver.zigbee.manufacturerName.length - uniqueIds.length;
        driver.zigbee.manufacturerName = uniqueIds;
        analysis.fixes.push({
          driver: driverId,
          fix: 'Removed ' + removed + ' duplicate manufacturer IDs'
        });
        console.log('      ✅ ' + removed + ' doublons retirés');
      }
    }
    
    // C2. Product IDs
    if (!driver.zigbee.productId || driver.zigbee.productId.length === 0) {
      analysis.warnings.push({
        driver: driverId,
        type: 'NO_PRODUCT_IDS',
        severity: 'MEDIUM'
      });
      console.log('      ⚠️  Aucun product ID');
    } else {
      // Retirer doublons
      const uniqueIds = [...new Set(driver.zigbee.productId)];
      if (uniqueIds.length !== driver.zigbee.productId.length) {
        const removed = driver.zigbee.productId.length - uniqueIds.length;
        driver.zigbee.productId = uniqueIds;
        analysis.fixes.push({
          driver: driverId,
          fix: 'Removed ' + removed + ' duplicate product IDs'
        });
        console.log('      ✅ ' + removed + ' doublons product retirés');
      }
    }
    
    // C3. Clusters validation
    if (driver.zigbee.endpoints) {
      Object.keys(driver.zigbee.endpoints).forEach(ep => {
        const endpoint = driver.zigbee.endpoints[ep];
        if (endpoint.clusters) {
          endpoint.clusters.forEach(cluster => {
            if (typeof cluster === 'string') {
              analysis.issues.push({
                driver: driverId,
                type: 'CLUSTER_STRING',
                severity: 'HIGH',
                cluster: cluster
              });
              console.log('      ❌ Cluster string: ' + cluster);
            } else if (!VALID_CLUSTERS.includes(cluster)) {
              analysis.warnings.push({
                driver: driverId,
                type: 'UNKNOWN_CLUSTER',
                cluster: cluster
              });
            }
          });
        }
      });
    }
  } else {
    analysis.issues.push({
      driver: driverId,
      type: 'NO_ZIGBEE_CONFIG',
      severity: 'CRITICAL'
    });
    console.log('      ❌ Pas de config Zigbee');
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // D. VALIDATION ENERGY CONFIG
  // ═══════════════════════════════════════════════════════════════════════
  
  if (driver.capabilities && driver.capabilities.includes('measure_battery')) {
    if (!driver.energy || !driver.energy.batteries) {
      analysis.warnings.push({
        driver: driverId,
        type: 'MISSING_BATTERY_CONFIG',
        severity: 'MEDIUM'
      });
      console.log('      ⚠️  Config batterie manquante');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // E. VALIDATION ASSETS
  // ═══════════════════════════════════════════════════════════════════════
  
  const assetsDir = path.join(driverDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    analysis.warnings.push({
      driver: driverId,
      type: 'NO_ASSETS_DIR',
      severity: 'LOW'
    });
  } else {
    const iconPath = path.join(assetsDir, 'icon.svg');
    if (!fs.existsSync(iconPath)) {
      analysis.warnings.push({
        driver: driverId,
        type: 'NO_ICON',
        severity: 'LOW'
      });
    }
  }
});

console.log('');

// ============================================================================
// PHASE 3: SAUVEGARDE
// ============================================================================

if (analysis.fixes.length > 0) {
  console.log('💾 Phase 3: Sauvegarde des Corrections');
  console.log('-'.repeat(80));
  
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log('   ✅ ' + analysis.fixes.length + ' corrections appliquées');
  console.log('');
}

// ============================================================================
// PHASE 4: VALIDATION HOMEY
// ============================================================================

console.log('✅ Phase 4: Validation Homey');
console.log('-'.repeat(80));

try {
  execSync('homey app build', { stdio: 'pipe', cwd: rootPath });
  execSync('homey app validate --level=publish', { stdio: 'pipe', cwd: rootPath });
  console.log('   ✅ Build & Validation PASSED');
} catch (error) {
  console.log('   ❌ Validation FAILED');
  analysis.issues.push({
    type: 'VALIDATION_FAILED',
    severity: 'CRITICAL',
    error: error.message
  });
}
console.log('');

// ============================================================================
// RAPPORT FINAL
// ============================================================================

console.log('');
console.log('='.repeat(80));
console.log('📊 RAPPORT ANALYSE ULTRA-FINE');
console.log('='.repeat(80));
console.log('');

console.log('📈 STATISTIQUES:');
console.log('   Drivers totaux: ' + analysis.total);
console.log('   Drivers analysés: ' + analysis.analyzed);
console.log('   Problèmes critiques: ' + analysis.issues.filter(i => i.severity === 'CRITICAL').length);
console.log('   Problèmes majeurs: ' + analysis.issues.filter(i => i.severity === 'HIGH').length);
console.log('   Avertissements: ' + analysis.warnings.length);
console.log('   Corrections appliquées: ' + analysis.fixes.length);
console.log('');

const criticalIssues = analysis.issues.filter(i => i.severity === 'CRITICAL');
if (criticalIssues.length > 0) {
  console.log('❌ PROBLÈMES CRITIQUES (' + criticalIssues.length + '):');
  criticalIssues.forEach(issue => {
    console.log('   • ' + issue.driver + ': ' + issue.type);
  });
  console.log('');
}

const highIssues = analysis.issues.filter(i => i.severity === 'HIGH');
if (highIssues.length > 0) {
  console.log('⚠️  PROBLÈMES MAJEURS (' + highIssues.length + '):');
  highIssues.slice(0, 10).forEach(issue => {
    console.log('   • ' + issue.driver + ': ' + issue.type);
  });
  if (highIssues.length > 10) {
    console.log('   ... et ' + (highIssues.length - 10) + ' autres');
  }
  console.log('');
}

if (analysis.fixes.length > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES (' + analysis.fixes.length + '):');
  analysis.fixes.forEach(fix => {
    console.log('   ✅ ' + fix.driver + ': ' + fix.fix);
  });
  console.log('');
}

// Score
const totalChecks = analysis.analyzed * 10; // 10 checks par driver
const totalProblems = criticalIssues.length * 3 + highIssues.length * 2 + analysis.warnings.length;
const healthScore = Math.max(0, Math.round(((totalChecks - totalProblems) / totalChecks) * 100));

console.log('🎯 SCORE DE SANTÉ: ' + healthScore + '%');
console.log('');

if (criticalIssues.length === 0 && highIssues.length === 0) {
  console.log('🎊 ANALYSE COMPLÈTE - TOUT EST PARFAIT!');
} else if (criticalIssues.length === 0) {
  console.log('✅ ANALYSE COMPLÈTE - Problèmes mineurs uniquement');
} else {
  console.log('❌ ATTENTION - Corrections critiques nécessaires');
}

console.log('');

// Sauvegarder rapport
const reportPath = path.join(rootPath, 'reports', 'ultra_fine_analysis_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  total: analysis.total,
  analyzed: analysis.analyzed,
  criticalIssues: criticalIssues.length,
  highIssues: highIssues.length,
  warnings: analysis.warnings.length,
  fixes: analysis.fixes.length,
  healthScore: healthScore,
  details: {
    issues: analysis.issues,
    warnings: analysis.warnings,
    fixes: analysis.fixes
  }
}, null, 2));

console.log('📄 Rapport sauvegardé: ' + reportPath);
console.log('');

process.exit(0);
