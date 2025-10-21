#!/usr/bin/env node

/**
 * AJOUT SETTING BATTERY TYPE
 * 
 * Ajoute un setting dropdown pour que l'utilisateur choisisse
 * le type de batterie utilisé dans son device
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(f => 
  fs.statSync(path.join(driversDir, f)).isDirectory()
);

console.log('\n⚙️  AJOUT SETTING BATTERY TYPE\n');

let updated = 0;
let skipped = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const batteries = driver.energy?.batteries || [];
    
    // Skip si pas multi-battery
    if (batteries.length <= 1) {
      skipped++;
      continue;
    }
    
    // Vérifier si setting existe déjà
    const settings = driver.settings || [];
    if (settings.some(s => s.id === 'battery_type')) {
      console.log(`⏭️  ${driverId}: Battery type setting already exists`);
      skipped++;
      continue;
    }
    
    // Créer setting
    const batterySetting = {
      id: 'battery_type',
      type: 'dropdown',
      label: {
        en: 'Battery Type',
        fr: 'Type de batterie',
        nl: 'Batterijtype',
        de: 'Batterietyp'
      },
      hint: {
        en: 'Select the type of battery used in this device for accurate battery level calculation',
        fr: 'Sélectionnez le type de batterie utilisé pour un calcul précis du niveau',
        nl: 'Selecteer het type batterij voor nauwkeurige niveauberekening',
        de: 'Wählen Sie den Batterietyp für genaue Füllstandsberechnung'
      },
      value: batteries[0], // Default = premier type
      values: batteries.map(battery => ({
        id: battery,
        label: {
          en: getBatteryLabel(battery),
          fr: getBatteryLabel(battery),
          nl: getBatteryLabel(battery),
          de: getBatteryLabel(battery)
        }
      }))
    };
    
    // Ajouter au début des settings
    driver.settings = driver.settings || [];
    driver.settings.unshift(batterySetting);
    
    // Sauvegarder
    fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n');
    
    console.log(`✅ ${driverId}`);
    console.log(`   Batteries: ${batteries.join(', ')}`);
    console.log(`   Default: ${batteries[0]}`);
    updated++;
    
  } catch (err) {
    console.error(`❌ Error: ${driverId}:`, err.message);
  }
}

function getBatteryLabel(battery) {
  const labels = {
    'CR2032': 'CR2032 (3V Button Cell)',
    'CR2450': 'CR2450 (3V Button Cell - Large)',
    'CR123A': 'CR123A (3V Cylindrical)',
    'AAA': 'AAA (1.5V × 2 = 3V)',
    'AA': 'AA (1.5V × 2 = 3V)',
    'INTERNAL': 'Internal Rechargeable',
    'OTHER': 'Other'
  };
  
  return labels[battery] || battery;
}

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`\n✅ Terminé\n`);
