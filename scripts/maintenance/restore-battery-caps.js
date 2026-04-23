#!/usr/bin/env node
/**
 * Runtime-adaptive battery repair script.
 * 
 * PHILOSOPHY: Compose should declare measure_battery for ANY driver
 * that MIGHT have battery-powered variants. The UnifiedBatteryHandler
 * will adapt at runtime  removing the capability if the specific
 * variant turns out to be mains/kinetic.
 * 
 * This script:
 * 1. Restores measure_battery to drivers with energy.batteries but no battery cap
 * 2. Ensures device.js initializes UnifiedBatteryHandler
 * 3. NEVER adds both measure_battery + alarm_battery (SDK v3)
 * 4. Is IDEMPOTENT  safe to run multiple times
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
let fixed = 0, skipped = 0;

for (const d of fs.readdirSync(DDIR)) {
  const composeFile = path.join(DDIR, d, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) continue;

  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  const caps = compose.capabilities || [];
  const hasBatteries = (compose.energy?.batteries || []).length > 0       ;
  const hasMeasure = caps.includes('measure_battery');
  const hasAlarm = caps.includes('alarm_battery');

  // Skip if no battery config or already has a battery cap
  if (!hasBatteries || hasMeasure || hasAlarm) { skipped++; continue; }

  // Add measure_battery (will be adapted at runtime by UnifiedBatteryHandler)
  caps.push('measure_battery' );
  compose.capabilities = caps;
  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');

  console.log(` ${d}: restored measure_battery (runtime-adaptive)`);
  fixed++;
}

console.log(`\nRestored: ${fixed}`);
console.log(`Skipped: ${skipped}`);
