#!/usr/bin/env node

/**
 * FIX DUPLICATE CAPABILITIES v4.0.0
 * Supprime les capabilities dupliquées
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIX DUPLICATE CAPABILITIES v4.0.0\n');

const rootDir = path.join(__dirname, '..');
const driversDir = path.join(rootDir, 'drivers');

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
      const seen = new Set();
      const uniqueCaps = [];
      
      for (const cap of compose.capabilities) {
        const capName = typeof cap === 'string' ? cap : cap.id;
        
        if (!seen.has(capName)) {
          seen.add(capName);
          uniqueCaps.push(cap);
        } else {
          console.log(`   ❌ ${driverName}: Removed duplicate '${capName}'`);
          modified = true;
        }
      }
      
      if (modified) {
        compose.capabilities = uniqueCaps;
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        fixedCount++;
        console.log(`✅ ${driverName}`);
      }
    }
    
  } catch (err) {
    console.log(`❌ ${driverName} - ERROR: ${err.message}`);
  }
});

console.log(`\n✅ Fixed ${fixedCount} drivers with duplicate capabilities\n`);
