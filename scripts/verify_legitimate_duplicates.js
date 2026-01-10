#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DUPLICATES LÉGITIMES (manufacturerName + productId)\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Map: manufacturerName -> [{driver, productIds}]
const manufacturerMap = new Map();

/**
 * Scanner tous les drivers
 */
function scanDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR);

  drivers.forEach(driverName => {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const stat = fs.statSync(driverPath);

    if (!stat.isDirectory() || driverName.startsWith('.')) return;

    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return;

    try {
      const content = fs.readFileSync(composeFile, 'utf8');
      const driver = JSON.parse(content);

      const manufacturerNames = driver.zigbee?.manufacturerName || [];
      const productIds = driver.zigbee?.productId || [];

      manufacturerNames.forEach(manuName => {
        if (!manufacturerMap.has(manuName)) {
          manufacturerMap.set(manuName, []);
        }

        manufacturerMap.get(manuName).push({
          driver: driverName,
          productIds: productIds
        });
      });

    } catch (e) {
      // Ignore
    }
  });
}

console.log('📂 Scanning drivers...\n');
scanDrivers();

// Analyser duplicates
const report = {
  legitimate: [],    // Même manufacturerName, productIds DIFFÉRENTS = OK
  problematic: [],   // Même manufacturerName + productIds OVERLAP = PROBLÈME
  stats: {
    totalManufacturers: manufacturerMap.size,
    sharedManufacturers: 0,
    legitimateSharing: 0,
    problematicSharing: 0
  }
};

manufacturerMap.forEach((drivers, manuName) => {
  if (drivers.length <= 1) return;

  report.stats.sharedManufacturers++;

  // Vérifier si productIds se chevauchent
  let hasOverlap = false;
  const allProductIds = new Set();
  const overlaps = [];

  for (let i = 0; i < drivers.length; i++) {
    for (let j = i + 1; j < drivers.length; j++) {
      const driver1 = drivers[i];
      const driver2 = drivers[j];

      // Vérifier intersection productIds
      const overlap = driver1.productIds.filter(pid => driver2.productIds.includes(pid));

      if (overlap.length > 0) {
        hasOverlap = true;
        overlaps.push({
          driver1: driver1.driver,
          driver2: driver2.driver,
          overlappingIds: overlap
        });
      }
    }

    // Collecter tous les productIds
    driver1.productIds.forEach(pid => allProductIds.add(pid));
  }

  if (hasOverlap) {
    report.problematic.push({
      manufacturerName: manuName,
      drivers: drivers.map(d => d.driver),
      overlaps,
      severity: 'CRITICAL'
    });
    report.stats.problematicSharing++;
  } else {
    report.legitimate.push({
      manufacturerName: manuName,
      drivers: drivers.map(d => ({
        name: d.driver,
        productIds: d.productIds
      })),
      reason: 'ProductIds différents - partage légitime',
      severity: 'INFO'
    });
    report.stats.legitimateSharing++;
  }
});

// AFFICHAGE
console.log('📊 RÉSULTATS ANALYSE:\n');
console.log(`   Total manufacturer names: ${report.stats.totalManufacturers}`);
console.log(`   Partagés entre drivers: ${report.stats.sharedManufacturers}`);
console.log(`   Partages LÉGITIMES: ${report.stats.legitimateSharing} ✅`);
console.log(`   Partages PROBLÉMATIQUES: ${report.stats.problematicSharing} 🔴\n`);

if (report.legitimate.length > 0) {
  console.log('✅ PARTAGES LÉGITIMES (manufacturerName partagé, productIds DIFFÉRENTS):\n');
  report.legitimate.slice(0, 10).forEach(item => {
    console.log(`   ${item.manufacturerName} (${item.drivers.length} drivers)`);
    item.drivers.forEach(d => {
      console.log(`      - ${d.name}: productIds=${d.productIds.join(', ')}`);
    });
    console.log();
  });

  if (report.legitimate.length > 10) {
    console.log(`   ... et ${report.legitimate.length - 10} autres partages légitimes\n`);
  }
}

if (report.problematic.length > 0) {
  console.log('\n🔴 PARTAGES PROBLÉMATIQUES (manufacturerName + productIds SE CHEVAUCHENT):\n');
  report.problematic.forEach(item => {
    console.log(`   ${item.manufacturerName}`);
    console.log(`      Drivers: ${item.drivers.join(', ')}`);
    item.overlaps.forEach(overlap => {
      console.log(`      ⚠️  ${overlap.driver1} ↔ ${overlap.driver2}`);
      console.log(`         ProductIds chevauchants: ${overlap.overlappingIds.join(', ')}`);
    });
    console.log();
  });
}

// Sauvegarder rapport
const reportFile = path.join(ROOT, 'LEGITIMATE_DUPLICATES_VERIFICATION.json');
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n✅ Rapport sauvegardé: ${reportFile}\n`);

// Conclusion
if (report.stats.problematicSharing > 0) {
  console.log('⚠️  ACTION REQUISE:');
  console.log(`   ${report.stats.problematicSharing} manufacturer names ont des productIds qui se chevauchent`);
  console.log('   Cela peut causer des conflits lors du pairing\n');
} else {
  console.log('✅ AUCUN PROBLÈME DÉTECTÉ:');
  console.log('   Tous les partages de manufacturer names sont légitimes');
  console.log('   (productIds différents entre drivers)\n');
}

process.exit(report.stats.problematicSharing > 0 ? 1 : 0);
