#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * FIX ENERGY.BATTERIES pour tous les drivers avec measure_battery
 */

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

function fixDriverCompose(driverPath) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return { fixed: false, reason: 'no_compose' };
  
  let compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  
  // Check si measure_battery capability
  const hasBatteryCap = compose.capabilities && 
    (compose.capabilities.includes('measure_battery') || 
     compose.capabilities.includes('alarm_battery'));
  
  if (!hasBatteryCap) return { fixed: false, reason: 'no_battery_cap' };
  
  // Check si energy.batteries existe déjà
  if (compose.energy && compose.energy.batteries && compose.energy.batteries.length > 0) {
    return { fixed: false, reason: 'already_ok' };
  }
  
  // FIX: Ajouter energy.batteries
  if (!compose.energy) compose.energy = {};
  
  compose.energy.batteries = ['CR2032', 'CR2450', 'AAA', 'AA', 'CR123A', 'INTERNAL'];
  
  if (!compose.energy.approximation) {
    compose.energy.approximation = {
      usageConstant: 0.5
    };
  }
  
  // Backup
  fs.writeFileSync(composePath + '.backup-energy', JSON.stringify(JSON.parse(fs.readFileSync(composePath, 'utf8')), null, 2), 'utf8');
  
  // Save
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
  
  return { fixed: true, reason: 'energy_added' };
}

// Get all drivers
const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => {
    const stat = fs.statSync(path.join(DRIVERS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.') && !d.includes('archived');
  });

console.log(`🔧 Fixing energy.batteries for ${drivers.length} drivers...\n`);

let fixed = 0;
let alreadyOk = 0;
let noBatteryCap = 0;

drivers.forEach(driver => {
  const driverPath = path.join(DRIVERS_DIR, driver);
  const result = fixDriverCompose(driverPath);
  
  if (result.fixed) {
    console.log(`✅ Fixed: ${driver}`);
    fixed++;
  } else if (result.reason === 'already_ok') {
    alreadyOk++;
  } else if (result.reason === 'no_battery_cap') {
    noBatteryCap++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\nFixed: ${fixed} drivers`);
console.log(`Already OK: ${alreadyOk} drivers`);
console.log(`No battery cap: ${noBatteryCap} drivers`);
console.log(`Total: ${drivers.length} drivers\n`);
