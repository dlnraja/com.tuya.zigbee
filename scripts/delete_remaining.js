#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

// Delete these 2 remaining drivers
const toDelete = [
  'moes_sos_emergency_button_cr2032',
  'zemismart_motion_sensor_pir_ac'
];

console.log('🗑️  Deleting remaining energy-suffix drivers...\n');

for (const driver of toDelete) {
  const driverPath = path.join(driversDir, driver);
  
  if (fs.existsSync(driverPath)) {
    try {
      fs.rmSync(driverPath, { recursive: true, force: true });
      console.log(`✅ Deleted: ${driver}`);
    } catch (err) {
      console.error(`❌ Error deleting ${driver}:`, err.message);
    }
  } else {
    console.log(`⏭️  Already deleted: ${driver}`);
  }
}

console.log('\n✅ Cleanup complete!');
