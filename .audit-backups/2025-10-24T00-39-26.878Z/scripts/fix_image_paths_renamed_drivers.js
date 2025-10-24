#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION CHEMINS IMAGES DRIVERS RENOMMÉS\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');

// MAPPING des renommages (ancien → nouveau)
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

// Lire app.json
let content = fs.readFileSync(appJsonPath, 'utf8');

// Backup
const backupPath = appJsonPath + '.backup-fix-image-paths.' + Date.now();
fs.copyFileSync(appJsonPath, backupPath);
console.log(`💾 Backup: ${path.basename(backupPath)}\n`);

let totalFixes = 0;

RENAMES.forEach(rename => {
  // Remplacer tous les chemins
  const regex1 = new RegExp(`/drivers/${rename.old}/`, 'g');
  const regex2 = new RegExp(`drivers/${rename.old}/`, 'g');
  
  const before = content.length;
  content = content.replace(regex1, `/drivers/${rename.new}/`);
  content = content.replace(regex2, `drivers/${rename.new}/`);
  const after = content.length;
  
  if (before !== after) {
    const count = (before - after) / (rename.old.length - rename.new.length);
    console.log(`✅ ${rename.old} → ${rename.new}: ${count} chemins corrigés`);
    totalFixes += count;
  }
});

// Sauvegarder
fs.writeFileSync(appJsonPath, content, 'utf8');

console.log(`\n📊 RÉSULTAT:`);
console.log(`   Total corrections: ${totalFixes}`);

if (totalFixes > 0) {
  console.log(`\n💡 PROCHAINES ÉTAPES:`);
  console.log(`   1. homey app build`);
  console.log(`   2. homey app validate --level publish`);
} else {
  console.log(`\n✅ Aucune correction nécessaire!`);
}
