#!/usr/bin/env node
'use strict';
/**
 * Detect Missing Case Variants - v1.0.0
 * Scans all drivers for uppercase _TZ* variants missing lowercase counterparts
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function main() {
  console.log('=== Detect Missing Case Variants ===\n');
  
  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
  });
  
  let totalMissing = 0;
  const allMissing = [];
  
  for (const driver of driverDirs) {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = data.zigbee?.manufacturerName || []       ;
      const mfrSet = new Set(mfrs.map(m => m.trim()));
      
      let driverMissing = [];
      
      for (const mfr of mfrs) {
        // Check for uppercase _TZ* that might need lowercase variant
        if (mfr.startsWith('_TZ') || mfr.startsWith('_TZE') || mfr.startsWith('_TZ32')) {
          const parts = mfr.split('_');
          if (parts.length >= 3) {
            const prefix = parts.slice(0, 2).join('_');
            const suffix = parts.slice(2).join('_');
            const lowerVariant = prefix + '_' + suffix.toLowerCase();
            
            // If uppercase exists but lowercase doesn't
            if (mfr === mfr.toUpperCase() && !mfrSet.has(lowerVariant)) {
              driverMissing.push(lowerVariant );
            }
          }
        }
      }
      
      if (driverMissing.length > 0) {
        console.log(driver + ': ' + driverMissing.length + ' missing');
        for (const m of driverMissing) {
          console.log('  - ' + m);
        }
        totalMissing += driverMissing.length;
        allMissing.push({ driver, variants: driverMissing });
      }
    } catch (e) {
      console.error('Error in ' + driver + ': ' + e.message);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log('Drivers with missing variants:', allMissing.length);
  console.log('Total missing variants:', totalMissing);
  
  // Save results
  fs.writeFileSync(
    path.join(__dirname, '../../data/community-sync/missing-variants-detected.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), drivers: allMissing, total: totalMissing }, null, 2)
  );
  
  console.log('\nResults saved to data/community-sync/missing-variants-detected.json');
  
  return totalMissing;
}

main();
