#!/usr/bin/env node

/**
 * ANALYZE BATTERY TYPES IN ALL DRIVERS
 * Pour identifier et séparer intelligemment par type de batterie
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(f => 
  fs.statSync(path.join(driversDir, f)).isDirectory()
);

const batteryTypes = {};
const noBattery = [];
const multipleBatteries = [];

drivers.forEach(driverId => {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    const hasBattery = (driver.capabilities || []).includes('measure_battery') || 
                      (driver.capabilities || []).includes('alarm_battery');
    
    if (!hasBattery) {
      noBattery.push(driverId);
      return;
    }
    
    const batteries = driver.energy?.batteries || [];
    
    if (batteries.length === 0) {
      // Has battery capability but no energy.batteries defined
      if (!batteryTypes['UNKNOWN']) batteryTypes['UNKNOWN'] = [];
      batteryTypes['UNKNOWN'].push({
        id: driverId,
        name: driver.name?.en || driverId,
        issue: 'Missing energy.batteries'
      });
      return;
    }
    
    if (batteries.length > 1) {
      multipleBatteries.push({
        id: driverId,
        batteries: batteries
      });
    }
    
    batteries.forEach(battery => {
      const batteryType = battery.toUpperCase();
      if (!batteryTypes[batteryType]) {
        batteryTypes[batteryType] = [];
      }
      batteryTypes[batteryType].push({
        id: driverId,
        name: driver.name?.en || driverId,
        allBatteries: batteries
      });
    });
    
  } catch (err) {
    console.error(`Error reading ${driverId}:`, err.message);
  }
});

console.log('\n🔋 ANALYSE DES TYPES DE BATTERIE\n');
console.log(`Total drivers: ${drivers.length}`);
console.log(`Drivers avec batterie: ${drivers.length - noBattery.length}`);
console.log(`Drivers sans batterie: ${noBattery.length}\n`);

console.log('📊 DISTRIBUTION PAR TYPE DE BATTERIE:\n');
Object.entries(batteryTypes)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([type, driverList]) => {
    console.log(`${type}: ${driverList.length} drivers`);
    driverList.slice(0, 5).forEach(d => {
      console.log(`   - ${d.id} (${d.name})`);
      if (d.allBatteries && d.allBatteries.length > 1) {
        console.log(`     Multi: [${d.allBatteries.join(', ')}]`);
      }
    });
    if (driverList.length > 5) {
      console.log(`   ... (${driverList.length - 5} more)`);
    }
    console.log();
  });

if (multipleBatteries.length > 0) {
  console.log('\n⚠️  DRIVERS AVEC PLUSIEURS BATTERIES:\n');
  multipleBatteries.forEach(d => {
    console.log(`${d.id}: [${d.batteries.join(', ')}]`);
  });
}

// Générer proposition de séparation
console.log('\n\n💡 PROPOSITION DE SÉPARATION INTELLIGENTE:\n');

const separationStrategy = {
  'CR2032': {
    suffix: '_cr2032',
    description: 'Batterie bouton standard (petit)',
    typical: 'Capteurs compacts, télécommandes'
  },
  'CR2450': {
    suffix: '_cr2450',
    description: 'Batterie bouton large (plus grande capacité)',
    typical: 'Télécommandes multi-boutons'
  },
  'AA': {
    suffix: '_aa',
    description: 'Piles AA standards',
    typical: 'Capteurs avec affichage, longue autonomie'
  },
  'AAA': {
    suffix: '_aaa',
    description: 'Piles AAA standards',
    typical: 'Capteurs compacts avec bonne autonomie'
  },
  'CR123A': {
    suffix: '_cr123a',
    description: 'Pile cylindrique haute capacité',
    typical: 'Capteurs haute performance'
  },
  'CR2': {
    suffix: '_cr2',
    description: 'Pile cylindrique photo',
    typical: 'Caméras, capteurs haute consommation'
  }
};

Object.entries(batteryTypes).forEach(([type, driverList]) => {
  if (type === 'UNKNOWN') return;
  
  const strategy = separationStrategy[type] || {
    suffix: `_${type.toLowerCase()}`,
    description: `Batterie ${type}`,
    typical: 'Divers'
  };
  
  console.log(`${type} (${driverList.length} drivers):`);
  console.log(`   Suffix: ${strategy.suffix}`);
  console.log(`   Description: ${strategy.description}`);
  console.log(`   Usage: ${strategy.typical}`);
  
  // Exemples de renommage
  if (driverList.length > 0) {
    console.log('   Exemples:');
    driverList.slice(0, 3).forEach(d => {
      const newId = d.String(id).replace(/_battery$|_cr\d+$|_aa$|_aaa$/i, '') + strategy.suffix;
      if (newId !== d.id) {
        console.log(`      ${d.id} → ${newId}`);
      } else {
        console.log(`      ${d.id} (déjà OK)`);
      }
    });
  }
  console.log();
});

// Sauvegarder analyse
const outputPath = path.join(__dirname, 'BATTERY_TYPES_ANALYSIS.json');
fs.writeFileSync(outputPath, JSON.stringify({
  batteryTypes,
  noBattery,
  multipleBatteries,
  separationStrategy,
  stats: {
    totalDrivers: drivers.length,
    withBattery: drivers.length - noBattery.length,
    noBattery: noBattery.length,
    uniqueBatteryTypes: Object.keys(batteryTypes).length
  }
}, null, 2));

console.log(`\n✅ Analyse sauvegardée: ${outputPath}\n`);
