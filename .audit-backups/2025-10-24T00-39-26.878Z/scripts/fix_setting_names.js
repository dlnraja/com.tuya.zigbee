#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Fixing setting names (energy_optimization → optimization_mode)...\n');

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory());

let fixed = 0;

for (const driver of drivers) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    let content = fs.readFileSync(composePath, 'utf-8');
    
    if (content.includes('"energy_optimization"')) {
      content = content.replace(/"energy_optimization"/g, '"optimization_mode"');
      fs.writeFileSync(composePath, content);
      console.log(`✅ Fixed: ${driver}`);
      fixed++;
    }
  } catch (err) {
    console.error(`❌ ${driver}: ${err.message}`);
  }
}

console.log(`\n✅ Fixed ${fixed} drivers`);
