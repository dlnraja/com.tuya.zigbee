#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIXING ALL ENDPOINTS\n');

let fixCount = 0;

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory();
});

for (const driverName of drivers) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) continue;
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  let modified = false;
  
  if (compose.zigbee && compose.zigbee.endpoints) {
    const endpoints = compose.zigbee.endpoints;
    
    for (const [epId, epValue] of Object.entries(endpoints)) {
      // Si endpoint est vide {} ou n'a pas clusters
      if (!epValue || typeof epValue !== 'object' || !epValue.clusters) {
        compose.zigbee.endpoints[epId] = {
          clusters: []
        };
        modified = true;
        fixCount++;
      }
    }
  }
  
  // Ajouter energy pour les devices avec batterie
  const hasBattery = compose.capabilities && (
    compose.capabilities.includes('measure_battery') ||
    compose.capabilities.includes('alarm_battery')
  );
  
  if (hasBattery && !compose.energy) {
    compose.energy = {
      batteries: ['OTHER']
    };
    modified = true;
    fixCount++;
  }
  
  if (modified) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
    console.log(`✅ ${driverName}`);
  }
}

console.log(`\n✅ Total: ${fixCount} fixes\n`);
