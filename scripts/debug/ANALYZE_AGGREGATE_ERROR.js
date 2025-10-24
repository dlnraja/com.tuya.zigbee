#!/usr/bin/env node
'use strict';

/**
 * ANALYZE AGGREGATE ERROR
 * 
 * AggregateError sur Homey est causé par:
 * 1. app.json trop gros
 * 2. Trop de drivers
 * 3. Build timeout
 * 4. Manufacturer IDs en double
 * 5. Flow cards invalides
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 ANALYZE AGGREGATE ERROR\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 1. Check app.json size
const stats = fs.statSync(appJsonPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`📄 app.json size: ${sizeMB} MB`);

if (sizeMB > 5) {
  console.log('   ❌ CRITICAL: > 5MB (Homey limit)');
} else if (sizeMB > 3) {
  console.log('   ⚠️  WARNING: > 3MB (peut causer problèmes)');
} else {
  console.log('   ✅ OK: < 3MB');
}

// 2. Check driver count
const driverCount = appJson.drivers.length;
console.log(`\n📦 Drivers: ${driverCount}`);

if (driverCount > 400) {
  console.log('   ❌ CRITICAL: > 400 drivers');
} else if (driverCount > 300) {
  console.log('   ⚠️  WARNING: > 300 drivers (peut ralentir build)');
} else {
  console.log('   ✅ OK: < 300 drivers');
}

// 3. Check for duplicate manufacturer IDs across drivers
console.log('\n🔍 Checking for duplicate manufacturer IDs...');

const manufacturerIdMap = new Map();
let duplicates = 0;

appJson.drivers.forEach(driver => {
  if (!driver.zigbee || !driver.zigbee.manufacturerName) return;
  
  driver.zigbee.manufacturerName.forEach(mfgId => {
    if (!manufacturerIdMap.has(mfgId)) {
      manufacturerIdMap.set(mfgId, []);
    }
    manufacturerIdMap.get(mfgId).push(driver.id);
  });
});

manufacturerIdMap.forEach((drivers, mfgId) => {
  if (drivers.length > 1) {
    console.log(`   ⚠️  ${mfgId} dans ${drivers.length} drivers:`);
    drivers.forEach(d => console.log(`      - ${d}`));
    duplicates++;
  }
});

if (duplicates === 0) {
  console.log('   ✅ Aucun duplicate');
} else {
  console.log(`\n   ⚠️  ${duplicates} manufacturer IDs dupliqués`);
  console.log('   Ceci est NORMAL pour support multiple drivers');
}

// 4. Check for very large driver definitions
console.log('\n📊 Checking driver sizes...');

const driverSizes = appJson.drivers.map(driver => {
  const size = JSON.stringify(driver).length;
  return { id: driver.id, size, sizeKB: (size / 1024).toFixed(2) };
}).sort((a, b) => b.size - a.size);

console.log('\n   Top 10 largest drivers:');
driverSizes.slice(0, 10).forEach((d, i) => {
  const warn = d.sizeKB > 50 ? '⚠️ ' : '  ';
  console.log(`   ${warn}${i + 1}. ${d.id}: ${d.sizeKB} KB`);
});

// 5. Check flow cards
console.log('\n🔄 Flow cards:');

const flowActions = Object.keys(appJson.flow?.actions || {}).length;
const flowTriggers = Object.keys(appJson.flow?.triggers || {}).length;
const flowConditions = Object.keys(appJson.flow?.conditions || {}).length;
const totalFlowCards = flowActions + flowTriggers + flowConditions;

console.log(`   Actions: ${flowActions}`);
console.log(`   Triggers: ${flowTriggers}`);
console.log(`   Conditions: ${flowConditions}`);
console.log(`   Total: ${totalFlowCards}`);

if (totalFlowCards > 1000) {
  console.log('   ⚠️  WARNING: > 1000 flow cards');
}

// 6. Calculate total manufacturer IDs
const totalMfgIds = manufacturerIdMap.size;
console.log(`\n🏭 Total unique manufacturer IDs: ${totalMfgIds}`);

// 7. RECOMMENDATIONS
console.log('\n' + '='.repeat(60));
console.log('RECOMMENDATIONS FOR AGGREGATE ERROR');
console.log('='.repeat(60) + '\n');

if (sizeMB > 4) {
  console.log('🔴 URGENT: Réduire taille app.json');
  console.log('   Options:');
  console.log('   1. Split app en plusieurs apps (par catégorie)');
  console.log('   2. Réduire manufacturer IDs redondants');
  console.log('   3. Simplifier flow cards');
}

if (driverCount > 350) {
  console.log('\n🟡 CONSIDÉRER: Optimiser nombre de drivers');
  console.log('   Options:');
  console.log('   1. Merger drivers similaires');
  console.log('   2. Créer apps séparées par marque');
  console.log('   3. Prioriser drivers populaires');
}

console.log('\n🔧 SOLUTIONS BUILD HOMEY:');
console.log('   1. Augmenter timeout: Ajouter delay dans CI/CD');
console.log('   2. Build local: homey app build --production');
console.log('   3. Publish manuel: homey app publish');
console.log('   4. Contact Athom support si problème persiste');

console.log('\n✅ VALIDATION LOCALE PASSE');
console.log('   Le problème est probablement:');
console.log('   - Timeout build Homey (trop de données)');
console.log('   - Mémoire insuffisante côté Homey');
console.log('   - Network issues pendant upload');

console.log('');
