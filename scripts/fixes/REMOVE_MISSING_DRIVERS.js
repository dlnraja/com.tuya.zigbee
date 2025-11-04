#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const APP_JSON = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 REMOVING DRIVERS WITHOUT FOLDERS\n');

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

const driversToRemove = [];

for (const driver of app.drivers) {
  const driverPath = path.join(DRIVERS_DIR, driver.id);
  
  if (!fs.existsSync(driverPath)) {
    console.log(`❌ Missing folder: ${driver.id}`);
    driversToRemove.push(driver.id);
  }
}

// Remove missing drivers
if (driversToRemove.length > 0) {
  app.drivers = app.drivers.filter(d => !driversToRemove.includes(d.id));
  
  fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2), 'utf8');
  
  console.log(`\n✅ Removed ${driversToRemove.length} drivers without folders\n`);
} else {
  console.log(`\n✅ All drivers have folders\n`);
}
