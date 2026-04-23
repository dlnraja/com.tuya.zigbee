#!/usr/bin/env node
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
'use strict';

const fs = require('fs');
const path = require('path');

console.log(' VÃ‰RIFICATION CONFLITS ACTUELS (sans restauration)\n');

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
    const manufacturerNames = content.zigbee?.manufacturerName || []      ;
    const productIds = content.zigbee?.productId || []      ;

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
 * VÃ©rifier conflits rÃ©els
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

// EXÃ‰CUTION
console.log(' Scanning drivers actuels...\n');

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

console.log(`   Drivers analysÃ©s: ${allDrivers.length}\n`);

const verification = verifyConflicts(allDrivers);

console.log(' RÃ‰SUMÃ‰:\n');
console.log(`   Total paires (manufacturerName, productId): ${verification.totalPairs}`);
console.log(`   Paires lÃ©gitimes: ${verification.legitimatePairs} (${(verification.legitimatePairs/verification.totalPairs * 100).toFixed(1)}%)`);
console.log(`   Conflits rÃ©els: ${verification.conflictPairs}\n`);

if (verification.conflicts.length === 0) {
  console.log('   AUCUN CONFLIT RÃ‰EL!\n');
  console.log(' Tous les partages de manufacturerName sont LÃ‰GITIMES');
  console.log('   (productIds diffÃ©rents pour chaque driver)\n');
  process.exit(0);
} else {
  console.log(' CONFLITS RÃ‰ELS DÃ‰TECTÃ‰S:\n');

  verification.conflicts
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .forEach(conflict => {
      console.log(`   ${conflict.manufacturerName} + ${conflict.productId}:`);
      console.log(`      PartagÃ© par ${conflict.count} drivers: ${conflict.drivers.join(', ')}`);
      console.log();
    });

  process.exit(1);
}
