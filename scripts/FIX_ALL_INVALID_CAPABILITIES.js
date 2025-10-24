#!/usr/bin/env node

/**
 * FIX ALL INVALID CAPABILITIES v4.0.0
 * Remplace toutes les capabilities invalides par équivalents SDK3
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIX ALL INVALID CAPABILITIES v4.0.0\n');

const rootDir = path.join(__dirname, '..');
const driversDir = path.join(rootDir, 'drivers');

// Mapping: capability invalide → capability SDK3 valide (ou null pour supprimer)
const capabilityReplacements = {
  // Buttons - pas de capability standard, utiliser flow triggers
  'alarm_button': null,
  'alarm_button.pressed': null,
  
  // Generic sensors - remplacer par équivalents standards
  'alarm_generic': 'alarm_generic',
  'sensor_generic': null,
  
  // Formaldehyde - pas de capability standard
  'measure_formaldehyde': null,
  'meter_formaldehyde': null,
  
  // VOC - utiliser air quality
  'measure_voc': 'measure_co2', // Approximation
  'measure_tvoc': 'measure_co2',
  
  // Autres invalides courantes
  'measure_pm1': null,
  'measure_pm10': null,
  'measure_noise': null
};

const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let fixedCount = 0;
const fixedDrivers = [];

drivers.forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    let compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    let modified = false;
    
    if (compose.capabilities && Array.isArray(compose.capabilities)) {
      const originalCaps = [...compose.capabilities];
      const newCaps = [];
      
      for (const cap of compose.capabilities) {
        const capName = typeof cap === 'string' ? cap : cap.id;
        
        if (capabilityReplacements.hasOwnProperty(capName)) {
          const replacement = capabilityReplacements[capName];
          
          if (replacement === null) {
            // Supprimer la capability
            console.log(`   ❌ ${driverName}: Removed invalid '${capName}'`);
            modified = true;
          } else if (replacement !== capName) {
            // Remplacer par équivalent
            console.log(`   🔄 ${driverName}: Replaced '${capName}' → '${replacement}'`);
            newCaps.push(typeof cap === 'string' ? replacement : { ...cap, id: replacement });
            modified = true;
          } else {
            newCaps.push(cap);
          }
        } else {
          newCaps.push(cap);
        }
      }
      
      if (modified) {
        compose.capabilities = newCaps;
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        fixedCount++;
        fixedDrivers.push(driverName);
        console.log(`✅ ${driverName}`);
      }
    }
    
  } catch (err) {
    console.log(`❌ ${driverName} - ERROR: ${err.message}`);
  }
});

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         FIX INVALID CAPABILITIES - TERMINÉ                    ║
╚═══════════════════════════════════════════════════════════════╝

📊 Résultats:
   Drivers corrigés:      ${fixedCount}
   Total drivers:         ${drivers.length}

✅ Capabilities invalides remplacées ou supprimées!

Drivers modifiés:
${fixedDrivers.map(d => `   - ${d}`).join('\n')}
`);
