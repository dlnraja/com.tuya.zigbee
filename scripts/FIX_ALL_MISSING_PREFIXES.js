#!/usr/bin/env node

/**
 * FIX ALL MISSING PREFIXES
 * Trouve et corrige TOUS les drivers sans préfixe de marque
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIX ALL MISSING PREFIXES\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

// Tous les préfixes de marques valides
const validPrefixes = [
  'zemismart_', 'moes_', 'nous_', 'avatto_', 'tuya_',
  'aqara_', 'ikea_', 'lsc_', 'lidl_', 'nedis_',
  'generic_'
];

function hasValidPrefix(driverName) {
  return validPrefixes.some(prefix => driverName.startsWith(prefix));
}

function detectBrand(manufacturerNames) {
  if (!manufacturerNames || manufacturerNames.length === 0) {
    return 'generic';
  }
  
  const brandPatterns = {
    zemismart: ['_TZ3000_zmy4lslw', '_TZ3000_dku2cfsc', '_TZ3000_o005nuxx'],
    moes: ['_TZE200_b6wax7g0', '_TZE200_9cxuhakf', '_TZ3000_uim07oem'],
    nous: ['_TZ3000_cphmq0q7', '_TZ3000_ksw8qtmt'],
    avatto: ['_TZ3210_j4pdtz9v', '_TZE200_bqcqqjpb'],
    aqara: ['lumi.', 'LUMI', 'aqara'],
    ikea: ['IKEA', 'TRADFRI'],
    lsc: ['_TZ3000_odygigth', '_TZ3000_dbou1ap4'],
    tuya: ['_TZ', '_TZE', 'TS0', 'TS1']
  };
  
  for (const [brand, patterns] of Object.entries(brandPatterns)) {
    if (brand === 'tuya') continue;
    
    for (const pattern of patterns) {
      if (manufacturerNames.some(m => m.includes(pattern))) {
        return brand;
      }
    }
  }
  
  if (manufacturerNames.some(m => m.includes('_TZ') || m.includes('TS'))) {
    return 'tuya';
  }
  
  return 'generic';
}

// Phase 1: Identifier drivers sans préfixe
console.log('PHASE 1: Identification drivers sans préfixe\n');

const missingPrefixes = [];

for (const driver of drivers) {
  if (!hasValidPrefix(driver)) {
    missingPrefixes.push(driver);
  }
}

console.log(`❌ Trouvé ${missingPrefixes.length} drivers SANS préfixe:\n`);
missingPrefixes.forEach(d => console.log(`   - ${d}`));

if (missingPrefixes.length === 0) {
  console.log('\n✅ Tous les drivers ont un préfixe!\n');
  process.exit(0);
}

// Phase 2: Renommer les drivers
console.log('\n\nPHASE 2: Renommage avec préfixe approprié\n');

let renamed = 0;
let errors = 0;

for (const driver of missingPrefixes) {
  const driverPath = path.join(driversDir, driver);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⏭️  Skip: ${driver} (no compose.json)`);
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const manufacturerNames = compose.zigbee?.manufacturerName || [];
    
    // Détecter marque
    const brand = detectBrand(manufacturerNames);
    const newName = `${brand}_${driver}`;
    const newPath = path.join(driversDir, newName);
    
    // Vérifier si existe déjà
    if (fs.existsSync(newPath)) {
      console.log(`⏭️  Skip: ${driver} → ${newName} (already exists)`);
      continue;
    }
    
    // Renommer dossier
    fs.renameSync(driverPath, newPath);
    
    // Mettre à jour ID dans compose.json
    const newComposePath = path.join(newPath, 'driver.compose.json');
    const newCompose = JSON.parse(fs.readFileSync(newComposePath, 'utf8'));
    newCompose.id = newName;
    fs.writeFileSync(newComposePath, JSON.stringify(newCompose, null, 2), 'utf8');
    
    console.log(`✅ ${driver} → ${newName} [${brand}]`);
    renamed++;
    
  } catch (err) {
    console.error(`❌ ${driver}: ${err.message}`);
    errors++;
  }
}

console.log(`\n✅ Phase 2 terminée:`);
console.log(`   Renommés: ${renamed}`);
console.log(`   Erreurs: ${errors}\n`);

// Phase 3: Vérification finale
console.log('PHASE 3: Vérification finale\n');

const updatedDrivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

const stillMissing = [];
for (const driver of updatedDrivers) {
  if (!hasValidPrefix(driver)) {
    stillMissing.push(driver);
  }
}

if (stillMissing.length === 0) {
  console.log('✅ TOUS les drivers ont maintenant un préfixe!\n');
} else {
  console.log(`⚠️  ${stillMissing.length} drivers ENCORE sans préfixe:\n`);
  stillMissing.forEach(d => console.log(`   - ${d}`));
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         FIX ALL MISSING PREFIXES - TERMINÉ                    ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSULTATS:
   Drivers sans préfixe trouvés:    ${missingPrefixes.length}
   Drivers renommés:                ${renamed}
   Erreurs:                         ${errors}
   Encore sans préfixe:             ${stillMissing.length}

✅ ${stillMissing.length === 0 ? 'TOUS CORRIGÉS!' : 'RELANCER SI NÉCESSAIRE'}
`);
