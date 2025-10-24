#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../app.json'), 'utf8'));

console.log('\n🔍 RECHERCHE DRIVERS 4-GANG\n');

const gang4Drivers = appJson.drivers.filter(d => d.id.includes('4gang'));

console.log(`Found ${gang4Drivers.length} drivers with "4gang":\n`);

gang4Drivers.forEach(driver => {
  console.log(`📦 ${driver.id}`);
  console.log(`   Name: ${driver.name.en}`);
  console.log(`   Class: ${driver.class}`);
  
  if (driver.zigbee) {
    console.log(`   Manufacturer IDs:`);
    if (driver.zigbee.manufacturerName) {
      driver.zigbee.manufacturerName.forEach(m => {
        console.log(`      - ${m}`);
      });
    }
    console.log(`   Product IDs:`);
    if (driver.zigbee.productId) {
      driver.zigbee.productId.forEach(p => {
        console.log(`      - ${p}`);
      });
    }
    
    console.log(`   Endpoints:`);
    if (driver.zigbee.endpoints) {
      Object.keys(driver.zigbee.endpoints).forEach(ep => {
        console.log(`      EP ${ep}: clusters ${JSON.stringify(driver.zigbee.endpoints[ep].clusters || [])}`);
      });
    }
  }
  
  console.log('');
});

// Check if GIRIER manufacturer ID exists
console.log('\n🔍 Recherche GIRIER _TZ3000_ltt60asa:\n');

const girierDriver = appJson.drivers.find(d => 
  d.zigbee && 
  d.zigbee.manufacturerName && 
  d.zigbee.manufacturerName.includes('_TZ3000_ltt60asa')
);

if (girierDriver) {
  console.log(`✅ TROUVÉ dans driver: ${girierDriver.id}`);
} else {
  console.log(`❌ PAS TROUVÉ - Doit être ajouté`);
  console.log(`\n💡 Recommandation:`);
  console.log(`   Ajouter "_TZ3000_ltt60asa" à un driver 4-gang existant`);
  console.log(`   OU créer nouveau driver "girier_smart_switch_4gang_ac"`);
}

console.log('');
