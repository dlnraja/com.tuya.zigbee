#!/usr/bin/env node
/**
 * R68 v2 test: Verify no cross-driver flow card ID collisions remain
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS = path.resolve(__dirname, '..', '..', 'drivers');

const idToDrivers = new Map();
for (const d of fs.readdirSync(DRIVERS)) {
  const f = path.join(DRIVERS, d, 'driver.flow.compose.json');
  if (!fs.existsSync(f)) continue;
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const section of ['triggers', 'actions', 'conditions']) {
    if (!c[section]) continue;
    for (const card of c[section]) {
      if (!idToDrivers.has(card.id)) idToDrivers.set(card.id, new Set());
      idToDrivers.get(card.id).add(d);
    }
  }
}

let passed = 0, failed = 0;
const collisions = [];
for (const [id, drivers] of idToDrivers) {
  if (drivers.size > 1) {
    collisions.push({ id, drivers: [...drivers] });
  }
}
if (collisions.length === 0) {
  console.log('✓ No cross-driver flow card ID collisions');
  passed++;
} else {
  console.log(`✗ Found ${collisions.length} cross-driver flow card ID collisions:`);
  for (const c of collisions) console.log(`  ${c.id}: ${c.drivers.join(', ')}`);
  failed++;
}

// Also check that climate_sensor has the proper titleFormatted
const csPath = path.join(DRIVERS, 'climate_sensor', 'driver.flow.compose.json');
const cs = JSON.parse(fs.readFileSync(csPath, 'utf8'));
const voltBelow = cs.conditions && cs.conditions.find(x => x.id === 'climate_sensor_battery_voltage_below');
if (voltBelow && voltBelow.titleFormatted && voltBelow.titleFormatted.en && voltBelow.titleFormatted.en.includes('[[voltage]]')) {
  console.log('✓ climate_sensor_battery_voltage_below has [[voltage]] in titleFormatted');
  passed++;
} else {
  console.log('✗ climate_sensor_battery_voltage_below missing [[voltage]] in titleFormatted');
  failed++;
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
