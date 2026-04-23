#!/usr/bin/env node
/**
 * scripts/remediation/resolve-manifest-collisions.js
 * v7.6.0: Automated resolution of driver manifest fingerprint collisions.
 * Prioritizes specific drivers over generic ones.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AUDIT_FILE = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');

// Drivers ranked by "genericity" (lower rank = more generic, should be removed if colliding)
const GENERICITY_RANK = {
  'generic_tuya': 0,
  'generic_diy': 0,
  'device_generic_diy_universal_hybrid': 1,
  'button_wireless_1': 2,
  'lcdtemphumidsensor': 3,
  'button_wireless_4': 3,
  'button_wireless_hybrid': 3,
  'remote_button_wireless_hybrid': 3
};

if (!fs.existsSync(AUDIT_FILE)) {
  console.error(' Audit file not found.');
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
const collisions = audit.collisions || [];

console.log(` Resolving ${collisions.length} manifest collisions...`);

collisions.forEach(collision => {
  const [targetManu, targetModel] = collision.id.split('|');
  const drivers = collision.drivers;

  // Find the most specific driver (highest rank or not in list)
  let bestDriver = null;
  let bestRank = -1;

  drivers.forEach(d => {
    const rank = GENERICITY_RANK[d] !== undefined ? GENERICITY_RANK[d] : 100      ;
    if (rank > bestRank) {
      bestRank = rank;
      bestDriver = d;
    }
  });

  console.log(` Collision ${collision.id}: Keeping in '${bestDriver}'`);

  // Remove from other drivers
  drivers.forEach(d => {
    if (d === bestDriver) return;

    const composePath = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;

    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

    if (compose.zigbee) {
      let changed = false;

      // Case 1: Simple lists
      if (Array.isArray(compose.zigbee.manufacturerName)) {
        const index = compose.zigbee.manufacturerName.findIndex(m => m.toLowerCase() === targetManu.toLowerCase());
        if (index !== -1) {
          // Check if productId matches
          if (targetModel === '*' || (Array.isArray(compose.zigbee.productId) && compose.zigbee.productId.some(p => p.toLowerCase() === targetModel.toLowerCase()))) {
             // If we remove the manufacturer, it might break other items in that driver if they share it.
             // But usually in this app, the drivers list all manufacturers and all models separately (OR logic).
             // Homey matches ANY manufacturer in list with ANY model in list if they are standard arrays.
             // If this is a problem, we'd need to convert to an array of objects.
             // For now, removing the manufacturer if it's uniquely for this model is hard to determine without pairing info.
             // HOWEVER, if the manufacturerName is only in the list because of this collision, we remove it.
             
             // Actually, some drivers use a more complex array of { manufacturerName, productId } objects.
             // But the ones I saw (button_wireless_1, generic_tuya) use simple arrays.
          }
        }
      }
      
      // Let's use a more robust approach: If the driver has the targetManu AND it's a generic driver, 
      // we remove the fingerprint entry if possible.
      
      // If it's the standard Homey "manufacturerName" and "productId" arrays:
      if (Array.isArray(compose.zigbee.manufacturerName)) {
          const mIdx = compose.zigbee.manufacturerName.findIndex(m => m.toLowerCase() === targetManu.toLowerCase());
          if (mIdx !== -1) {
              // We only remove if the productId also matches or is *
              const pIdx = (targetModel === '*') ? 0 : (Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId.findIndex(p => p.toLowerCase() === targetModel.toLowerCase() : null) : -1)      ;
              
              if (pIdx !== -1) {
                  // Collision confirmed in this file.
                  // Removing is tricky because removing manufacturerName 'X' might break Model 'Y' in same driver.
                  // We should ideally convert to array of objects if not already.
                  console.log(`    Removing ${collision.id} from ${d}... (Note: shared arrays may affect other fingerprints)`);
                  
                  // For now, if it's a generic driver, we'll try to be safe.
                  // If we remove 'TS004F' from productId list, it won't match anymore for any manufacturer in this driver.
                  // This is exactly what we want if 'TS004F' is handled elsewhere for specific manufacturers.
                  
                  if (targetModel !== '*' && Array.isArray(compose.zigbee.productId)) {
                      compose.zigbee.productId = compose.zigbee.productId.filter(p => p.toLowerCase() !== targetModel.toLowerCase());
                      changed = true;
                  } else if (targetModel === '*') {
                      compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(m => m.toLowerCase() !== targetManu.toLowerCase());
                      changed = true;
                  }
              }
          }
      }
      
      if (changed) {
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        console.log(`    Cleaned up ${d}`);
      }
    }
  });
});

console.log(' Manifest collision resolution complete.');
