#!/usr/bin/env node
'use strict';

/**
 * FIX BATTERY ENERGY CONFIGURATION
 * 
 * Ajoute energy.batteries pour tous les drivers avec measure_battery
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 RECHERCHE DES DRIVERS AVEC measure_battery SANS energy\n');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath);

let fixed = 0;
let skipped = 0;
let errors = 0;

for (const driver of drivers) {
  const driverPath = path.join(driversPath, driver);
  const composeJsonPath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    continue;
  }
  
  try {
    const content = fs.readFileSync(composeJsonPath, 'utf8');
    const json = JSON.parse(content);
    
    // Vérifier si le driver a measure_battery
    const hasMeasureBattery = json.capabilities && json.capabilities.includes('measure_battery');
    
    if (!hasMeasureBattery) {
      continue;
    }
    
    // Vérifier si energy.batteries existe déjà
    if (json.energy && json.energy.batteries) {
      skipped++;
      continue;
    }
    
    // Ajouter energy.batteries
    if (!json.energy) {
      json.energy = {};
    }
    
    // Déterminer le type de batterie depuis le nom du driver
    let batteryType = 'OTHER';
    if (driver.includes('cr2032') || driver.includes('CR2032')) {
      batteryType = 'CR2032';
    } else if (driver.includes('cr2450') || driver.includes('CR2450')) {
      batteryType = 'CR2450';
    } else if (driver.includes('cr123') || driver.includes('CR123')) {
      batteryType = 'CR123A';
    } else if (driver.includes('aa') || driver.includes('AA')) {
      batteryType = 'AA';
    } else if (driver.includes('aaa') || driver.includes('AAA')) {
      batteryType = 'AAA';
    }
    
    json.energy.batteries = [batteryType];
    
    // Sauvegarder avec formatage propre
    fs.writeFileSync(composeJsonPath, JSON.stringify(json, null, 2) + '\n');
    
    console.log(`✅ Fixé: ${driver} (${batteryType})`);
    fixed++;
    
  } catch (err) {
    console.error(`❌ Erreur pour ${driver}:`, err.message);
    errors++;
  }
}

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   Drivers avec battery: ${fixed + skipped}`);
console.log(`   Déjà configurés: ${skipped}`);
console.log(`   Corrigés: ${fixed}`);
console.log(`   Erreurs: ${errors}`);

if (fixed > 0) {
  console.log(`\n✅ ${fixed} DRIVERS CORRIGÉS!`);
  process.exit(0);
} else if (errors > 0) {
  console.log('\n⚠️  Certains drivers ont des erreurs');
  process.exit(1);
} else {
  console.log('\n✅ AUCUNE CORRECTION NÉCESSAIRE!');
  process.exit(0);
}
