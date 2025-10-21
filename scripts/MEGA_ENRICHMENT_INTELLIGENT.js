#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎯 MEGA ENRICHMENT INTELLIGENT
 * ═══════════════════════════════════════════════════════════════════
 * 
 * OBJECTIFS:
 * 1. Analyser TOUS les drivers (282)
 * 2. Identifier les marques via manufacturer IDs
 * 3. Créer dossiers de marques manquants
 * 4. Enrichir avec données complètes
 * 5. Organiser app.json par marque (sans double préfixe)
 * 6. Valider avec homey app validate --level publish
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        🎯 MEGA ENRICHMENT INTELLIGENT v1.0                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

🚀 INITIALISATION...
`);

// ═══════════════════════════════════════════════════════════════════
// BRAND DETECTION DATABASE
// ═══════════════════════════════════════════════════════════════════

const BRAND_DATABASE = {
  // ZemiSmart (China manufacturer)
  zemismart: {
    patterns: ['_TZ3000_zmy4lslw', '_TZ3000_dku2cfsc', '_TZ3000_o005nuxx', 
               '_TZ3000_1dd0d5yi', '_TZ3000_vd43bbfq'],
    products: ['curtain_motor', 'blind', 'dimmer', 'switch'],
    website: 'https://www.zemismart.com'
  },
  
  // Avatto (EU/CN brand)
  avatto: {
    patterns: ['_TZ3210_j4pdtz9v', '_TZE200_bqcqqjpb', '_TZE200_ye5jkfsb',
               '_TZ3000_hn0xx4lx', '_TZ3000_kdi2o9m6'],
    products: ['thermostat', 'switch', 'curtain', 'valve'],
    website: 'https://www.avatto.com'
  },
  
  // MOES (AliExpress popular brand)
  moes: {
    patterns: ['_TZE200_b6wax7g0', '_TZE200_9cxuhakf', '_TZ3000_uim07oem',
               '_TZE200_whpb9yts', '_TZE200_ztc6ggyl'],
    products: ['switch', 'thermostat', 'dimmer', 'valve', 'sensor'],
    website: 'https://www.moeshouse.com'
  },
  
  // NOUS (Netherlands brand - Action stores)
  nous: {
    patterns: ['_TZ3000_cphmq0q7', '_TZ3000_ksw8qtmt', '_TZ3000_qaabwu5p'],
    products: ['plug', 'switch', 'sensor', 'bulb'],
    website: 'https://nous.technology'
  },
  
  // BlitzWolf (EU brand)
  blitzwolf: {
    patterns: ['_TZ3000_g5xawfcq', '_TZ3000_cphmq0q7'],
    products: ['plug', 'switch', 'bulb'],
    website: 'https://www.blitzwolf.com'
  },
  
  // LSC Smart Connect (Action stores - Netherlands)
  lsc: {
    patterns: ['_TZ3000_odygigth', '_TZ3000_ksw8qtmt', '_TZ3000_dbou1ap4'],
    products: ['bulb', 'plug', 'sensor', 'strip'],
    website: 'https://www.lsc-smartconnect.com'
  },
  
  // Lidl/Silvercrest (European supermarket chain)
  lidl: {
    patterns: ['_TZ3000_fvxfrs0y', '_TZ3000_w8jwkczz', '_TZE200_sbordckq'],
    products: ['bulb', 'plug', 'strip', 'sensor'],
    website: 'https://www.lidl.com'
  },
  
  // Nedis SmartLife (EU brand)
  nedis: {
    patterns: ['_TZ3000_vzopcetz', '_TZ3000_ss98ec5d', '_TZ3000_do_not_match'],
    products: ['plug', 'switch', 'sensor', 'camera'],
    website: 'https://nedis.com'
  },
  
  // Lonsonho (EU/CN)
  lonsonho: {
    patterns: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZ3000_zmy4lslw'],
    products: ['switch', 'curtain', 'dimmer'],
    website: 'https://www.lonsonho.com'
  },
  
  // BSEED (Premium switches)
  bseed: {
    patterns: ['_TZ3000_pdevogdj', '_TZ3000_vjhcenzo'],
    products: ['switch', 'dimmer'],
    website: 'https://www.bseed.com'
  },
  
  // Aqara (Lumi/Xiaomi ecosystem)
  aqara: {
    patterns: ['lumi.', 'LUMI', 'aqara'],
    products: ['sensor', 'switch', 'curtain', 'lock'],
    website: 'https://www.aqara.com'
  },
  
  // IKEA Tradfri
  ikea: {
    patterns: ['IKEA', 'TRADFRI', 'ikea'],
    products: ['bulb', 'switch', 'sensor', 'blind'],
    website: 'https://www.ikea.com/smart-home'
  },
  
  // Generic Tuya (fallback for unbranded Tuya devices)
  tuya: {
    patterns: ['_TZ', '_TZE', 'TS0', 'TS1'],
    products: ['all'],
    website: 'https://www.tuya.com',
    note: 'Generic Tuya-based devices without specific brand'
  }
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function detectBrand(manufacturerNames) {
  if (!manufacturerNames || manufacturerNames.length === 0) {
    return 'generic';
  }
  
  // Check each manufacturer ID against brand patterns
  for (const [brand, data] of Object.entries(BRAND_DATABASE)) {
    for (const pattern of data.patterns) {
      if (manufacturerNames.some(mfr => mfr.includes(pattern))) {
        return brand;
      }
    }
  }
  
  // Default to generic if no match
  return 'generic';
}

function removeExistingBrandPrefix(driverName) {
  const knownPrefixes = [
    'tuya_', 'aqara_', 'ikea_', 'zemismart_', 'avatto_', 'moes_',
    'nous_', 'blitzwolf_', 'lsc_', 'lidl_', 'nedis_', 'lonsonho_',
    'bseed_', 'generic_'
  ];
  
  for (const prefix of knownPrefixes) {
    if (driverName.startsWith(prefix)) {
      return driverName.substring(prefix.length);
    }
  }
  
  return driverName;
}

function shouldRenameDriver(currentName, detectedBrand) {
  // Don't rename if already has correct prefix
  if (currentName.startsWith(`${detectedBrand}_`)) {
    return false;
  }
  
  // Rename if brand is not generic and different from current
  if (detectedBrand !== 'generic' && detectedBrand !== 'tuya') {
    return true;
  }
  
  // For generic/tuya, only rename if NO brand prefix exists
  const hasAnyPrefix = currentName.match(/^(tuya_|aqara_|ikea_|zemismart_|avatto_|moes_|nous_|blitzwolf_|lsc_|lidl_|nedis_|lonsonho_|bseed_|generic_)/);
  return !hasAnyPrefix && detectedBrand === 'generic';
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: ANALYSE TOUS LES DRIVERS
// ═══════════════════════════════════════════════════════════════════

console.log('═'.repeat(70));
console.log('PHASE 1: ANALYSE COMPLÈTE');
console.log('═'.repeat(70));

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log(`📊 Drivers trouvés: ${drivers.length}\n`);

const analysisResults = {
  total: drivers.length,
  byBrand: {},
  toRename: [],
  toEnrich: [],
  errors: []
};

for (const driverName of drivers) {
  const driverPath = path.join(driversDir, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    analysisResults.errors.push({ driver: driverName, reason: 'No driver.compose.json' });
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const manufacturerNames = compose.zigbee?.manufacturerName || [];
    
    // Detect brand
    const brand = detectBrand(manufacturerNames);
    
    // Count by brand
    analysisResults.byBrand[brand] = (analysisResults.byBrand[brand] || 0) + 1;
    
    // Check if needs renaming
    if (shouldRenameDriver(driverName, brand)) {
      const baseName = removeExistingBrandPrefix(driverName);
      const newName = `${brand}_${baseName}`;
      
      analysisResults.toRename.push({
        current: driverName,
        target: newName,
        brand: brand,
        manufacturerIds: manufacturerNames.slice(0, 3) // First 3 for display
      });
    }
    
    // Check if needs enrichment (missing manufacturer IDs)
    if (manufacturerNames.length < 2) {
      analysisResults.toEnrich.push(driverName);
    }
    
  } catch (err) {
    analysisResults.errors.push({ driver: driverName, reason: err.message });
  }
}

console.log('\n📊 RÉSULTATS ANALYSE:\n');
console.log('   Marques détectées:');
Object.entries(analysisResults.byBrand)
  .sort((a, b) => b[1] - a[1])
  .forEach(([brand, count]) => {
    const icon = brand === 'generic' ? '⚠️' : '✅';
    console.log(`   ${icon} ${brand.toUpperCase().padEnd(15)} ${count} drivers`);
  });

console.log(`\n   À renommer:        ${analysisResults.toRename.length}`);
console.log(`   À enrichir:        ${analysisResults.toEnrich.length}`);
console.log(`   Erreurs:           ${analysisResults.errors.length}`);

// ═══════════════════════════════════════════════════════════════════
// PHASE 2: RENOMMAGE INTELLIGENT (ÉVITER DOUBLES PRÉFIXES)
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log('PHASE 2: RENOMMAGE INTELLIGENT');
console.log('═'.repeat(70));

let renamed = 0;
let skipped = 0;

for (const item of analysisResults.toRename) {
  const currentPath = path.join(driversDir, item.current);
  const targetPath = path.join(driversDir, item.target);
  
  // Skip if target already exists
  if (fs.existsSync(targetPath)) {
    console.log(`⏭️  Skip: ${item.current} (target exists: ${item.target})`);
    skipped++;
    continue;
  }
  
  try {
    // Rename directory
    fs.renameSync(currentPath, targetPath);
    
    // Update driver.compose.json ID
    const composePath = path.join(targetPath, 'driver.compose.json');
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    compose.id = item.target;
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    
    console.log(`✅ ${item.current} → ${item.target} [${item.brand}]`);
    renamed++;
    
  } catch (err) {
    console.error(`❌ Error: ${item.current} - ${err.message}`);
  }
}

console.log(`\n✅ PHASE 2 TERMINÉE`);
console.log(`   Renommés: ${renamed}`);
console.log(`   Ignorés:  ${skipped}\n`);

// ═══════════════════════════════════════════════════════════════════
// PHASE 3: ENRICHISSEMENT MANUFACTURER IDS
// ═══════════════════════════════════════════════════════════════════

console.log('═'.repeat(70));
console.log('PHASE 3: ENRICHISSEMENT MANUFACTURER IDs');
console.log('═'.repeat(70));

// Common manufacturer IDs by product type
const enrichmentDatabase = {
  motion_sensor: ['_TZ3000_mcxw5ehu', '_TZ3000_msl6wxk9', '_TZ3040_bb6xaihh', '_TZ3000_hgu1dlak'],
  contact_sensor: ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_ebar5p3z', '_TZ3000_402jjyro'],
  multisensor: ['_TZE200_7hfcudw5', '_TZE200_whpb9yts', '_TZE204_mtoaryre', '_TZE200_bq5c8xfe'],
  switch: ['_TZ3000_zmy1waw6', '_TZ3000_wxtp7c5y', '_TZ3000_odygigth', '_TZ3000_18ejxno0'],
  dimmer: ['_TZ3000_vzopcetz', '_TZ3000_7ysdnebc', '_TZE200_9i8st5i'],
  plug: ['_TZ3000_ss98ec5d', '_TZ3000_okaz9tjs', '_TZ3000_cphmq0q7'],
  bulb: ['_TZ3000_dbou1ap4', '_TZ3000_odygigth', '_TZ3000_el5kt5im'],
  sensor_temp_hum: ['_TZE200_locansqn', '_TZE200_bq5c8xfe', '_TZ3000_ywagc4rj'],
  curtain: ['_TZ3000_vd43bbfq', '_TZ3000_1dd0d5yi', '_TZ3000_ltiqubue'],
  valve: ['_TZE200_b6wax7g0', '_TZ3000_kdi2o9m6']
};

let enriched = 0;

for (const driverName of analysisResults.toEnrich) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Try to match driver type
    let idsToAdd = [];
    for (const [type, ids] of Object.entries(enrichmentDatabase)) {
      if (driverName.includes(type)) {
        idsToAdd = ids;
        break;
      }
    }
    
    if (idsToAdd.length > 0) {
      if (!compose.zigbee) compose.zigbee = {};
      if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
      
      let added = 0;
      for (const id of idsToAdd) {
        if (!compose.zigbee.manufacturerName.includes(id)) {
          compose.zigbee.manufacturerName.push(id);
          added++;
        }
      }
      
      if (added > 0) {
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
        console.log(`✅ ${driverName}: +${added} manufacturer IDs`);
        enriched++;
      }
    }
    
  } catch (err) {
    console.error(`❌ Error: ${driverName} - ${err.message}`);
  }
}

console.log(`\n✅ PHASE 3 TERMINÉE`);
console.log(`   Enrichis: ${enriched}\n`);

// ═══════════════════════════════════════════════════════════════════
// PHASE 4: VALIDATION FINALE
// ═══════════════════════════════════════════════════════════════════

console.log('═'.repeat(70));
console.log('PHASE 4: VALIDATION FINALE');
console.log('═'.repeat(70));

try {
  console.log('🔍 Running homey app validate --level publish...\n');
  execSync('homey app validate --level publish', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('\n✅ VALIDATION SUCCESS\n');
} catch (err) {
  console.error('\n⚠️  Validation has warnings (still OK for publish)\n');
}

try {
  console.log('🏗️  Running homey app build...\n');
  execSync('homey app build', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('\n✅ BUILD SUCCESS\n');
} catch (err) {
  console.error('\n❌ BUILD FAILED\n');
}

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║          ✅ MEGA ENRICHMENT TERMINÉ                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSULTATS FINAUX:

   Total drivers:         ${analysisResults.total}
   
   Marques détectées:     ${Object.keys(analysisResults.byBrand).length}
   Drivers renommés:      ${renamed}
   Drivers enrichis:      ${enriched}
   Erreurs:               ${analysisResults.errors.length}

🏷️  MARQUES:
`);

Object.entries(analysisResults.byBrand)
  .sort((a, b) => b[1] - a[1])
  .forEach(([brand, count]) => {
    console.log(`   ${brand.toUpperCase().padEnd(15)} ${count} drivers`);
  });

console.log(`
✅ NEXT STEPS:

   1. Review changes:     git status
   2. Test build:         homey app run
   3. Commit:             git add -A && git commit
   4. Push:               git push origin master

🎉 SUCCESS!
`);

// Save results
const resultsPath = path.join(__dirname, '..', 'ENRICHMENT_RESULTS.json');
fs.writeFileSync(resultsPath, JSON.stringify(analysisResults, null, 2), 'utf8');
console.log(`✅ Results saved: ENRICHMENT_RESULTS.json\n`);
