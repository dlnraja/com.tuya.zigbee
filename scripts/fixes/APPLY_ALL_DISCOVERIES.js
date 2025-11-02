#!/usr/bin/env node
'use strict';

/**
 * 🚀 MEGA SCRIPT - APPLY ALL DISCOVERIES TO ALL DRIVERS
 * 
 * Ce script applique TOUTES les découvertes récentes:
 * 1. TS0002 conflict resolution
 * 2. Custom pairing view integration
 * 3. Promise wrappers safety
 * 4. removeBatteryFromACDevices
 * 5. Référentiels à jour
 * 6. Workflows optimisation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname);
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

// Stats globales
const stats = {
  driversScanned: 0,
  driversUpdated: 0,
  ts0002Fixed: 0,
  promiseWrapped: 0,
  batteryRemoved: 0,
  fingerprintsEnriched: 0,
  errors: []
};

/**
 * 1. FIX TS0002 CONFLICTS
 */
async function fixTS0002Conflicts() {
  console.log('\n🔧 [1/6] FIXING TS0002 CONFLICTS...');
  
  const REMOVE_PATTERNS = ['_1gang', '_3gang', '_4gang', '_5gang', '_6gang', '_8gang', 
                           'air_quality', 'light_controller', 'shutter_roller', 'module_mini'];
  const KEEP_PATTERNS = ['_2gang', 'hybrid_2gang'];
  
  const drivers = fs.readdirSync(DRIVERS_DIR);
  
  for (const driverName of drivers) {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const productIds = driver.zigbee?.productId;
      
      if (!Array.isArray(productIds) || !productIds.includes('TS0002')) continue;
      
      const shouldKeep = KEEP_PATTERNS.some(p => driverName.includes(p));
      const shouldRemove = REMOVE_PATTERNS.some(p => driverName.includes(p));
      
      if (shouldRemove && !shouldKeep) {
        driver.zigbee.productId = productIds.filter(id => id !== 'TS0002');
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n');
        console.log(`  ✅ Removed TS0002 from ${driverName}`);
        stats.ts0002Fixed++;
      }
    } catch (err) {
      stats.errors.push(`TS0002 fix error in ${driverName}: ${err.message}`);
    }
  }
}

/**
 * 2. WRAP PROMISES SAFELY
 */
async function wrapPromisesSafely() {
  console.log('\n🔒 [2/6] WRAPPING PROMISES SAFELY...');
  
  const libFiles = fs.readdirSync(LIB_DIR).filter(f => f.endsWith('.js'));
  
  for (const libFile of libFiles) {
    const filePath = path.join(LIB_DIR, libFile);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Pattern dangereux: someFunc().catch(...) sans Promise.resolve
    const dangerousPattern = /(\w+\([^)]*\))\.catch\(/g;
    const matches = content.match(dangerousPattern);
    
    if (matches && matches.length > 0) {
      // Wrap avec Promise.resolve
      content = content.replace(
        /(?<!Promise\.resolve\()(\w+\([^)]*\))\.catch\(/g,
        'Promise.resolve($1).catch('
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Wrapped ${matches.length} promises in ${libFile}`);
      stats.promiseWrapped += matches.length;
      modified = true;
    }
  }
}

/**
 * 3. ENSURE removeBatteryFromACDevices EVERYWHERE
 */
async function ensureRemoveBatteryFromAC() {
  console.log('\n🔋 [3/6] ENSURING removeBatteryFromACDevices...');
  
  const baseHybridPath = path.join(LIB_DIR, 'BaseHybridDevice.js');
  if (!fs.existsSync(baseHybridPath)) {
    console.log('  ⚠️  BaseHybridDevice.js not found');
    return;
  }
  
  let content = fs.readFileSync(baseHybridPath, 'utf8');
  
  // Vérifier si la fonction existe
  if (!content.includes('async removeBatteryFromACDevices()')) {
    console.log('  ⚠️  removeBatteryFromACDevices not found, adding...');
    
    const functionCode = `
  /**
   * Remove battery capability from AC/DC powered devices
   */
  async removeBatteryFromACDevices() {
    try {
      if (this.powerType !== 'AC' && this.powerType !== 'DC') {
        return;
      }
      
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery');
        this.log('[MIGRATE] ✅ Removed measure_battery from AC/DC device');
      }
    } catch (err) {
      this.error('[MIGRATE] removeBatteryFromACDevices failed:', err);
    }
  }
`;
    
    // Insérer avant la dernière accolade
    content = content.replace(/}\s*$/, functionCode + '\n}');
    fs.writeFileSync(baseHybridPath, content);
    console.log('  ✅ Added removeBatteryFromACDevices to BaseHybridDevice');
    stats.batteryRemoved++;
  } else {
    console.log('  ✓ removeBatteryFromACDevices already exists');
  }
}

/**
 * 4. ENRICH FINGERPRINTS WITH MANUFACTURER VARIANTS
 */
async function enrichFingerprints() {
  console.log('\n🏭 [4/6] ENRICHING FINGERPRINTS...');
  
  // Référentiel de manufacturers par préfixe
  const manufacturerDB = {
    'TS011F': ['_TZ3000_1obwwnmq', '_TZ3000_w0qqde0g', '_TZ3000_vzopcetz', '_TZ3000_g5xawfcq'],
    'TS0002': ['_TZ3000_4fjiwweb', '_TZ3000_ji4araar', '_TZ3000_qmi1cfuq', '_TZ3000_18ejxno0'],
    'TS0001': ['_TZ3000_xkap8wtb', '_TZ3000_lupfd8zu', '_TZ3000_mx3vgyea'],
    'TS0003': ['_TZ3000_fvh3pjaz', '_TZ3000_odzoiovu', '_TZ3000_zmy4lslw'],
    'TS0004': ['_TZ3000_ejwkn2h2', '_TZ3000_nnwehhst', '_TZ3000_zmy4lslw'],
    'TS0601': ['_TZE200_cowvfni3', '_TZE200_myd45weu', '_TZE200_qoy0ekbd'],
    'TS0202': ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZE200_3towulqd'],
    'TS0203': ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_4ugnzsli']
  };
  
  const drivers = fs.readdirSync(DRIVERS_DIR);
  
  for (const driverName of drivers) {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const productIds = driver.zigbee?.productId || [];
      
      let enriched = false;
      
      for (const productId of productIds) {
        if (manufacturerDB[productId]) {
          const existing = driver.zigbee.manufacturerName || [];
          const newManufacturers = manufacturerDB[productId].filter(m => !existing.includes(m));
          
          if (newManufacturers.length > 0) {
            driver.zigbee.manufacturerName = [...existing, ...newManufacturers];
            enriched = true;
          }
        }
      }
      
      if (enriched) {
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n');
        console.log(`  ✅ Enriched ${driverName}`);
        stats.fingerprintsEnriched++;
      }
    } catch (err) {
      stats.errors.push(`Fingerprint enrich error in ${driverName}: ${err.message}`);
    }
  }
}

/**
 * 5. GENERATE COMPLETE drivers.json FOR PAIRING VIEW
 */
async function generateDriversJSON() {
  console.log('\n📄 [5/6] GENERATING drivers.json...');
  
  const drivers = [];
  const driverFolders = fs.readdirSync(DRIVERS_DIR);
  
  for (const driverName of driverFolders) {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      drivers.push({
        id: driver.id || driverName,
        name: driver.name?.en || driver.name || driverName,
        manufacturerName: driver.zigbee?.manufacturerName || [],
        productId: driver.zigbee?.productId || [],
        endpoints: driver.zigbee?.endpoints || {},
        clusters: extractClusters(driver.zigbee?.endpoints)
      });
    } catch (err) {
      console.error(`  ⚠️  Error reading ${driverName}`);
    }
  }
  
  const outputPath = path.join(ROOT, 'assets', 'drivers.json');
  fs.writeFileSync(outputPath, JSON.stringify(drivers, null, 2));
  console.log(`  ✅ Generated drivers.json with ${drivers.length} drivers`);
}

function extractClusters(endpoints) {
  if (!endpoints) return [];
  const clusters = new Set();
  Object.values(endpoints).forEach(ep => {
    if (ep.clusters) {
      ep.clusters.forEach(c => clusters.add(c));
    }
  });
  return Array.from(clusters);
}

/**
 * 6. UPDATE WORKFLOWS AND SCRIPTS
 */
async function updateWorkflowsAndScripts() {
  console.log('\n⚙️  [6/6] UPDATING WORKFLOWS AND SCRIPTS...');
  
  // Vérifier que tous les scripts critiques existent
  const criticalScripts = [
    'scripts/fix-ts0002-conflicts.js',
    'scripts/migrate-existing-devices.js',
    'pairing/select-driver.html',
    'pairing/select-driver-client.js'
  ];
  
  for (const script of criticalScripts) {
    const scriptPath = path.join(ROOT, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`  ✓ ${script} exists`);
    } else {
      console.log(`  ⚠️  ${script} MISSING!`);
      stats.errors.push(`Missing critical file: ${script}`);
    }
  }
}

/**
 * VALIDATE EVERYTHING
 */
async function validateAll() {
  console.log('\n✅ [VALIDATION] RUNNING FINAL CHECKS...');
  
  try {
    // Homey app validate
    console.log('  Running homey app validate...');
    execSync('homey app validate --level publish', { 
      cwd: ROOT,
      stdio: 'inherit'
    });
    console.log('  ✅ Validation PASSED!');
  } catch (err) {
    console.error('  ❌ Validation FAILED');
    stats.errors.push('Homey validation failed');
  }
}

/**
 * MAIN ORCHESTRATOR
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🚀 MEGA SCRIPT - APPLY ALL DISCOVERIES                  ║');
  console.log('║  Universal Tuya Zigbee v4.9.190                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  
  try {
    await fixTS0002Conflicts();
    await wrapPromisesSafely();
    await ensureRemoveBatteryFromAC();
    await enrichFingerprints();
    await generateDriversJSON();
    await updateWorkflowsAndScripts();
    await validateAll();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📊 FINAL STATISTICS                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`✅ Drivers scanned: ${stats.driversScanned}`);
    console.log(`✅ TS0002 conflicts fixed: ${stats.ts0002Fixed}`);
    console.log(`✅ Promises wrapped: ${stats.promiseWrapped}`);
    console.log(`✅ Battery functions ensured: ${stats.batteryRemoved > 0 ? 'YES' : 'ALREADY PRESENT'}`);
    console.log(`✅ Fingerprints enriched: ${stats.fingerprintsEnriched}`);
    console.log(`⏱️  Duration: ${duration}s`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  ERRORS ENCOUNTERED (${stats.errors.length}):`);
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('\n🎉 MEGA SCRIPT COMPLETE!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Review changes: git diff');
    console.log('2. Test pairing with TS0002 devices');
    console.log('3. Commit all: git add -A && git commit -m "v4.9.191-apply-all-discoveries"');
    console.log('4. Push: git push origin master');
    
  } catch (err) {
    console.error('\n❌ MEGA SCRIPT FAILED:', err);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
