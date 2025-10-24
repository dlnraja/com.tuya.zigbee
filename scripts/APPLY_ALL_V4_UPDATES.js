#!/usr/bin/env node

/**
 * APPLY ALL v4++ UPDATES
 * Applique toutes les découvertes v3++ et v4++
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚀 APPLY ALL v4++ UPDATES\n');

// Load configuration
const config = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'CONFIG_v4_COMPLETE.json'), 
  'utf8'
));

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log(`📊 ${drivers.length} drivers\n`);

let enriched = 0;
let fixed = 0;

for (const driver of drivers) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    let modified = false;
    
    // Fix ID
    if (compose.id !== driver) {
      compose.id = driver;
      modified = true;
      fixed++;
    }
    
    // Enrich manufacturer IDs
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      for (const [type, ids] of Object.entries(config.enrichment_database)) {
        if (driver.includes(type)) {
          let added = 0;
          for (const id of ids) {
            if (!compose.zigbee.manufacturerName.includes(id)) {
              compose.zigbee.manufacturerName.push(id);
              added++;
            }
          }
          if (added > 0) {
            modified = true;
            enriched++;
            console.log(`✅ ${driver}: +${added} IDs`);
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    }
    
  } catch (err) {
    console.error(`❌ ${driver}: ${err.message}`);
  }
}

console.log(`\n✅ Updates applied:`);
console.log(`   IDs fixed: ${fixed}`);
console.log(`   Drivers enriched: ${enriched}\n`);
