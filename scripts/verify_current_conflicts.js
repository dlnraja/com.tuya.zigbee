#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION CONFLITS ACTUELS (sans restauration)\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

/**
 * Analyser driver actuel (SANS restauration)
 */
function analyzeCurrentDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composeFile = path.join(driverPath, 'driver.compose.json');

  if (!fs.existsSync(composeFile)) return null;

  try {
    const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const manufacturerNames = content.zigbee?.manufacturerName || [];
    const productIds = content.zigbee?.productId || [];

    return {
      driver: driverName,
      manufacturerNames: manufacturerNames,
      productIds: productIds
    };

  } catch (e) {
    return null;
  }
}

/**
 * Vérifier conflits réels
 */
function verifyConflicts(allDrivers) {
  const pairMap = new Map();

  allDrivers.forEach(driver => {
    if (!driver) return;

    driver.manufacturerNames.forEach(manuName => {
      driver.productIds.forEach(productId => {
        const pair = `${manuName}|${productId}`;

        if (!pairMap.has(pair)) {
          pairMap.set(pair, []);
        }
        pairMap.get(pair).push(driver.driver);
      });
    });
  });

  const realConflicts = [];

  pairMap.forEach((drivers, pair) => {
    const uniqueDrivers = [...new Set(drivers)];

    if (uniqueDrivers.length > 1) {
      const [manuName, productId] = pair.split('|');
      realConflicts.push({
        manufacturerName: manuName,
        productId: productId,
        drivers: uniqueDrivers,
        count: uniqueDrivers.length
      });
    }
  });

  // Stats
  const totalPairs = pairMap.size;
  const conflictPairs = realConflicts.length;
  const legitimatePairs = totalPairs - conflictPairs;

  return {
    totalPairs,
    conflictPairs,
    legitimatePairs,
    conflicts: realConflicts
  };
}

// EXÉCUTION
console.log('📂 Scanning drivers actuels...\n');

const drivers = fs.readdirSync(DRIVERS_DIR);
const allDrivers = [];

drivers.forEach(driverName => {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const stat = fs.statSync(driverPath);

  if (stat.isDirectory() && !driverName.startsWith('.')) {
    const result = analyzeCurrentDriver(driverName);
    if (result) {
      allDrivers.push(result);
    }
  }
});

console.log(`   Drivers analysés: ${allDrivers.length}\n`);

const verification = verifyConflicts(allDrivers);

console.log('📊 RÉSUMÉ:\n');
console.log(`   Total paires (manufacturerName, productId): ${verification.totalPairs}`);
console.log(`   Paires légitimes: ${verification.legitimatePairs} (${(verification.legitimatePairs / verification.totalPairs * 100).toFixed(1)}%)`);
console.log(`   Conflits réels: ${verification.conflictPairs}\n`);

if (verification.conflicts.length === 0) {
  console.log('✅ ✅ ✅ AUCUN CONFLIT RÉEL!\n');
  console.log('🎉 Tous les partages de manufacturerName sont LÉGITIMES');
  console.log('   (productIds différents pour chaque driver)\n');
  process.exit(0);
} else {
  console.log('🔴 CONFLITS RÉELS DÉTECTÉS:\n');

  verification.conflicts
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .forEach(conflict => {
      console.log(`   ${conflict.manufacturerName} + ${conflict.productId}:`);
      console.log(`      Partagé par ${conflict.count} drivers: ${conflict.drivers.join(', ')}`);
      console.log();
    });

  process.exit(1);
}
