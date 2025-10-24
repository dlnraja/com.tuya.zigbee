#!/usr/bin/env node

/**
 * FIX MISSING ASSETS
 * Copie les assets manquants depuis des drivers similaires
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIX MISSING ASSETS\n');

const driversDir = path.join(__dirname, '..', 'drivers');

// Assets manquants identifiés
const missingAssets = {
  'aqara_motion_sensor_pir_basic_ac': ['large.png', 'small.png'],
  'aqara_motion_sensor_pir_basic_other': ['large.png', 'small.png'],
  'ikea_ikea_shortcut_button_other_other': ['large.png', 'small.png'],
  'ikea_ikea_sound_controller_other_other': ['large.png', 'small.png'],
  'ikea_wireless_switch_4button_other': ['large.png', 'small.png'],
  'tuya_air_conditioner_hybrid': ['large.png', 'small.png'],
  'tuya_dehumidifier_hybrid': ['large.png', 'small.png']
};

// Templates source
const templates = {
  motion: 'zemismart_motion_sensor_pir_basic_cr2032',
  button: 'zemismart_wireless_switch_4button_cr2032',
  climate: 'avatto_thermostat_aaa'
};

let fixed = 0;
let errors = 0;

for (const [driver, assets] of Object.entries(missingAssets)) {
  const driverPath = path.join(driversDir, driver);
  const assetsPath = path.join(driverPath, 'assets');
  
  // Créer dossier assets si nécessaire
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }
  
  // Déterminer template source
  let templateDriver = templates.climate; // default
  if (driver.includes('motion')) templateDriver = templates.motion;
  if (driver.includes('button') || driver.includes('switch')) templateDriver = templates.button;
  
  const templatePath = path.join(driversDir, templateDriver, 'assets');
  
  for (const asset of assets) {
    const sourcePath = path.join(templatePath, asset);
    const destPath = path.join(assetsPath, asset);
    
    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied: ${driver}/${asset}`);
        fixed++;
      } catch (err) {
        console.error(`❌ ${driver}/${asset}: ${err.message}`);
        errors++;
      }
    }
  }
}

console.log(`\n✅ Fixed: ${fixed} assets`);
console.log(`❌ Errors: ${errors}\n`);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           FIX MISSING ASSETS - TERMINÉ                        ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSULTATS:
   Assets fixés:     ${fixed}
   Erreurs:          ${errors}

✅ Assets manquants corrigés!
`);
