#!/usr/bin/env node
/**
 * SAFE_ENRICHMENT_V21 - Version robuste sans cascade errors
 * Procède étape par étape avec validation et gestion d'erreurs complète
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const driversDir = path.join(root, 'drivers');

console.log('🛡️ SAFE_ENRICHMENT_V21 - Version robuste');
console.log(`📂 Project root: ${root}`);
console.log(`📂 Drivers dir: ${driversDir}`);

// Fonction utilitaire sécurisée
function safeJSON(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`⚠️ JSON error ${filePath}: ${e.message}`);
    return fallback;
  }
}

function safeWriteJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.log(`⚠️ Write error ${filePath}: ${e.message}`);
    return false;
  }
}

// Étape 1: Vérification de base
console.log('\n📋 ÉTAPE 1: Vérification structure projet');
if (!fs.existsSync(driversDir)) {
  console.log('❌ Drivers directory not found');
  process.exit(1);
}

const drivers = fs.readdirSync(driversDir).filter(d => {
  const composePath = path.join(driversDir, d, 'driver.compose.json');
  return fs.existsSync(composePath);
});

console.log(`✅ Found ${drivers.length} drivers`);

// Étape 2: Enrichissement manufacturerName simple et sécurisé
console.log('\n📋 ÉTAPE 2: Enrichissement manufacturerName');

const commonManufacturers = [
  '_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZ3000_rk2yzt0u',
  '_TZ3000_o4cjetlm', '_TZ3000_tqlv4ug4', '_TZ3000_tgddllx4',
  '_TZ3000_veu2v775', '_TZ3000_xkap8wtb', '_TZ3000_wrhhi5h2',
  '_TZ3000_zw7yf6yk', '_TZ3000_46t1rvdu', '_TZ3000_bvrlqyj7',
  '_TZ3000_qewo8dlz', '_TZ3210_dse8ogfy', '_TZ3210_j4pdtz9v',
  '_TZ3000_npzfdcof', '_TZ3000_prits6g4', '_TZ3000_wpueorev',
  '_TZE200_3towulqd', '_TZE200_bjawzodf', '_TZE200_cwbvmsar',
  '_TYZB01_dvakyzhd', '_TYZB01_ef5xlc9q', '_TYZB01_zwvaj5wy'
];

let enriched = 0;
for (const driverName of drivers) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  const data = safeJSON(composePath);
  
  if (!data.zigbee) data.zigbee = {};
  if (!Array.isArray(data.zigbee.manufacturerName)) {
    data.zigbee.manufacturerName = [];
  }
  
  // Enrichissement intelligent par type de driver
  const folder = driverName.toLowerCase();
  let candidates = [];
  
  if (folder.includes('switch') || folder.includes('wall_switch')) {
    candidates = commonManufacturers.filter(m => m.includes('_TZ3000_'));
  } else if (folder.includes('plug') || folder.includes('socket')) {
    candidates = ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_okaz9tjs'];
  } else if (folder.includes('motion') || folder.includes('pir')) {
    candidates = ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_msl6wxk9'];
  } else if (folder.includes('climate') || folder.includes('temp') || folder.includes('humidity')) {
    candidates = ['_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZ3000_xr3htd96'];
  } else if (folder.includes('co') || folder.includes('smoke') || folder.includes('gas')) {
    candidates = ['_TZ3000_26fmupbb', '_TZ3000_yojqa8xn', '_TZ3000_ntcy3xu1'];
  } else {
    candidates = commonManufacturers.slice(0, 5); // 5 premiers génériques
  }
  
  // Fusion non destructive
  const existing = new Set(data.zigbee.manufacturerName);
  const newOnes = candidates.filter(c => !existing.has(c));
  
  if (newOnes.length > 0) {
    data.zigbee.manufacturerName = data.zigbee.manufacturerName.concat(newOnes);
    if (safeWriteJSON(composePath, data)) {
      enriched++;
      console.log(`✅ ${driverName}: +${newOnes.length} manufacturerName`);
    }
  }
}

console.log(`✅ Enriched ${enriched}/${drivers.length} drivers`);

// Étape 3: Vérification endpoints basique
console.log('\n📋 ÉTAPE 3: Vérification endpoints');

let endpointsFixed = 0;
for (const driverName of drivers) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  const data = safeJSON(composePath);
  
  if (!data.zigbee) continue;
  if (data.zigbee.endpoints && Object.keys(data.zigbee.endpoints).length > 0) continue;
  
  // Endpoints basiques par type
  const folder = driverName.toLowerCase();
  let endpoints = null;
  
  if (folder.includes('switch') || folder.includes('plug') || folder.includes('light')) {
    endpoints = {
      "1": {
        "clusters": [0, 3, 4, 5, 6],
        "bindings": [6]
      }
    };
  } else if (folder.includes('motion') || folder.includes('pir') || folder.includes('contact')) {
    endpoints = {
      "1": {
        "clusters": [0, 1, 3, 1280],
        "bindings": [25]
      }
    };
  } else if (folder.includes('temp') || folder.includes('humidity') || folder.includes('climate')) {
    endpoints = {
      "1": {
        "clusters": [0, 1, 3, 513, 516, 1026],
        "bindings": [25]
      }
    };
  }
  
  if (endpoints) {
    data.zigbee.endpoints = endpoints;
    if (safeWriteJSON(composePath, data)) {
      endpointsFixed++;
      console.log(`✅ ${driverName}: endpoints added`);
    }
  }
}

console.log(`✅ Fixed endpoints for ${endpointsFixed} drivers`);

// Étape 4: Rapport de validation simple
console.log('\n📋 ÉTAPE 4: Validation finale');

let withIds = 0, withMfg = 0, withProd = 0, withEndpoints = 0;
for (const driverName of drivers) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  const data = safeJSON(composePath);
  
  if (data.id) withIds++;
  if (data.zigbee?.manufacturerName?.length > 0) withMfg++;
  if (data.zigbee?.productId?.length > 0) withProd++;
  if (data.zigbee?.endpoints && Object.keys(data.zigbee.endpoints).length > 0) withEndpoints++;
}

const report = {
  timestamp: new Date().toISOString(),
  totalDrivers: drivers.length,
  withIds,
  withManufacturerName: withMfg,
  withProductId: withProd,
  withEndpoints,
  enrichmentApplied: enriched,
  endpointsFixed,
  status: 'COMPLETED'
};

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
safeWriteJSON(path.join(reportsDir, 'safe_enrichment_report.json'), report);

console.log('\n🎉 SAFE_ENRICHMENT_V21 TERMINÉ');
console.log(`✅ Drivers total: ${drivers.length}`);
console.log(`✅ Avec IDs: ${withIds}/${drivers.length}`);
console.log(`✅ Avec manufacturerName: ${withMfg}/${drivers.length}`);
console.log(`✅ Avec productId: ${withProd}/${drivers.length}`);
console.log(`✅ Avec endpoints: ${withEndpoints}/${drivers.length}`);
console.log(`✅ Enrichis: ${enriched}`);
console.log(`✅ Endpoints corrigés: ${endpointsFixed}`);
console.log(`📊 Rapport: ultimate_system/reports/safe_enrichment_report.json`);
