#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 RENOMMAGE DES DRIVERS AVEC SUFFIXES DE MARQUE\n');

const driversDir = path.join(__dirname, '..', 'drivers');

// PLAN DE RENOMMAGE
// Stratégie: enlever le suffixe de marque et merger si un driver générique existe

const RENAME_PLAN = [
  // OSRAM (6)
  { old: 'bulb_rgbw_osram', new: 'bulb_rgbw', merge: true },
  { old: 'bulb_tunable_white_osram', new: 'bulb_tunable_white', merge: true },
  { old: 'bulb_white_osram', new: 'bulb_white', merge: true },
  { old: 'led_strip_rgbw_osram', new: 'led_strip_rgbw', merge: false },
  { old: 'plug_outdoor_osram', new: 'plug_outdoor', merge: false },
  { old: 'plug_smart_osram', new: 'plug_smart', merge: false },
  
  // INNR (4)
  { old: 'bulb_rgb_innr', new: 'bulb_rgb', merge: true },
  { old: 'bulb_tunable_white_innr', new: 'bulb_tunable_white', merge: true },
  { old: 'bulb_white_innr', new: 'bulb_white', merge: true },
  { old: 'plug_smart_innr', new: 'plug_smart', merge: false },
  
  // LSC (3)
  { old: 'bulb_rgb_lsc', new: 'bulb_rgb', merge: true },
  { old: 'bulb_tunable_white_lsc', new: 'bulb_tunable_white', merge: true },
  { old: 'bulb_white_lsc', new: 'bulb_white', merge: true },
  
  // PHILIPS (8)
  { old: 'bulb_rgb_philips', new: 'bulb_rgb', merge: true },
  { old: 'bulb_tunable_white_philips', new: 'bulb_tunable_white', merge: true },
  { old: 'bulb_white_philips', new: 'bulb_white', merge: true },
  { old: 'dimmer_wireless_philips', new: 'dimmer_wireless', merge: false },
  { old: 'led_strip_philips', new: 'led_strip', merge: false },
  { old: 'motion_sensor_outdoor_philips', new: 'motion_sensor_outdoor', merge: false },
  { old: 'motion_sensor_philips', new: 'motion_sensor', merge: false },
  { old: 'plug_smart_philips', new: 'plug_smart', merge: false },
  
  // SAMSUNG (7)
  { old: 'button_wireless_samsung', new: 'button_wireless', merge: false },
  { old: 'contact_sensor_samsung', new: 'contact_sensor', merge: false },
  { old: 'motion_sensor_outdoor_samsung', new: 'motion_sensor_outdoor', merge: true },
  { old: 'motion_sensor_samsung', new: 'motion_sensor', merge: false },
  { old: 'plug_outlet_samsung', new: 'plug_outlet', merge: false },
  { old: 'plug_smart_samsung', new: 'plug_smart', merge: false },
  { old: 'water_leak_sensor_samsung', new: 'water_leak_sensor', merge: false },
  
  // SONOFF (6)
  { old: 'button_wireless_sonoff', new: 'button_wireless', merge: false },
  { old: 'climate_monitor_sonoff', new: 'climate_monitor', merge: false },
  { old: 'contact_sensor_sonoff', new: 'contact_sensor', merge: false },
  { old: 'led_strip_sonoff', new: 'led_strip', merge: false },
  { old: 'motion_sensor_sonoff', new: 'motion_sensor', merge: false },
  { old: 'plug_smart_sonoff', new: 'plug_smart', merge: false }
];

let stats = {
  renamed: 0,
  merged: 0,
  errors: 0
};

console.log(`📋 Plan: ${RENAME_PLAN.length} drivers à traiter\n`);

RENAME_PLAN.forEach(plan => {
  const oldPath = path.join(driversDir, plan.old);
  const newPath = path.join(driversDir, plan.new);
  
  console.log(`\n📁 ${plan.old} → ${plan.new}`);
  
  if (!fs.existsSync(oldPath)) {
    console.log(`   ⚠️  Déjà traité ou n'existe pas`);
    return;
  }
  
  try {
    if (plan.merge && fs.existsSync(newPath)) {
      // MERGE: transférer manufacturer IDs
      console.log(`   🔀 MERGE avec driver existant...`);
      
      const oldCompose = JSON.parse(fs.readFileSync(path.join(oldPath, 'driver.compose.json'), 'utf8'));
      const newCompose = JSON.parse(fs.readFileSync(path.join(newPath, 'driver.compose.json'), 'utf8'));
      
      // Merger manufacturer names
      if (oldCompose.zigbee && oldCompose.zigbee.manufacturerName) {
        if (!newCompose.zigbee) newCompose.zigbee = {};
        if (!newCompose.zigbee.manufacturerName) newCompose.zigbee.manufacturerName = [];
        
        const existing = new Set(newCompose.zigbee.manufacturerName);
        let added = 0;
        
        oldCompose.zigbee.manufacturerName.forEach(name => {
          if (!existing.has(name)) {
            newCompose.zigbee.manufacturerName.push(name);
            added++;
          }
        });
        
        console.log(`      ✅ ${added} manufacturer names ajoutés`);
      }
      
      // Merger product IDs
      if (oldCompose.zigbee && oldCompose.zigbee.productId) {
        if (!newCompose.zigbee.productId) newCompose.zigbee.productId = [];
        
        const existing = new Set(newCompose.zigbee.productId);
        let added = 0;
        
        oldCompose.zigbee.productId.forEach(id => {
          if (!existing.has(id)) {
            newCompose.zigbee.productId.push(id);
            added++;
          }
        });
        
        console.log(`      ✅ ${added} product IDs ajoutés`);
      }
      
      // Sauvegarder
      const backupPath = path.join(newPath, 'driver.compose.json.backup.' + Date.now());
      fs.copyFileSync(path.join(newPath, 'driver.compose.json'), backupPath);
      fs.writeFileSync(path.join(newPath, 'driver.compose.json'), JSON.stringify(newCompose, null, 2), 'utf8');
      
      // Archiver ancien
      const archivePath = path.join(driversDir, '.' + plan.old + '.archived');
      fs.renameSync(oldPath, archivePath);
      
      console.log(`   🗑️  ${plan.old} archivé`);
      stats.merged++;
      
    } else {
      // RENAME simple
      console.log(`   ✏️  Renommage...`);
      
      // Mettre à jour l'ID dans driver.compose.json
      const composePath = path.join(oldPath, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        compose.id = plan.new;
        
        const backupPath = composePath + '.backup.' + Date.now();
        fs.copyFileSync(composePath, backupPath);
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      }
      
      // Renommer le dossier
      fs.renameSync(oldPath, newPath);
      
      console.log(`   ✅ Renommé avec succès`);
      stats.renamed++;
    }
    
  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
    stats.errors++;
  }
});

console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(70));
console.log(`\n✅ Renommés: ${stats.renamed}`);
console.log(`✅ Mergés: ${stats.merged}`);
console.log(`❌ Erreurs: ${stats.errors}`);

if (stats.renamed + stats.merged > 0) {
  console.log(`\n💡 PROCHAINES ÉTAPES:`);
  console.log(`   1. homey app build`);
  console.log(`   2. homey app validate --level publish`);
  console.log(`   3. git add -A`);
  console.log(`   4. git commit -m "fix: remove all brand suffixes from ${stats.renamed + stats.merged} drivers"`);
}
