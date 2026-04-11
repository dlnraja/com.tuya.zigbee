#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔄 RESTAURATION COMPLÈTE + VÉRIFICATION CONFLITS RÉELS\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let stats = {
  driversAnalyzed: 0,
  filesRestored: 0,
  totalNamesRestored: 0,
  backupsCreated: 0
};

const restorationDetails = [];

/**
 * Restaurer TOUS les manufacturer names d'un driver
 */
function restoreDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composeFile = path.join(driverPath, 'driver.compose.json');

  if (!fs.existsSync(composeFile)) return null;

  stats.driversAnalyzed++;

  // Trouver backup intelligent (AVANT nettoyage conservateur)
  const backups = fs.readdirSync(driverPath).filter(f =>
    f.includes('driver.compose.json.backup-intelligent')
  );

  if (backups.length === 0) return null;

  // Prendre le plus ancien backup intelligent (le plus complet)
  const intelligentBackup = backups.sort()[0];

  try {
    const currentContent = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const backupContent = JSON.parse(fs.readFileSync(path.join(driverPath, intelligentBackup), 'utf8'));

    const currentManuNames = currentContent.zigbee?.manufacturerName || [];
    const backupManuNames = backupContent.zigbee?.manufacturerName || [];
    const productIds = currentContent.zigbee?.productId || [];

    if (backupManuNames.length > currentManuNames.length) {
      // Backup avant restauration actuelle
      const backupPath = `${composeFile}.backup-full-restore-${Date.now()}`;
      fs.copyFileSync(composeFile, backupPath);
      stats.backupsCreated++;

      // Restaurer TOUS les manufacturer names du backup
      currentContent.zigbee.manufacturerName = backupManuNames;
      fs.writeFileSync(composeFile, JSON.stringify(currentContent, null, 2), 'utf8');

      stats.filesRestored++;
      const restored = backupManuNames.length - currentManuNames.length;
      stats.totalNamesRestored += restored;

      restorationDetails.push({
        driver: driverName,
        before: currentManuNames.length,
        after: backupManuNames.length,
        restored: restored,
        productIds: productIds,
        manufacturerNames: backupManuNames
      });

      console.log(`   ✅ ${driverName}: ${currentManuNames.length} → ${backupManuNames.length} (+${restored})`);

      return {
        driver: driverName,
        manufacturerNames: backupManuNames,
        productIds: productIds
      };
    }

    return {
      driver: driverName,
      manufacturerNames: currentManuNames,
      productIds: productIds
    };

  } catch (e) {
    console.error(`   ❌ ${driverName}:`, e.message);
    return null;
  }
}

/**
 * Vérifier les VRAIS conflits (manufacturerName + productId identiques)
 */
function verifyRealConflicts(allDrivers) {
  console.log('\n\n🔍 VÉRIFICATION CONFLITS RÉELS (manufacturerName + productId identiques)...\n');

  // Map: "manufacturerName|productId" -> [drivers]
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

  // Trouver les conflits réels (paire utilisée par plusieurs drivers)
  const realConflicts = [];
  const legitimateShares = new Map(); // manufacturerName -> count

  pairMap.forEach((drivers, pair) => {
    const [manuName, productId] = pair.split('|');

    if (drivers.length > 1) {
      // Conflit réel: même paire dans plusieurs drivers
      const uniqueDrivers = [...new Set(drivers)];
      if (uniqueDrivers.length > 1) {
        realConflicts.push({
          manufacturerName: manuName,
          productId: productId,
          drivers: uniqueDrivers,
          count: uniqueDrivers.length
        });
      }
    }

    // Compter partages légitimes de manufacturerName
    legitimateShares.set(manuName, (legitimateShares.get(manuName) || 0) + 1);
  });

  // Statistiques par driver
  const driverStats = new Map();

  allDrivers.forEach(driver => {
    if (!driver) return;

    const totalPairs = driver.manufacturerNames.length * driver.productIds.length;
    let conflicts = 0;

    driver.manufacturerNames.forEach(manuName => {
      driver.productIds.forEach(productId => {
        const pair = `${manuName}|${productId}`;
        const driversWithPair = pairMap.get(pair) || [];
        const uniqueDrivers = [...new Set(driversWithPair)];

        if (uniqueDrivers.length > 1 && uniqueDrivers.includes(driver.driver)) {
          conflicts++;
        }
      });
    });

    const legitimateRate = totalPairs > 0 ? ((totalPairs - conflicts) / totalPairs * 100) : 100;

    driverStats.set(driver.driver, {
      totalPairs: totalPairs,
      conflicts: conflicts,
      legitimate: totalPairs - conflicts,
      legitimateRate: legitimateRate,
      manufacturerCount: driver.manufacturerNames.length,
      productIdCount: driver.productIds.length
    });
  });

  return {
    realConflicts,
    driverStats,
    legitimateShares
  };
}

// EXÉCUTION
console.log('📂 Scanning tous les drivers...\n');

const drivers = fs.readdirSync(DRIVERS_DIR);
const allDrivers = [];

drivers.forEach(driverName => {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const stat = fs.statSync(driverPath);

  if (stat.isDirectory() && !driverName.startsWith('.')) {
    const result = restoreDriver(driverName);
    if (result) {
      allDrivers.push(result);
    }
  }
});

console.log('\n\n📊 RAPPORT RESTAURATION:\n');
console.log(`   Drivers analysés: ${stats.driversAnalyzed}`);
console.log(`   Fichiers restaurés: ${stats.filesRestored}`);
console.log(`   Manufacturer names restaurés: ${stats.totalNamesRestored}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

// Vérifier conflits
const verification = verifyRealConflicts(allDrivers);

// TOP DRIVERS PAR TAUX LÉGITIME
console.log('📊 TOP DRIVERS PAR TAUX PARTAGE LÉGITIME:\n');

const sortedStats = Array.from(verification.driverStats.entries())
  .sort((a, b) => b[1].totalPairs - a[1].totalPairs)
  .slice(0, 20);

sortedStats.forEach(([driver, stats]) => {
  console.log(`   ${driver}:`);
  console.log(`      Total paires: ${stats.totalPairs}`);
  console.log(`      Manufacturer names: ${stats.manufacturerCount}`);
  console.log(`      Product IDs: ${stats.productIdCount}`);
  console.log(`      Légitimes: ${stats.legitimate} (${stats.legitimateRate.toFixed(1)}%)`);
  console.log(`      Conflits: ${stats.conflicts}`);
  console.log();
});

// CONFLITS RÉELS
console.log('\n\n🔴 CONFLITS RÉELS (manufacturerName + productId identiques):\n');

if (verification.realConflicts.length === 0) {
  console.log('   ✅ AUCUN CONFLIT RÉEL DÉTECTÉ!\n');
  console.log('   Tous les partages de manufacturerName sont LÉGITIMES');
  console.log('   (productIds différents pour chaque driver)\n');
} else {
  console.log(`   Total conflits: ${verification.realConflicts.length}\n`);

  verification.realConflicts
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .forEach(conflict => {
      console.log(`   🔴 ${conflict.manufacturerName} + ${conflict.productId}:`);
      console.log(`      Partagé par ${conflict.count} drivers: ${conflict.drivers.join(', ')}`);
      console.log();
    });
}

// Sauvegarder analyse
const analysisFile = path.join(ROOT, 'FULL_RESTORATION_CONFLICTS_ANALYSIS.json');
fs.writeFileSync(analysisFile, JSON.stringify({
  restoration: restorationDetails,
  conflicts: verification.realConflicts,
  driverStats: Array.from(verification.driverStats.entries()).map(([driver, stats]) => ({
    driver,
    ...stats
  }))
}, null, 2), 'utf8');

console.log(`✅ Analyse sauvegardée: ${analysisFile}\n`);

console.log('🎯 CONCLUSION:');
console.log(`   Manufacturer names restaurés: ${stats.totalNamesRestored}`);
console.log(`   Conflits réels: ${verification.realConflicts.length}`);
console.log(`   Taux partage légitime moyen: ${
  Array.from(verification.driverStats.values())
    .reduce((sum, s) => sum + s.legitimateRate, 0) / verification.driverStats.size
}%\n`);

process.exit(verification.realConflicts.length > 0 ? 1 : 0);
