#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('🔧 FIXING APP.JSON ENDPOINTS\n');

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

let fixCount = 0;

// Fix all drivers with endpoints
for (const driver of app.drivers) {
  if (driver.zigbee && driver.zigbee.endpoints) {
    let modified = false;
    
    for (const [epId, epValue] of Object.entries(driver.zigbee.endpoints)) {
      // If endpoint is not a valid object or missing clusters
      if (!epValue || typeof epValue !== 'object' || !epValue.clusters || !Array.isArray(epValue.clusters)) {
        driver.zigbee.endpoints[epId] = {
          clusters: ["basic", "onOff"]
        };
        modified = true;
      }
    }
    
    if (modified) {
      console.log(`✅ ${driver.id}`);
      fixCount++;
    }
  }
  
  // Add energy for battery devices
  const hasBattery = driver.capabilities && (
    driver.capabilities.includes('measure_battery') ||
    driver.capabilities.includes('alarm_battery')
  );
  
  if (hasBattery && !driver.energy) {
    driver.energy = {
      batteries: ['OTHER']
    };
    fixCount++;
  }
}

fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2), 'utf8');

console.log(`\n✅ Total: ${fixCount} fixes\n`);
