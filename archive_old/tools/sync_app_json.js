#!/usr/bin/env node
/**
 * SYNC APP.JSON - Synchronise app.json avec driver.compose.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔄 SYNCHRONIZING app.json with driver.compose.json\n');

const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

let synced = 0;

appJson.drivers.forEach(driver => {
  const composePath = path.join(DRIVERS_DIR, driver.id, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      const before = driver.zigbee?.manufacturerName?.length || 0;
      const after = compose.zigbee.manufacturerName.length;
      
      if (!driver.zigbee) driver.zigbee = {};
      driver.zigbee.manufacturerName = compose.zigbee.manufacturerName;
      
      if (before !== after) {
        synced++;
        console.log(`  ✅ ${driver.id}: ${before} → ${after} manufacturers`);
      }
    }
  }
});

// Backup
const backup = APP_JSON + '.backup_sync_' + Date.now();
fs.copyFileSync(APP_JSON, backup);

// Save
fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2));

console.log(`\n✅ Synchronized ${synced} drivers in app.json`);
console.log(`📦 Backup: ${path.basename(backup)}\n`);
