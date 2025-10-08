#!/usr/bin/env node
// REMOVE UNDEFINED ENERGY - Supprimer tous les champs energy undefined

const fs = require('fs');
const path = require('path');

const drivers = 'c:\\Users\\HP\\Desktop\\tuya_repair\\drivers';

console.log('🧹 REMOVE UNDEFINED ENERGY FIELDS\n');

let checked = 0;
let fixed = 0;

fs.readdirSync(drivers).forEach(driverName => {
  const file = path.join(drivers, driverName, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  checked++;
  
  try {
    let compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    let modified = false;
    
    // Supprimer complètement energy si vide ou mal configuré
    if (compose.energy) {
      // Si energy existe mais n'a pas batteries OU a des champs vides
      if (!compose.energy.batteries || Object.keys(compose.energy).length === 0) {
        delete compose.energy;
        modified = true;
        console.log(`  🧹 ${driverName}: Removed empty energy`);
      }
    }
    
    // Vérifier si battery capability existe
    const caps = compose.capabilities || [];
    const hasBattery = caps.some(c => 
      c === 'measure_battery' || 
      c === 'alarm_battery' ||
      (typeof c === 'object' && (c.id === 'measure_battery' || c.id === 'alarm_battery'))
    );
    
    // Si battery capability MAIS pas d'energy.batteries, ajouter
    if (hasBattery && !compose.energy?.batteries) {
      const batteries = 
        driverName.includes('cr2032') ? ['CR2032'] :
        driverName.includes('cr2450') ? ['CR2450'] :
        driverName.includes('lock') ? ['AA','AA','AA','AA'] :
        driverName.includes('valve') ? ['AA','AA'] :
        ['AAA','AAA'];
      
      compose.energy = { batteries };
      modified = true;
      console.log(`  🔋 ${driverName}: Added batteries [${batteries}]`);
    }
    
    if (modified) {
      fs.writeFileSync(file, JSON.stringify(compose, null, 2));
      fixed++;
    }
    
  } catch (e) {
    console.log(`  ❌ ${driverName}: ${e.message}`);
  }
});

console.log(`\n📊 RÉSULTAT:`);
console.log(`  Vérifiés: ${checked}`);
console.log(`  Corrigés: ${fixed}\n`);
