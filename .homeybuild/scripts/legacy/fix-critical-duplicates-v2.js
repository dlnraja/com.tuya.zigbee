'use strict';

/**
 * Fix Critical Duplicates v2 - Based on GitHub Issues and Forum Research
 * 
 * ROOT CAUSES IDENTIFIED:
 * 1. Same manufacturerName+productId in INCOMPATIBLE drivers → wrong device pairing
 * 2. Devices pair to wrong driver → capabilities don't match → no data
 * 3. TS0601 devices need Tuya DP handling, but some are in ZCL-only drivers
 * 
 * FIXES:
 * - Remove manufacturerNames from drivers where device type doesn't match
 * - Each _TZE* ID should be in exactly ONE correct driver
 * - Keep generic _TZ3000_ prefixes only where they make sense
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// Research-based correct driver assignments
// Format: manufacturerName -> correct driver (based on actual device type)
const CORRECT_DRIVER_MAP = {
  // Temperature/Humidity LCD Sensors (from GitHub issue #1063 and Zigbee2MQTT)
  '_TZE200_cirvgep4': 'lcdtemphumidsensor',   // Temp/Humidity LCD (NOT contact_sensor, curtain, etc.)
  '_TZE200_a8sdabtg': 'lcdtemphumidsensor',   // Temp/Humidity sensor (GitHub #1063)
  '_TZE200_locansqn': 'radiator_valve',       // Radiator valve (GitHub #1104)
  
  // Air Quality sensors - keep only in air quality drivers
  '_TZE200_dwcarsat': 'air_quality_comprehensive',
  '_TZE204_dwcarsat': 'air_quality_comprehensive',
  '_TZE200_8ygsuhe1': 'air_quality_co2',
  
  // Emergency buttons - keep only in button driver
  '_TZ3000_gjnozsaz': 'button_emergency_sos',
  '_TZ3000_p6ju8myv': 'button_emergency_sos',
  
  // Fan controllers
  '_TZE200_r32ctezx': 'fan_controller',
  '_TZE204_r32ctezx': 'fan_controller',
  '_TZE200_dzuqwsyg': 'fan_controller',
  '_TZE204_dzuqwsyg': 'fan_controller',
  
  // Humidifiers/Air purifiers
  '_TZE200_mja3fuja': 'humidifier',
  '_TZE204_mja3fuja': 'humidifier',
};

// Drivers that should NEVER have these manufacturerNames
const INCOMPATIBLE_ASSIGNMENTS = {
  // Climate sensors should NOT have these device types
  'climate_sensor': [
    '_TZ3000_gjnozsaz',  // SOS button
    '_TZ3000_p6ju8myv',  // SOS button
  ],
  // Switch drivers should NOT have sensor IDs
  'switch_1gang': [
    '_TZ3000_gjnozsaz',  // SOS button, not switch
    '_TZ3000_p6ju8myv',  // SOS button
  ],
  'switch_2gang': [
    '_TZ3000_gjnozsaz',
    '_TZ3000_p6ju8myv',
  ],
  'switch_3gang': [
    '_TZ3000_gjnozsaz',
    '_TZ3000_p6ju8myv',
  ],
  'switch_4gang': [
    '_TZ3000_gjnozsaz',
    '_TZ3000_p6ju8myv',
  ],
};

let totalRemoved = 0;
let totalAdded = 0;
const changes = [];

function main() {
  console.log('🔧 Critical Duplicates Fix v2 - Based on GitHub/Forum Research\n');
  
  // Step 1: Remove manufacturerNames from wrong drivers
  console.log('📋 Step 1: Removing manufacturerNames from wrong drivers...\n');
  
  for (const [mfr, correctDriver] of Object.entries(CORRECT_DRIVER_MAP)) {
    removeFromWrongDrivers(mfr, correctDriver);
  }
  
  // Step 2: Remove known incompatible assignments
  console.log('\n📋 Step 2: Removing incompatible assignments...\n');
  
  for (const [driver, mfrs] of Object.entries(INCOMPATIBLE_ASSIGNMENTS)) {
    for (const mfr of mfrs) {
      removeFromDriver(driver, mfr);
    }
  }
  
  // Step 3: Add missing manufacturerNames from GitHub issues
  console.log('\n📋 Step 3: Adding missing manufacturerNames from GitHub issues...\n');
  
  // From GitHub issue #1063 - _TZE200_a8sdabtg needs to be in lcdtemphumidsensor
  ensureInDriver('lcdtemphumidsensor', '_TZE200_a8sdabtg');
  
  // From GitHub issue #1104 - _TZE200_locansqn is a radiator valve
  ensureInDriver('radiator_valve', '_TZE200_locansqn');
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total removed: ${totalRemoved}`);
  console.log(`Total added: ${totalAdded}`);
  console.log(`Drivers modified: ${new Set(changes.map(c => c.driver)).size}`);
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    totalRemoved,
    totalAdded,
    changes
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'critical-duplicates-fix-v2-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Report saved to scripts/critical-duplicates-fix-v2-report.json');
}

function removeFromWrongDrivers(mfr, correctDriver) {
  const folders = fs.readdirSync(driversDir);
  
  for (const folder of folders) {
    if (folder === correctDriver) continue; // Skip the correct driver
    
    const composePath = path.join(driversDir, folder, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];
      
      const idx = mfrs.findIndex(m => m.toLowerCase() === mfr.toLowerCase());
      if (idx !== -1) {
        console.log(`  ❌ Removing ${mfr} from ${folder} (correct: ${correctDriver})`);
        mfrs.splice(idx, 1);
        compose.zigbee.manufacturerName = mfrs;
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        totalRemoved++;
        changes.push({ action: 'remove', driver: folder, mfr, reason: `belongs to ${correctDriver}` });
      }
    } catch (err) {
      console.error(`Error processing ${folder}:`, err.message);
    }
  }
}

function removeFromDriver(driver, mfr) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const mfrs = compose.zigbee?.manufacturerName || [];
    
    const idx = mfrs.findIndex(m => m.toLowerCase() === mfr.toLowerCase());
    if (idx !== -1) {
      console.log(`  ❌ Removing ${mfr} from ${driver} (incompatible)`);
      mfrs.splice(idx, 1);
      compose.zigbee.manufacturerName = mfrs;
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      totalRemoved++;
      changes.push({ action: 'remove', driver, mfr, reason: 'incompatible' });
    }
  } catch (err) {
    console.error(`Error processing ${driver}:`, err.message);
  }
}

function ensureInDriver(driver, mfr) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    console.log(`  ⚠️ Driver ${driver} not found, skipping ${mfr}`);
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const mfrs = compose.zigbee?.manufacturerName || [];
    
    const exists = mfrs.some(m => m.toLowerCase() === mfr.toLowerCase());
    if (!exists) {
      console.log(`  ✅ Adding ${mfr} to ${driver}`);
      mfrs.push(mfr);
      compose.zigbee.manufacturerName = mfrs;
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      totalAdded++;
      changes.push({ action: 'add', driver, mfr, reason: 'missing from correct driver' });
    } else {
      console.log(`  ✓ ${mfr} already in ${driver}`);
    }
  } catch (err) {
    console.error(`Error processing ${driver}:`, err.message);
  }
}

main();
