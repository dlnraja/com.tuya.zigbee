#!/usr/bin/env node

/**
 * PHASE 8: RENAME TO CORRECT BRANDS
 * Renomme les drivers vers les bonnes marques
 * Évite les doubles préfixes (tuya_tuya_)
 */

const fs = require('fs');
const path = require('path');

console.log('\n🏷️  PHASE 8: RENAME TO BRANDS\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

// Manufacturer ID → Brand mapping
const brandPatterns = {
  zemismart: ['_TZ3000_zmy4lslw', '_TZ3000_dku2cfsc', '_TZ3000_o005nuxx'],
  avatto: ['_TZ3000_vd43bbfq', '_TZ3210_j4pdtz9v', '_TZE200_bqcqqjpb'],
  moes: ['_TZE200_b6wax7g0', '_TZE200_9cxuhakf', '_TZ3000_uim07oem'],
  nous: ['_TZ3000_cphmq0q7', '_TZ3000_ksw8qtmt'],
  blitzwolf: ['_TZ3000_g5xawfcq'],
  lsc: ['_TZ3000_odygigth'],
  lidl: ['_TZ3000_fvxfrs0y', '_TZ3000_w8jwkczz'],
  nedis: ['_TZ3000_vzopcetz', '_TZ3000_ss98ec5d'],
  lonsonho: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar'],
  bseed: ['_TZ3000_pdevogdj']
};

function detectBrand(manufacturerNames) {
  for (const [brand, patterns] of Object.entries(brandPatterns)) {
    if (manufacturerNames.some(mfr => patterns.some(p => mfr.includes(p)))) {
      return brand;
    }
  }
  
  // Check for existing brand prefixes
  return null;
}

function removeExistingPrefix(name) {
  const prefixes = ['tuya_', 'aqara_', 'ikea_', 'zemismart_', 'avatto_', 
                    'moes_', 'nous_', 'blitzwolf_', 'lsc_', 'lidl_', 
                    'nedis_', 'lonsonho_', 'bseed_', 'generic_'];
  
  for (const prefix of prefixes) {
    if (name.startsWith(prefix)) {
      return name.substring(prefix.length);
    }
  }
  
  return name;
}

const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let renamed = 0;
let skipped = 0;
let errors = 0;

for (const driver of drivers) {
  const driverPath = path.join(driversDir, driver);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    skipped++;
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const manufacturerNames = compose.zigbee?.manufacturerName || [];
    
    // Detect brand
    const brand = detectBrand(manufacturerNames);
    
    if (!brand) {
      // Already has correct prefix or is generic
      skipped++;
      continue;
    }
    
    // Remove existing prefix
    const baseName = removeExistingPrefix(driver);
    
    // New name with brand prefix
    const newName = `${brand}_${baseName}`;
    
    // Skip if same
    if (newName === driver) {
      skipped++;
      continue;
    }
    
    // Check if target exists
    const newPath = path.join(driversDir, newName);
    if (fs.existsSync(newPath)) {
      console.log(`⏭️  Skip: ${driver} → ${newName} (exists)`);
      skipped++;
      continue;
    }
    
    // Rename
    fs.renameSync(driverPath, newPath);
    
    // Update ID in driver.compose.json
    const newComposePath = path.join(newPath, 'driver.compose.json');
    const newCompose = JSON.parse(fs.readFileSync(newComposePath, 'utf8'));
    newCompose.id = newName;
    fs.writeFileSync(newComposePath, JSON.stringify(newCompose, null, 2), 'utf8');
    
    console.log(`✅ ${driver} → ${newName}`);
    renamed++;
    
  } catch (err) {
    console.error(`❌ Error: ${driver} - ${err.message}`);
    errors++;
  }
}

console.log(`\n✅ PHASE 8 TERMINÉE`);
console.log(`Renamed: ${renamed}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors: ${errors}\n`);
