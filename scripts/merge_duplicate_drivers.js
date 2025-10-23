#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 MERGE DES DRIVERS DOUBLONS\n');

const driversDir = path.join(__dirname, '..', 'drivers');

// PLAN DE MERGE
const merges = [
  {
    keep: 'button_wireless_2',
    remove: 'button_wireless_2gang',
    reason: 'button_wireless_2gang contient "Lonsonho" (marque)'
  },
  {
    keep: 'switch_wireless_4gang',
    remove: 'switch_wireless_4button',
    reason: 'Nomenclature: _gang plus cohérente pour switches'
  }
];

merges.forEach(merge => {
  console.log(`📍 MERGE: ${merge.remove} → ${merge.keep}`);
  console.log(`   Raison: ${merge.reason}\n`);
  
  const keepPath = path.join(driversDir, merge.keep, 'driver.compose.json');
  const removePath = path.join(driversDir, merge.remove, 'driver.compose.json');
  
  if (!fs.existsSync(keepPath) || !fs.existsSync(removePath)) {
    console.log(`   ⚠️  Fichiers manquants, skip\n`);
    return;
  }
  
  try {
    const keepDriver = JSON.parse(fs.readFileSync(keepPath, 'utf8'));
    const removeDriver = JSON.parse(fs.readFileSync(removePath, 'utf8'));
    
    // Merger les manufacturer names
    if (removeDriver.zigbee && removeDriver.zigbee.manufacturerName) {
      if (!keepDriver.zigbee) keepDriver.zigbee = {};
      if (!keepDriver.zigbee.manufacturerName) keepDriver.zigbee.manufacturerName = [];
      
      // Ajouter les nouveaux sans doublons
      const existing = new Set(keepDriver.zigbee.manufacturerName);
      let added = 0;
      
      removeDriver.zigbee.manufacturerName.forEach(name => {
        if (!existing.has(name)) {
          keepDriver.zigbee.manufacturerName.push(name);
          existing.add(name);
          added++;
        }
      });
      
      console.log(`   ✅ ${added} manufacturer names ajoutés`);
    }
    
    // Merger les productIDs
    if (removeDriver.zigbee && removeDriver.zigbee.productId) {
      if (!keepDriver.zigbee) keepDriver.zigbee = {};
      if (!keepDriver.zigbee.productId) keepDriver.zigbee.productId = [];
      
      const existing = new Set(keepDriver.zigbee.productId);
      let added = 0;
      
      removeDriver.zigbee.productId.forEach(id => {
        if (!existing.has(id)) {
          keepDriver.zigbee.productId.push(id);
          existing.add(id);
          added++;
        }
      });
      
      console.log(`   ✅ ${added} product IDs ajoutés`);
    }
    
    // Sauvegarder le driver mergé
    const backupPath = keepPath + '.backup.' + Date.now();
    fs.copyFileSync(keepPath, backupPath);
    fs.writeFileSync(keepPath, JSON.stringify(keepDriver, null, 2), 'utf8');
    
    console.log(`   ✅ ${merge.keep} mis à jour`);
    console.log(`   💾 Backup: ${path.basename(backupPath)}`);
    
    // Renommer le dossier à supprimer
    const removeDir = path.join(driversDir, merge.remove);
    const archiveDir = path.join(driversDir, '.' + merge.remove + '.archived');
    
    if (fs.existsSync(removeDir)) {
      fs.renameSync(removeDir, archiveDir);
      console.log(`   🗑️  ${merge.remove} archivé (${archiveDir})`);
    }
    
  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
  }
  
  console.log('');
});

console.log('='.repeat(70));
console.log('✅ MERGE TERMINÉ');
console.log('='.repeat(70));
console.log('\n💡 PROCHAINES ÉTAPES:');
console.log('   1. homey app build');
console.log('   2. homey app validate --level publish');
console.log('   3. git add -A');
console.log('   4. git commit -m "fix: merge duplicate drivers and remove brand names"');
