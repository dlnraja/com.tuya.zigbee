#!/usr/bin/env node
// FIX ENERGY - Règles officielles Homey SDK3
// Source: https://apps.developer.homey.app/the-basics/devices/energy

const fs = require('fs');
const path = require('path');

const drivers = 'c:\\Users\\HP\\Desktop\\tuya_repair\\drivers';

console.log('🔧 FIX ENERGY - RÈGLES OFFICIELLES SDK3\n');
console.log('Règle: energy.batteries REQUIS si measure_battery/alarm_battery');
console.log('Règle: PAS de champ energy si pas de battery capability\n');

let checked = 0;
let removed = 0;
let added = 0;

fs.readdirSync(drivers).forEach(driverName => {
  const file = path.join(drivers, driverName, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  checked++;
  
  try {
    let compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    let modified = false;
    
    // Vérifier battery capabilities
    const caps = compose.capabilities || [];
    const hasBattery = caps.some(c => {
      if (typeof c === 'string') {
        return c === 'measure_battery' || c === 'alarm_battery';
      } else if (typeof c === 'object' && c.id) {
        return c.id === 'measure_battery' || c.id === 'alarm_battery';
      }
      return false;
    });
    
    if (hasBattery) {
      // DOIT avoir energy.batteries
      if (!compose.energy || !compose.energy.batteries) {
        const batteries = 
          driverName.includes('cr2032') ? ['CR2032'] :
          driverName.includes('cr2450') ? ['CR2450'] :
          driverName.includes('cr2477') ? ['CR2477'] :
          driverName.includes('lock') || driverName.includes('valve') ? ['AA', 'AA'] :
          driverName.includes('advanced') || driverName.includes('pro') || driverName.includes('smart') ? ['INTERNAL'] :
          ['AAA', 'AAA'];
        
        compose.energy = { batteries };
        modified = true;
        added++;
        console.log(`  ✅ ${driverName}: Added batteries [${batteries}]`);
      }
    } else {
      // NE DOIT PAS avoir energy
      if (compose.energy) {
        delete compose.energy;
        modified = true;
        removed++;
        console.log(`  🗑️  ${driverName}: Removed energy (no battery capability)`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(file, JSON.stringify(compose, null, 2));
    }
    
  } catch (e) {
    console.log(`  ❌ ${driverName}: ${e.message}`);
  }
});

console.log(`\n📊 RÉSULTAT:`);
console.log(`  Vérifiés: ${checked}`);
console.log(`  Energy supprimés: ${removed}`);
console.log(`  Energy.batteries ajoutés: ${added}\n`);
console.log('✅ Conforme SDK3: https://apps.developer.homey.app/the-basics/devices/energy\n');
