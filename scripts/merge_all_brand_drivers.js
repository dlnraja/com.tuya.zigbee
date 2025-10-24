#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 MERGE DE TOUS LES DRIVERS AVEC SUFFIXES DE MARQUE\n');

const driversDir = path.join(__dirname, '..', 'drivers');

// TOUS les drivers avec suffixe de marque doivent être mergés
const DRIVERS_TO_MERGE = [
  // OSRAM
  { old: 'plug_smart_osram', new: 'plug_smart' },
  
  // INNR
  { old: 'plug_smart_innr', new: 'plug_smart' },
  
  // PHILIPS  
  { old: 'dimmer_wireless_philips', new: 'dimmer_wireless' },
  { old: 'plug_smart_philips', new: 'plug_smart' },
  
  // SAMSUNG
  { old: 'button_wireless_samsung', new: 'button_wireless' },
  { old: 'motion_sensor_samsung', new: 'motion_sensor' },
  { old: 'plug_smart_samsung', new: 'plug_smart' },
  { old: 'water_leak_sensor_samsung', new: 'water_leak_sensor' },
  
  // SONOFF
  { old: 'button_wireless_sonoff', new: 'button_wireless' },
  { old: 'contact_sensor_sonoff', new: 'contact_sensor' },
  { old: 'led_strip_sonoff', new: 'led_strip' },
  { old: 'motion_sensor_sonoff', new: 'motion_sensor' },
  { old: 'plug_smart_sonoff', new: 'plug_smart' }
];

let stats = {
  merged: 0,
  errors: 0,
  manufacturerIdsAdded: 0,
  productIdsAdded: 0
};

console.log(`📋 ${DRIVERS_TO_MERGE.length} drivers à merger\n`);

DRIVERS_TO_MERGE.forEach(plan => {
  const oldPath = path.join(driversDir, plan.old);
  const newPath = path.join(driversDir, plan.new);
  
  console.log(`\n📁 ${plan.old} → ${plan.new}`);
  
  if (!fs.existsSync(oldPath)) {
    console.log(`   ⚠️  Déjà traité ou n'existe pas`);
    return;
  }
  
  if (!fs.existsSync(newPath)) {
    console.log(`   ❌ Driver cible n'existe pas!`);
    stats.errors++;
    return;
  }
  
  try {
    const oldComposePath = path.join(oldPath, 'driver.compose.json');
    const newComposePath = path.join(newPath, 'driver.compose.json');
    
    if (!fs.existsSync(oldComposePath) || !fs.existsSync(newComposePath)) {
      console.log(`   ❌ Fichiers compose manquants`);
      stats.errors++;
      return;
    }
    
    const oldCompose = JSON.parse(fs.readFileSync(oldComposePath, 'utf8'));
    const newCompose = JSON.parse(fs.readFileSync(newComposePath, 'utf8'));
    
    let mfgAdded = 0;
    let prodAdded = 0;
    
    // Merger manufacturer names
    if (oldCompose.zigbee && oldCompose.zigbee.manufacturerName) {
      if (!newCompose.zigbee) newCompose.zigbee = {};
      if (!newCompose.zigbee.manufacturerName) newCompose.zigbee.manufacturerName = [];
      
      const existing = new Set(newCompose.zigbee.manufacturerName);
      
      oldCompose.zigbee.manufacturerName.forEach(name => {
        if (!existing.has(name)) {
          newCompose.zigbee.manufacturerName.push(name);
          mfgAdded++;
        }
      });
    }
    
    // Merger product IDs
    if (oldCompose.zigbee && oldCompose.zigbee.productId) {
      if (!newCompose.zigbee.productId) newCompose.zigbee.productId = [];
      
      const existing = new Set(newCompose.zigbee.productId);
      
      oldCompose.zigbee.productId.forEach(id => {
        if (!existing.has(id)) {
          newCompose.zigbee.productId.push(id);
          prodAdded++;
        }
      });
    }
    
    console.log(`   ✅ ${mfgAdded} manufacturer names + ${prodAdded} product IDs`);
    
    stats.manufacturerIdsAdded += mfgAdded;
    stats.productIdsAdded += prodAdded;
    
    // Sauvegarder
    const backupPath = newComposePath + '.backup.' + Date.now();
    fs.copyFileSync(newComposePath, backupPath);
    fs.writeFileSync(newComposePath, JSON.stringify(newCompose, null, 2), 'utf8');
    
    // Archiver ancien
    const archivePath = path.join(driversDir, '.' + plan.old + '.archived');
    if (fs.existsSync(archivePath)) {
      // Déjà archivé, supprimer
      fs.rmSync(archivePath, { recursive: true, force: true });
    }
    fs.renameSync(oldPath, archivePath);
    
    console.log(`   🗑️  Archivé`);
    stats.merged++;
    
  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
    stats.errors++;
  }
});

console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(70));
console.log(`\n✅ Drivers mergés: ${stats.merged}`);
console.log(`✅ Manufacturer IDs ajoutés: ${stats.manufacturerIdsAdded}`);
console.log(`✅ Product IDs ajoutés: ${stats.productIdsAdded}`);
console.log(`❌ Erreurs: ${stats.errors}`);

if (stats.merged > 0) {
  console.log(`\n💡 PROCHAINES ÉTAPES:`);
  console.log(`   1. homey app build`);
  console.log(`   2. homey app validate --level publish`);
  console.log(`   3. git add -A`);
  console.log(`   4. git commit -m "fix: merge ${stats.merged} brand-suffixed drivers removing all brand names"`);
}
