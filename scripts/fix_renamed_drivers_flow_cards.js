#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION FLOW CARDS DES DRIVERS RENOMMÉS\n');

const driversDir = path.join(__dirname, '..', 'drivers');

// MAPPING: ancien préfixe → nouveau préfixe
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

let stats = {
  driversUpdated: 0,
  flowCardsFixed: 0
};

RENAMES.forEach(rename => {
  const flowPath = path.join(driversDir, rename.new, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowPath)) {
    console.log(`⚠️  ${rename.new}: pas de flow cards`);
    return;
  }
  
  try {
    let content = fs.readFileSync(flowPath, 'utf8');
    const originalContent = content;
    
    // Remplacer toutes les occurrences de l'ancien préfixe
    const regex = new RegExp(rename.old, 'g');
    content = content.replace(regex, rename.new);
    
    if (content !== originalContent) {
      // Backup
      const backupPath = flowPath + '.backup-rename.' + Date.now();
      fs.copyFileSync(flowPath, backupPath);
      
      // Sauvegarder
      fs.writeFileSync(flowPath, content, 'utf8');
      
      const count = (originalContent.match(regex) || []).length;
      console.log(`✅ ${rename.new}: ${count} occurrences corrigées`);
      
      stats.driversUpdated++;
      stats.flowCardsFixed += count;
    } else {
      console.log(`✓  ${rename.new}: déjà correct`);
    }
    
  } catch (err) {
    console.log(`❌ ${rename.new}: Erreur - ${err.message}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(70));
console.log(`\n✅ Drivers mis à jour: ${stats.driversUpdated}`);
console.log(`✅ Flow cards corrigées: ${stats.flowCardsFixed}`);

if (stats.driversUpdated > 0) {
  console.log(`\n💡 PROCHAINES ÉTAPES:`);
  console.log(`   1. homey app build`);
  console.log(`   2. homey app validate --level publish`);
  console.log(`   3. Vérifier: node scripts/find_all_brand_traces.js`);
}
