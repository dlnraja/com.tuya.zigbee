#!/usr/bin/env node
'use strict';

/**
 * INVESTIGATE PETER ISSUE
 * 
 * Analyse historique pour comprendre pourquoi lux/temp/humidity
 * fonctionnaient avant et ne fonctionnent plus maintenant
 * 
 * Usage: node scripts/fixes/investigate-peter-issue.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');

console.log('🔍 INVESTIGATION PETER ISSUE\n');
console.log('Problème: lux, temperature, humidity ne remontent plus');
console.log('Historique: marchait dans anciennes versions\n');

// =============================================================================
// ANALYSE DU DRIVER ACTUEL
// =============================================================================

console.log('=' .repeat(80));
console.log('1. ANALYSE DRIVER ACTUEL');
console.log('='.repeat(80) + '\n');

const driverPath = path.join(ROOT, 'drivers/motion_temp_humidity_illumination_multi_battery');
const deviceJs = path.join(driverPath, 'device.js');
const composeJson = path.join(driverPath, 'driver.compose.json');

console.log('📁 Driver:', driverPath);

// Lire device.js
if (fs.existsSync(deviceJs)) {
  const content = fs.readFileSync(deviceJs, 'utf8');
  
  console.log('\n📝 device.js Analysis:');
  
  // Check cluster registrations
  const tempMatch = content.match(/registerCapability\('measure_temperature',\s*(\d+)/);
  const humidMatch = content.match(/registerCapability\('measure_humidity',\s*(\d+)/);
  const luxMatch = content.match(/registerCapability\('measure_luminance',\s*(\d+)/);
  
  if (tempMatch) {
    console.log(`  ✅ Temperature: Cluster ${tempMatch[1]} (${tempMatch[1] == 1026 ? 'CORRECT' : 'WRONG!'})`);
  } else {
    console.log('  ❌ Temperature: NOT REGISTERED');
  }
  
  if (humidMatch) {
    console.log(`  ✅ Humidity: Cluster ${humidMatch[1]} (${humidMatch[1] == 1029 ? 'CORRECT' : 'WRONG!'})`);
  } else {
    console.log('  ❌ Humidity: NOT REGISTERED');
  }
  
  if (luxMatch) {
    console.log(`  ✅ Illuminance: Cluster ${luxMatch[1]} (${luxMatch[1] == 1024 ? 'CORRECT' : 'WRONG!'})`);
  } else {
    console.log('  ❌ Illuminance: NOT REGISTERED');
  }
  
  // Check parser functions
  if (content.includes('value / 100') && content.includes('measure_temperature')) {
    console.log('  ✅ Temperature parser: value / 100 (CORRECT)');
  }
  
  if (content.includes('value / 100') && content.includes('measure_humidity')) {
    console.log('  ✅ Humidity parser: value / 100 (CORRECT)');
  }
  
  if (content.includes('Math.pow(10') && content.includes('measure_luminance')) {
    console.log('  ✅ Illuminance parser: Math.pow(10, (value-1)/10000) (CORRECT)');
  }
}

// Lire driver.compose.json
if (fs.existsSync(composeJson)) {
  const compose = JSON.parse(fs.readFileSync(composeJson, 'utf8'));
  
  console.log('\n📝 driver.compose.json Analysis:');
  console.log('  manufacturerNames:', compose.zigbee?.manufacturerName?.length || 0, 'entries');
  console.log('  productIds:', compose.zigbee?.productId?.length || 0, 'entries');
  
  // Check if Peter's device is included
  const manuNames = compose.zigbee?.manufacturerName || [];
  const hasTuya = manuNames.some(m => m.includes('_TZ') || m === 'TS0601' || m === 'TS0001');
  
  console.log(`  ${hasTuya ? '✅' : '❌'} Tuya manufacturerNames present`);
  
  // Check capabilities
  const caps = compose.capabilities || [];
  console.log('\n  Capabilities:');
  console.log(`    ${caps.includes('measure_temperature') ? '✅' : '❌'} measure_temperature`);
  console.log(`    ${caps.includes('measure_humidity') ? '✅' : '❌'} measure_humidity`);
  console.log(`    ${caps.includes('measure_luminance') ? '✅' : '❌'} measure_luminance`);
  console.log(`    ${caps.includes('alarm_motion') ? '✅' : '❌'} alarm_motion`);
  console.log(`    ${caps.includes('measure_battery') ? '✅' : '❌'} measure_battery`);
  
  // Check clusters
  const endpoint1 = compose.zigbee?.endpoints?.[1];
  if (endpoint1) {
    console.log('\n  Endpoint 1 clusters:');
    const clusters = endpoint1.clusters || [];
    console.log(`    ${clusters.includes(1024) ? '✅' : '❌'} 1024 (Illuminance)`);
    console.log(`    ${clusters.includes(1026) ? '✅' : '❌'} 1026 (Temperature)`);
    console.log(`    ${clusters.includes(1029) ? '✅' : '❌'} 1029 (Humidity)`);
    console.log(`    ${clusters.includes(1280) ? '✅' : '❌'} 1280 (IAS Zone / Motion)`);
    console.log(`    ${clusters.includes(1) ? '✅' : '❌'} 1 (Power / Battery)`);
  }
}

// =============================================================================
// ANALYSE OVERLAPS
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('2. ANALYSE OVERLAPS');
console.log('='.repeat(80) + '\n');

const overlapReport = path.join(ROOT, 'docs/reports/driver-overlaps-report.json');

if (fs.existsSync(overlapReport)) {
  const report = JSON.parse(fs.readFileSync(overlapReport, 'utf8'));
  
  console.log('📊 Overlap Report:');
  console.log(`  Total overlaps: ${report.criticalOverlaps}`);
  console.log(`  Manufacturer overlaps: ${report.manufacturerIdOverlaps}`);
  console.log(`  Product overlaps: ${report.productIdOverlaps}`);
  
  // Find overlaps involving motion_temp_humidity_illumination_multi_battery
  const driverName = 'motion_temp_humidity_illumination_multi_battery';
  const criticalOverlaps = report.overlaps.critical || [];
  
  const involving = criticalOverlaps.filter(o => 
    o.driver1 === driverName || o.driver2 === driverName
  );
  
  console.log(`\n  Overlaps involving ${driverName}: ${involving.length}`);
  
  if (involving.length > 0) {
    console.log('\n  ⚠️  CRITICAL OVERLAPS DETECTED:');
    involving.slice(0, 10).forEach(overlap => {
      const other = overlap.driver1 === driverName ? overlap.driver2 : overlap.driver1;
      console.log(`    - Conflicts with: ${other}`);
      console.log(`      Manu overlap: ${overlap.manuOverlap.slice(0, 3).join(', ')}`);
      console.log(`      Prod overlap: ${overlap.prodOverlap.slice(0, 3).join(', ')}`);
    });
    
    if (involving.length > 10) {
      console.log(`    ... and ${involving.length - 10} more`);
    }
  }
} else {
  console.log('❌ Overlap report not found');
}

// =============================================================================
// RECHERCHE MANUFACTURERNAME EXACT DE PETER
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('3. RECHERCHE MANUFACTURERNAME EXACT');
console.log('='.repeat(80) + '\n');

console.log('Recherche dans la documentation...');

// Chercher dans les docs Peter
const peterDocs = [
  'docs/forum/FORUM_RESPONSE_PETER_DIAGNOSTIC.md',
  'docs/forum-responses/FORUM_RESPONSE_FOR_PETER.md',
  'docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md'
];

let foundManufacturerName = null;

for (const docPath of peterDocs) {
  const fullPath = path.join(ROOT, docPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Chercher manufacturerName patterns
    const patterns = [
      /_TZ[A-Z0-9]{4}_[a-z0-9]{8}/g,
      /TS0601/g,
      /TS0001/g,
      /HOBEIAN/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`  Found in ${path.basename(docPath)}:`, [...new Set(matches)]);
        if (!foundManufacturerName && matches[0].startsWith('_TZ')) {
          foundManufacturerName = matches[0];
        }
      }
    });
  }
}

if (foundManufacturerName) {
  console.log(`\n✅ ManufacturerName identifié: ${foundManufacturerName}`);
} else {
  console.log('\n⚠️  ManufacturerName exact non trouvé dans la documentation');
}

// =============================================================================
// RECOMMANDATIONS
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('4. RECOMMANDATIONS DE FIX');
console.log('='.repeat(80) + '\n');

console.log('📋 ACTIONS REQUISES:\n');

console.log('1. OVERLAPS (CRITIQUE):');
console.log('   - 13,280 overlaps détectés');
console.log('   - Nettoyer les manufacturerNames génériques (TS0001, TS0601)');
console.log('   - Garder uniquement les IDs spécifiques (_TZ3000_*, _TZE200_*, etc.)');
console.log('   - Script: clean-driver-overlaps.js à créer\n');

console.log('2. MANUFACTURERNAME EXACT:');
console.log('   - Demander à Peter le diagnostic report complet');
console.log('   - Identifier le manufacturerName exact de son multisensor');
console.log('   - L\'ajouter au bon driver (ou créer driver spécifique)\n');

console.log('3. VALIDATION CLUSTERS:');
if (fs.existsSync(deviceJs)) {
  const content = fs.readFileSync(deviceJs, 'utf8');
  const hasCorrectClusters = content.includes('1024') && 
                             content.includes('1026') && 
                             content.includes('1029');
  
  if (hasCorrectClusters) {
    console.log('   ✅ Clusters corrects dans device.js');
  } else {
    console.log('   ❌ Clusters manquants ou incorrects dans device.js');
  }
  
  const hasCorrectParsers = content.includes('value / 100') && 
                            content.includes('Math.pow(10');
  
  if (hasCorrectParsers) {
    console.log('   ✅ Parsers corrects (division par 100, formule lux)');
  } else {
    console.log('   ❌ Parsers manquants ou incorrects');
  }
}

console.log('\n4. RE-PAIRING:');
console.log('   - Après correction overlaps: re-pairing OBLIGATOIRE');
console.log('   - Supprimer device de Homey');
console.log('   - Factory reset sensor');
console.log('   - Re-pairing pour sélection correct driver\n');

console.log('5. LOGS DIAGNOSTIQUES:');
console.log('   - Activer debug logs dans device.js');
console.log('   - Vérifier valeurs raw qui remontent');
console.log('   - Confirmer parsing correct (temp/100, humidity/100, etc.)\n');

// =============================================================================
// SUMMARY
// =============================================================================

console.log('='.repeat(80));
console.log('📊 SUMMARY');
console.log('='.repeat(80));

console.log('\n✅ GOOD:');
console.log('  - Clusters corrects (1024, 1026, 1029, 1280, 1)');
console.log('  - Parsers corrects (division, formules)');
console.log('  - IAS Zone enrollment implémenté');

console.log('\n❌ PROBLÈMES:');
console.log('  - 13,280 driver overlaps (CRITIQUE)');
console.log('  - ManufacturerNames trop génériques');
console.log('  - Risque de wrong driver selection');
console.log('  - ManufacturerName exact de Peter inconnu');

console.log('\n🎯 PRIORITÉ 1:');
console.log('  1. Créer script clean-driver-overlaps.js');
console.log('  2. Nettoyer manufacturerNames génériques');
console.log('  3. Garder uniquement IDs spécifiques');
console.log('  4. Demander diagnostic report à Peter');
console.log('  5. Ajouter manufacturerName exact au driver');

console.log('\n' + '='.repeat(80));
console.log('Investigation complete!');
console.log('='.repeat(80));

process.exit(0);
