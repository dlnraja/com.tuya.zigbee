#!/usr/bin/env node
// FIX SELON DOC HOMEY: https://apps.developer.homey.app/the-basics/devices/best-practices/battery-status
// RÈGLE: JAMAIS measure_battery ET alarm_battery ensemble !

const fs = require('fs');
const path = require('path');

const driversPath = 'c:\\Users\\HP\\Desktop\\tuya_repair\\drivers';
let fixed = 0;

fs.readdirSync(driversPath).forEach(driver => {
  const file = path.join(driversPath, driver, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
  const caps = compose.capabilities || [];
  
  const hasMeasure = caps.includes('measure_battery');
  const hasAlarm = caps.includes('alarm_battery');
  
  // RÈGLE OFFICIELLE: Supprimer alarm_battery si measure_battery existe
  if (hasMeasure && hasAlarm) {
    compose.capabilities = caps.filter(c => c !== 'alarm_battery');
    console.log(`✅ ${driver}: Removed alarm_battery (kept measure_battery)`);
    fixed++;
  }
  
  // Energy batteries obligatoire
  if (hasMeasure || hasAlarm) {
    if (!compose.energy || !compose.energy.batteries) {
      const batteries = driver.includes('cr2032') ? ['CR2032'] :
                       driver.includes('cr2450') ? ['CR2450'] :
                       driver.includes('lock') ? ['AA','AA','AA','AA'] :
                       ['AAA','AAA'];
      compose.energy = { batteries };
      console.log(`🔋 ${driver}: Added batteries [${batteries}]`);
      fixed++;
    }
  }
  
  fs.writeFileSync(file, JSON.stringify(compose, null, 2));
});

console.log(`\n✅ ${fixed} drivers fixed\n`);
console.log('Rebuild: Remove-Item .homeybuild,.homeycompose -Recurse -Force; homey app build');
