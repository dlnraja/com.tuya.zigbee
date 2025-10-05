#!/usr/bin/env node
/**
 * Enrich ALL drivers with complete manufacturer database
 * Targets both driver.compose.json files AND app.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON_PATH = path.join(ROOT, 'app.json');
const SOURCE_PATH = path.join(ROOT, '.external_sources', 'koenkk_tuya_devices_herdsman_converters_1759501156003.json');

console.log('🚀 MASSIVE ENRICHMENT - ALL DRIVERS\n');

// Load manufacturer source
console.log('📦 Loading manufacturer database...');
const sourceData = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
const allManufacturers = sourceData.manufacturers || [];
console.log(`✅ Loaded ${allManufacturers.length} manufacturers from zigbee2mqtt\n`);

// Statistics
let stats = {
  driversScanned: 0,
  driversEnriched: 0,
  driversSkipped: 0,
  totalManufacturersAdded: 0,
  beforeCounts: [],
  afterCounts: []
};

// Process driver.compose.json files
console.log('🔄 Processing individual driver.compose.json files...\n');

const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

driverDirs.forEach(driverId => {
  stats.driversScanned++;
  
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    stats.driversSkipped++;
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Skip if no zigbee section
    if (!compose.zigbee) {
      stats.driversSkipped++;
      return;
    }
    
    // Initialize manufacturerName if not present
    if (!compose.zigbee.manufacturerName) {
      compose.zigbee.manufacturerName = [];
    }
    
    // Ensure it's an array
    if (!Array.isArray(compose.zigbee.manufacturerName)) {
      compose.zigbee.manufacturerName = [compose.zigbee.manufacturerName];
    }
    
    const beforeCount = compose.zigbee.manufacturerName.length;
    stats.beforeCounts.push(beforeCount);
    
    // Merge manufacturers
    const mfrSet = new Set(compose.zigbee.manufacturerName);
    let addedCount = 0;
    
    allManufacturers.forEach(mfr => {
      if (!mfrSet.has(mfr)) {
        mfrSet.add(mfr);
        addedCount++;
      }
    });
    
    // Update
    compose.zigbee.manufacturerName = Array.from(mfrSet).sort();
    const afterCount = compose.zigbee.manufacturerName.length;
    stats.afterCounts.push(afterCount);
    
    if (addedCount > 0) {
      // Backup original
      const backupPath = composePath + '.backup';
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(composePath, backupPath);
      }
      
      // Save enriched
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      
      stats.driversEnriched++;
      stats.totalManufacturersAdded += addedCount;
      
      console.log(`  ✓ ${driverId}: ${beforeCount} → ${afterCount} (+${addedCount})`);
    }
    
  } catch (error) {
    console.error(`  ✗ ${driverId}: ERROR - ${error.message}`);
    stats.driversSkipped++;
  }
});

console.log('\n🔄 Updating app.json...\n');

// Now update app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
let appJsonUpdated = 0;

if (appJson.drivers && Array.isArray(appJson.drivers)) {
  appJson.drivers.forEach(driver => {
    if (driver.zigbee && driver.zigbee.manufacturerName) {
      const mfrSet = new Set(driver.zigbee.manufacturerName);
      const beforeCount = mfrSet.size;
      
      allManufacturers.forEach(mfr => {
        mfrSet.add(mfr);
      });
      
      driver.zigbee.manufacturerName = Array.from(mfrSet).sort();
      
      if (driver.zigbee.manufacturerName.length > beforeCount) {
        appJsonUpdated++;
      }
    }
  });
}

// Backup and save app.json
const appBackupPath = APP_JSON_PATH + '.backup.' + Date.now();
fs.copyFileSync(APP_JSON_PATH, appBackupPath);
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`  ✓ app.json: ${appJsonUpdated} drivers updated`);

// Final statistics
console.log('\n📊 ENRICHMENT SUMMARY:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Total drivers scanned:        ${stats.driversScanned}`);
console.log(`  Drivers enriched:             ${stats.driversEnriched}`);
console.log(`  Drivers skipped (no zigbee):  ${stats.driversSkipped}`);
console.log(`  Total manufacturers added:    ${stats.totalManufacturersAdded.toLocaleString()}`);

if (stats.beforeCounts.length > 0) {
  const avgBefore = Math.round(stats.beforeCounts.reduce((a, b) => a + b, 0) / stats.beforeCounts.length);
  const avgAfter = Math.round(stats.afterCounts.reduce((a, b) => a + b, 0) / stats.afterCounts.length);
  console.log(`  Average before enrichment:    ${avgBefore} mfrs/driver`);
  console.log(`  Average after enrichment:     ${avgAfter} mfrs/driver`);
  console.log(`  Improvement:                  ${Math.round((avgAfter / avgBefore - 1) * 100)}%`);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n💾 Backups created:');
console.log(`  app.json: ${path.basename(appBackupPath)}`);
console.log(`  driver.compose.json: ${stats.driversEnriched} files`);

console.log('\n✨ MASSIVE ENRICHMENT COMPLETE!\n');
console.log('🎯 Next steps:');
console.log('  1. Run orchestrator: node ultimate_system/orchestration/Ultimate_Quantified_Orchestrator.js');
console.log('  2. Commit changes: git add -A && git commit -m "v2.0.3: Complete enrichment"');
console.log('  3. Push to GitHub: git push origin master');
