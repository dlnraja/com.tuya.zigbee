#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Adding enable_power_estimation setting to all drivers...\n');

const newSetting = {
  id: 'enable_power_estimation',
  type: 'checkbox',
  label: {
    en: 'Enable Power Estimation',
    fr: 'Activer Estimation Puissance'
  },
  value: true,
  hint: {
    en: 'Estimate power consumption when real measurement is not available (AC/DC devices only)',
    fr: 'Estimer la consommation quand la mesure réelle n\'est pas disponible (appareils AC/DC seulement)'
  }
};

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let added = 0;
let skipped = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    skipped++;
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Ensure settings array exists
    if (!compose.settings) {
      compose.settings = [];
    }
    
    // Check if setting already exists
    const exists = compose.settings.some(s => s.id === 'enable_power_estimation');
    
    if (!exists) {
      compose.settings.push(newSetting);
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      console.log(`✅ Added: ${driverId}`);
      added++;
    } else {
      skipped++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
  }
}

console.log(`\n═══════════════════════════════════════`);
console.log(`✅ Added to: ${added} drivers`);
console.log(`⏭️  Skipped: ${skipped} drivers`);
console.log(`═══════════════════════════════════════`);
