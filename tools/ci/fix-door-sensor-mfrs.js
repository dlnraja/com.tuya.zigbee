#!/usr/bin/env node
/**
 * fix-door-sensor-mfrs.js
 *
 * Fix the 5 mfrs that were "mapped" to door_sensor (which doesn't exist as a driver).
 * The real TS0203 drivers are: contact_sensor, sensor_contact_zigbee, smart_door_window_sensor.
 *
 * For safety, add them to contact_sensor (most general, highest priority).
 *
 * @author Mavis investigation 2026-07-12
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');

const APPLY = process.argv.includes('--apply');

const MFRS = [
  '_TZ3000_6zvw8ham',
  '_TZ3000_l3k0pnc1',
  '_TZ3000_zutizvyk',
  '_TZ3000_2mccw9py',
  '_TZ3000_d1is6erx',
];

async function main() {
  const targets = ['contact_sensor', 'sensor_contact_zigbee', 'smart_door_window_sensor'];
  console.log(`Fix door_sensor mfrs — adding to: ${targets.join(', ')}\n`);

  let added = 0;
  for (const mfr of MFRS) {
    for (const target of targets) {
      const composePath = path.join(DRIVERS, target, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      const j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (!j.zigbee) j.zigbee = {};
      if (!Array.isArray(j.zigbee.manufacturerName)) j.zigbee.manufacturerName = [];
      if (j.zigbee.manufacturerName.includes(mfr)) continue;
      j.zigbee.manufacturerName.push(mfr);
      if (APPLY) {
        fs.writeFileSync(composePath, JSON.stringify(j, null, 2), 'utf8');
      }
      added++;
      console.log(`  ${APPLY ? '✓' : '○'} ${target}: +${mfr}`);
      break; // Only add to the first matching target
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would add'}: ${added} mfr-driver pairs.`);
  if (!APPLY) console.log('Run with --apply to actually modify files.');
}

main();
