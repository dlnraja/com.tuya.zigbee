#!/usr/bin/env node
/**
 * Monthly Auto-Enrichment Script
 * Runs monthly to update drivers with new Blakadder/Zigbee2MQTT data
 */

const fs = require('fs').promises;
const path = require('path');

async function enrichDrivers() {
  console.log('🚀 Monthly enrichment starting...');

  const driversPath = path.join(__dirname, '..', 'drivers');
  const dirs = await fs.readdir(driversPath);

  let updated = 0;

  for (const dir of dirs) {
    const composePath = path.join(driversPath, dir, 'driver.compose.json');

    try {
      const data = await fs.readFile(composePath, 'utf-8');
      const driver = JSON.parse(data);

      // Check if needs IAS Zone
      if (driver.class === 'button' && driver.zigbee) {
        if (!driver.zigbee.endpoints['1'].clusters.includes(1280)) {
          console.log(`✅ Adding IAS Zone to ${dir}`);
          driver.zigbee.endpoints['1'].clusters.push(1280);
          driver.zigbee.endpoints['1'].bindings.push(1280);

          await fs.writeFile(composePath, JSON.stringify(driver, null, 2));
          updated++;
        }
      }
    } catch (err) {
      // Skip if file doesn't exist
    }
  }

  console.log(`✅ Updated ${updated} drivers`);
}

enrichDrivers().catch(console.error);
