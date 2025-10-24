#!/usr/bin/env node

/**
 * FIX INVALID CAPABILITIES v34.0.0
 * Corrige les capabilities invalides
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIX INVALID CAPABILITIES v34.0.0\n');

const rootDir = path.join(__dirname, '..');
const driversDir = path.join(rootDir, 'drivers');

// Mapping capabilities invalides → valides
const capabilityFixes = {
  'alarm_button': null, // Supprimer, pas de capability standard pour button
  'alarm_button.pressed': null
};

const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let fixedCount = 0;

drivers.forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    let compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    let modified = false;
    
    if (compose.capabilities && Array.isArray(compose.capabilities)) {
      const originalLength = compose.capabilities.length;
      
      // Filtrer les capabilities invalides
      compose.capabilities = compose.capabilities.filter(cap => {
        const capName = typeof cap === 'string' ? cap : cap.id;
        return !capabilityFixes.hasOwnProperty(capName);
      });
      
      if (compose.capabilities.length !== originalLength) {
        modified = true;
        console.log(`✅ ${driverName} - Removed invalid capabilities`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      fixedCount++;
    }
    
  } catch (err) {
    console.log(`❌ ${driverName} - ERROR: ${err.message}`);
  }
});

console.log(`\n✅ Fixed ${fixedCount} drivers with invalid capabilities\n`);
