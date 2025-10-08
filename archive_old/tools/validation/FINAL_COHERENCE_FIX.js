#!/usr/bin/env node
// FINAL COHERENCE FIX - Vérification profonde + corrections intelligentes

const fs = require('fs');
const path = require('path');

const drivers = 'c:\\Users\\HP\\Desktop\\tuya_repair\\drivers';

console.log('🔍 FINAL COHERENCE FIX\n');

let checked = 0;
let fixed = 0;

fs.readdirSync(drivers).forEach(driverName => {
  const file = path.join(drivers, driverName, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  checked++;
  
  try {
    let compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    let modified = false;
    const name = driverName.toLowerCase();
    
    // CLASS COHERENCE
    const correctClass = 
      name.includes('motion') || name.includes('pir') || name.includes('contact') || 
      name.includes('leak') || name.includes('smoke') || name.includes('gas') ||
      name.includes('temp') && name.includes('sensor') || name.includes('humid') && name.includes('sensor') ||
      name.includes('co2') || name.includes('tvoc') || name.includes('pm25') ||
      name.includes('air_quality') || name.includes('vibration') || name.includes('noise') ||
      name.includes('presence') || name.includes('multisensor') ? 'sensor' :
      
      name.includes('light') || name.includes('bulb') || name.includes('rgb') || 
      name.includes('dimmer') && !name.includes('switch') || name.includes('spot') ||
      name.includes('strip') && !name.includes('led') ? 'light' :
      
      name.includes('switch') || name.includes('plug') || name.includes('socket') ||
      name.includes('relay') || name.includes('extension') ? 'socket' :
      
      name.includes('button') || name.includes('remote') || name.includes('scene_controller') ? 'button' :
      
      name.includes('lock') ? 'lock' :
      
      name.includes('thermostat') || name.includes('valve') && name.includes('radiator') ? 'thermostat' :
      
      name.includes('curtain') || name.includes('blind') || name.includes('shade') || name.includes('roller') ? 'curtain' :
      
      name.includes('doorbell') ? 'doorbell' :
      
      name.includes('siren') ? 'other' :
      
      compose.class;
    
    if (compose.class !== correctClass && correctClass !== compose.class) {
      console.log(`  🔧 ${driverName}: class ${compose.class} → ${correctClass}`);
      compose.class = correctClass;
      modified = true;
    }
    
    // CAPABILITIES COHERENCE
    let caps = Array.isArray(compose.capabilities) ? compose.capabilities : [];
    
    // Motion sensor needs alarm_motion
    if ((name.includes('motion') || name.includes('pir')) && !caps.includes('alarm_motion')) {
      caps.push('alarm_motion');
      modified = true;
    }
    
    // Contact sensor needs alarm_contact
    if (name.includes('contact') && !caps.some(c => c === 'alarm_contact' || c.includes('contact'))) {
      caps.push('alarm_contact');
      modified = true;
    }
    
    // Leak detector needs alarm_water
    if (name.includes('leak') && !caps.includes('alarm_water')) {
      caps.push('alarm_water');
      modified = true;
    }
    
    // Temperature sensor needs measure_temperature
    if (name.includes('temp') && !name.includes('controller') && 
        !caps.some(c => c === 'measure_temperature' || typeof c === 'object' && c.id === 'measure_temperature')) {
      caps.push('measure_temperature');
      modified = true;
    }
    
    // Humidity sensor needs measure_humidity
    if (name.includes('humid') && !caps.some(c => c === 'measure_humidity' || typeof c === 'object' && c.id === 'measure_humidity')) {
      caps.push('measure_humidity');
      modified = true;
    }
    
    // Light needs onoff
    if ((name.includes('light') || name.includes('bulb')) && !caps.includes('onoff')) {
      caps.unshift('onoff');
      modified = true;
    }
    
    // Switch/plug needs onoff
    if ((name.includes('switch') || name.includes('plug') || name.includes('socket')) && 
        !name.includes('wireless') && !caps.includes('onoff')) {
      caps.unshift('onoff');
      modified = true;
    }
    
    if (modified) {
      compose.capabilities = caps;
      fs.writeFileSync(file, JSON.stringify(compose, null, 2));
      console.log(`  ✅ ${driverName} fixed`);
      fixed++;
    }
    
  } catch (e) {
    console.log(`  ❌ ${driverName}: ${e.message}`);
  }
});

console.log(`\n📊 RÉSULTAT:`);
console.log(`  Vérifiés: ${checked}`);
console.log(`  Corrigés: ${fixed}\n`);
