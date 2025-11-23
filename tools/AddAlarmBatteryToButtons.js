#!/usr/bin/env node

/**
 * Add alarm_battery capability to all button drivers
 * According to CURSOR_REFACTOR_GUIDE_PART1.md Phase 1 & 2
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

// Button driver patterns
const buttonPatterns = [
  /^button_/,
  /_button$/,
  /^scene_controller/,
  /doorbell_button/
];

function isButtonDriver(driverName) {
  return buttonPatterns.some(pattern => pattern.test(driverName));
}

function addAlarmBattery(driverPath) {
  const composePath = path.join(driverPath, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(composePath, 'utf8');
    const driver = JSON.parse(content);

    // Check if it's really a button
    if (driver.class !== 'button' && driver.class !== 'remote') {
      return null;
    }

    // Check if measure_battery exists
    if (!driver.capabilities || !driver.capabilities.includes('measure_battery')) {
      return null;
    }

    // Check if alarm_battery already exists
    if (driver.capabilities.includes('alarm_battery')) {
      return { status: 'skip', reason: 'already has alarm_battery' };
    }

    // Add alarm_battery after measure_battery
    const index = driver.capabilities.indexOf('measure_battery');
    driver.capabilities.splice(index + 1, 0, 'alarm_battery');

    // Write back
    fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n', 'utf8');

    return { status: 'updated', capabilities: driver.capabilities };

  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

console.log('🔍 Scanning button drivers...\n');

const drivers = fs.readdirSync(driversDir);
let updated = 0;
let skipped = 0;
let errors = 0;

drivers.forEach(driverName => {
  if (!isButtonDriver(driverName)) {
    return;
  }

  const driverPath = path.join(driversDir, driverName);
  const stat = fs.statSync(driverPath);

  if (!stat.isDirectory()) {
    return;
  }

  const result = addAlarmBattery(driverPath);

  if (!result) {
    return; // Not a button or no compose file
  }

  if (result.status === 'updated') {
    console.log(`✅ ${driverName}: Added alarm_battery`);
    updated++;
  } else if (result.status === 'skip') {
    console.log(`⏭️  ${driverName}: ${result.reason}`);
    skipped++;
  } else if (result.status === 'error') {
    console.log(`❌ ${driverName}: ${result.error}`);
    errors++;
  }
});

console.log(`\n╔═══════════════════════════════════════════╗`);
console.log(`║   ALARM_BATTERY ADDITION COMPLETE!       ║`);
console.log(`╚═══════════════════════════════════════════╝`);
console.log(`✅ Updated: ${updated} drivers`);
console.log(`⏭️  Skipped: ${skipped} drivers (already have it)`);
console.log(`❌ Errors: ${errors} drivers`);
console.log(`📊 Total: ${updated + skipped + errors} button drivers\n`);

console.log(`🎯 CURSOR GUIDE PHASE 2 - Battery Pipeline Consistency: COMPLETE!`);
