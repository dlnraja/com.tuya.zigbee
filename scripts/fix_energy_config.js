#!/usr/bin/env node
/**
 * FIX ENERGY CONFIGURATION
 * Vérifie et corrige les configurations energy.batteries
 * SDK3 requis: Si measure_battery capability → energy.batteries obligatoire
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');

let fixed = 0;
let errors = 0;
let warnings = 0;

const BATTERY_PATTERNS = {
  'cr2032': 'CR2032',
  'cr2450': 'CR2450',
  'cr123a': 'CR123A',
  'aaa': 'AAA',
  'aa': 'AA',
  'cr2477': 'CR2477',
  '18650': '18650',
  'internal': 'INTERNAL',
  'other': 'OTHER'
};

function detectBatteryType(driverName) {
  const name = driverName.toLowerCase();
  
  for (const [pattern, type] of Object.entries(BATTERY_PATTERNS)) {
    if (name.includes(pattern)) {
      return type;
    }
  }
  
  return 'CR2032'; // default
}

function fixEnergyConfig(filePath, driverName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);
    
    const hasMeasureBattery = (config.capabilities || []).includes('measure_battery');
    const hasEnergyBatteries = config.energy?.batteries && config.energy.batteries.length > 0;
    
    // Cas 1: measure_battery SANS energy.batteries
    if (hasMeasureBattery && !hasEnergyBatteries) {
      console.log(`\n⚠️  ${driverName}: measure_battery sans energy.batteries`);
      
      const batteryType = detectBatteryType(driverName);
      
      if (!config.energy) {
        config.energy = {};
      }
      
      config.energy.batteries = [batteryType];
      
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`   ✅ Ajouté: energy.batteries = ["${batteryType}"]`);
      fixed++;
      return true;
    }
    
    // Cas 2: energy.batteries SANS measure_battery (incohérent)
    if (!hasMeasureBattery && hasEnergyBatteries) {
      console.log(`\n⚠️  ${driverName}: energy.batteries sans measure_battery`);
      
      // Vérifier si c'est un device AC/DC
      const isAcDc = driverName.includes('_ac') || driverName.includes('_dc') || 
                     driverName.includes('plug') || driverName.includes('bulb');
      
      if (isAcDc) {
        // Retirer energy.batteries (pas de batterie)
        delete config.energy.batteries;
        if (Object.keys(config.energy).length === 0) {
          delete config.energy;
        }
        
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
        console.log(`   ✅ Retiré energy.batteries (device AC/DC)`);
        fixed++;
        return true;
      } else {
        // Ajouter measure_battery
        if (!config.capabilities) {
          config.capabilities = [];
        }
        config.capabilities.push('measure_battery');
        
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
        console.log(`   ✅ Ajouté measure_battery capability`);
        fixed++;
        return true;
      }
    }
    
    // Cas 3: Vérifier cohérence du type de batterie
    if (hasMeasureBattery && hasEnergyBatteries) {
      const detectedType = detectBatteryType(driverName);
      const currentType = config.energy.batteries[0];
      
      if (detectedType !== currentType && currentType !== 'OTHER' && detectedType !== 'CR2032') {
        console.log(`\n⚠️  ${driverName}: Type batterie incohérent`);
        console.log(`   Détecté: ${detectedType}, Config: ${currentType}`);
        
        config.energy.batteries = [detectedType];
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
        console.log(`   ✅ Corrigé: ${currentType} → ${detectedType}`);
        warnings++;
        return true;
      }
    }
    
    return false;
    
  } catch (err) {
    console.error(`\n❌ Erreur ${driverName}: ${err.message}`);
    errors++;
    return false;
  }
}

function scanDrivers() {
  console.log('🔍 Vérification configurations energy...\n');
  
  const drivers = fs.readdirSync(DRIVERS_PATH);
  
  drivers.forEach(driverName => {
    const driverPath = path.join(DRIVERS_PATH, driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (fs.existsSync(composePath)) {
      fixEnergyConfig(composePath, driverName);
    }
  });
}

// Exécution
console.log('═══════════════════════════════════════════════════');
console.log('  SDK3 ENERGY CONFIGURATION FIX');
console.log('═══════════════════════════════════════════════════\n');

scanDrivers();

console.log('\n═══════════════════════════════════════════════════');
console.log('  RÉSUMÉ:');
console.log(`  ✅ Configurations corrigées: ${fixed}`);
console.log(`  ⚠️  Avertissements: ${warnings}`);
console.log(`  ❌ Erreurs: ${errors}`);
console.log('═══════════════════════════════════════════════════\n');

if (fixed > 0) {
  console.log('✅ Configurations energy corrigées avec succès\n');
}

process.exit(errors > 0 ? 1 : 0);
