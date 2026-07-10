#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔄 RESTAURATION MANUFACTURER NAMES SUPPRIMÉS\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let stats = {
  driversAnalyzed: 0,
  namesRestored: 0,
  filesModified: 0,
  backupsCreated: 0
};

const restorations = [];

/**
 * Analyser et restaurer manufacturer names
 */
function analyzeDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composeFile = path.join(driverPath, 'driver.compose.json');

  if (!fs.existsSync(composeFile)) return;

  stats.driversAnalyzed++;

  // Trouver backup intelligent (avant nettoyage)
  const backups = fs.readdirSync(driverPath).filter(f =>
    f.includes('driver.compose.json.backup-intelligent')
  );

  if (backups.length === 0) return;

  const intelligentBackup = backups[0];

  try {
    const currentContent = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const backupContent = JSON.parse(fs.readFileSync(path.join(driverPath, intelligentBackup), 'utf8'));

    const currentManuNames = new Set(currentContent.zigbee?.manufacturerName || []);
    const backupManuNames = backupContent.zigbee?.manufacturerName || [];
    const currentProductIds = currentContent.zigbee?.productId || [];

    const deletedNames = backupManuNames.filter(m => !currentManuNames.has(m));

    if (deletedNames.length > 0) {
      // Filtrer: garder uniquement les IDs Tuya valides
      const validTuyaPatterns = [
        /^_TZ3000_[a-z0-9]{8}$/,
        /^_TZ3400_[a-z0-9]{8}$/,
        /^_TZE200_[a-z0-9]{8}$/,
        /^_TZE204_[a-z0-9]{8}$/,
        /^_TZE284_[a-z0-9]{8}$/,
        /^_TYZB01_[a-z0-9]{8}$/,
        /^_TZ3002_[a-z0-9]{8}$/
      ];

      const validDeleted = deletedNames.filter(name =>
        validTuyaPatterns.some(pattern => pattern.test(name))
      );

      if (validDeleted.length > 0) {
        restorations.push({
          driver: driverName,
          currentCount: currentManuNames.size,
          deletedCount: deletedNames.length,
          validDeletedCount: validDeleted.length,
          toRestore: validDeleted,
          productIds: currentProductIds
        });
      }
    }

  } catch (e) {
    // Ignore
  }
}

/**
 * Scanner tous les drivers
 */
function scanAllDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR);

  drivers.forEach(driverName => {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const stat = fs.statSync(driverPath);

    if (stat.isDirectory() && !driverName.startsWith('.')) {
      analyzeDriver(driverName);
    }
  });
}

console.log('📂 Scanning drivers avec backups...\n');
scanAllDrivers();

// AFFICHAGE
console.log('📊 ANALYSE RESTAURATION:\n');
console.log(`   Drivers analysés: ${stats.driversAnalyzed}`);
console.log(`   Drivers avec suppressions: ${restorations.length}\n`);

if (restorations.length > 0) {
  console.log('🔍 TOP 20 DRIVERS À RESTAURER:\n');

  restorations
    .sort((a, b) => b.validDeletedCount - a.validDeletedCount)
    .slice(0, 20)
    .forEach(item => {
      console.log(`   ${item.driver}:`);
      console.log(`      Actuels: ${item.currentCount}, Supprimés valides: ${item.validDeletedCount}`);
      console.log(`      ProductIds: ${item.productIds.join(', ')}`);
      console.log(`      À restaurer (5 premiers): ${item.toRestore.slice(0, 5).join(', ')}`);
      if (item.toRestore.length > 5) {
        console.log(`      ... et ${item.toRestore.length - 5} autres`);
      }
      console.log();
    });
}

// Sauvegarder analyse
const analysisFile = path.join(ROOT, 'MANUFACTURER_RESTORATION_ANALYSIS.json');
fs.writeFileSync(analysisFile, JSON.stringify(restorations, null, 2), 'utf8');
console.log(`✅ Analyse sauvegardée: ${analysisFile}\n`);

// Statistiques totales
const totalToRestore = restorations.reduce((sum, r) => sum + r.validDeletedCount, 0);
console.log(`📊 TOTAL À RESTAURER: ${totalToRestore} manufacturer names valides\n`);

if (totalToRestore > 0) {
  console.log('⚠️  RECOMMANDATION:');
  console.log('   Ces manufacturer names Tuya valides ont été supprimés');
  console.log('   Ils devraient être restaurés car ils peuvent identifier des variants');
  console.log('   Le partage entre drivers est LÉGITIME si productIds différents\n');

  console.log('🎯 PROCHAINE ÉTAPE:');
  console.log('   Exécuter script de restauration pour remettre les IDs valides\n');
}

process.exit(totalToRestore > 0 ? 1 : 0);
