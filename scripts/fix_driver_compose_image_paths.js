#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION CHEMINS DANS DRIVER.COMPOSE.JSON\n');

const driversDir = path.join(__dirname, '..', 'drivers');

// MAPPING des renommages
const RENAMES = [
  { old: 'bulb_rgbw_osram', new: 'bulb_rgbw' },
  { old: 'led_strip_rgbw_osram', new: 'led_strip_rgbw' },
  { old: 'led_strip_philips', new: 'led_strip' },
  { old: 'plug_outdoor_osram', new: 'plug_outdoor' },
  { old: 'plug_outlet_samsung', new: 'plug_outlet' },
  { old: 'climate_monitor_sonoff', new: 'climate_monitor' },
  { old: 'contact_sensor_samsung', new: 'contact_sensor' },
  { old: 'motion_sensor_philips', new: 'motion_sensor' },
  { old: 'motion_sensor_outdoor_philips', new: 'motion_sensor_outdoor' },
  { old: 'dimmer_wireless_philips', new: 'dimmer_wireless' }
];

let totalFixes = 0;

RENAMES.forEach(rename => {
  const composePath = path.join(driversDir, rename.new, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  ${rename.new}: pas de driver.compose.json`);
    return;
  }
  
  try {
    let content = fs.readFileSync(composePath, 'utf8');
    const originalContent = content;
    
    // Remplacer tous les chemins
    const regex1 = new RegExp(`/drivers/${rename.old}/`, 'g');
    const regex2 = new RegExp(`drivers/${rename.old}/`, 'g');
    
    content = String(content).replace(regex1, `/drivers/${rename.new}/`);
    content = String(content).replace(regex2, `drivers/${rename.new}/`);
    
    if (content !== originalContent) {
      // Backup
      const backupPath = composePath + '.backup-paths.' + Date.now();
      fs.copyFileSync(composePath, backupPath);
      
      // Sauvegarder
      fs.writeFileSync(composePath, content, 'utf8');
      
      const count = (originalContent.match(regex1) || []).length + 
                     (originalContent.match(regex2) || []).length;
      console.log(`✅ ${rename.new}: ${count} chemins corrigés`);
      totalFixes += count;
    } else {
      console.log(`✓  ${rename.new}: déjà correct`);
    }
    
  } catch (err) {
    console.log(`❌ ${rename.new}: Erreur - ${err.message}`);
  }
});

console.log(`\n📊 TOTAL: ${totalFixes} chemins corrigés`);

if (totalFixes > 0) {
  console.log(`\n💡 PROCHAINES ÉTAPES:`);
  console.log(`   1. homey app build`);
  console.log(`   2. homey app validate --level publish`);
}
