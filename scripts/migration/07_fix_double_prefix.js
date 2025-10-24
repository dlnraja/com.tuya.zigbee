#!/usr/bin/env node

/**
 * FIX DOUBLE PREFIX - Correction tuya_tuya_ → tuya_
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔧 FIX DOUBLE PREFIX - tuya_tuya_ → tuya_                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

const drivers = fs.readdirSync(driversDir);
const toFix = drivers.filter(d => d.startsWith('tuya_tuya_'));

console.log(`Trouvé ${toFix.length} drivers avec double préfixe\n`);

let renamed = 0;
let errors = 0;

for (const oldName of toFix) {
  const newName = String(oldName).replace('tuya_tuya_', 'tuya_');
  const oldPath = path.join(driversDir, oldName);
  const newPath = path.join(driversDir, newName);
  
  // Skip if target already exists
  if (fs.existsSync(newPath)) {
    console.log(`⏭️  Skip: ${newName} (already exists)`);
    // Remove the duplicate
    fs.rmSync(oldPath, { recursive: true, force: true });
    continue;
  }
  
  try {
    fs.renameSync(oldPath, newPath);
    
    // Fix ID in driver.compose.json
    const composePath = path.join(newPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      compose.id = newName;
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    }
    
    console.log(`✅ ${oldName} → ${newName}`);
    renamed++;
  } catch (err) {
    console.error(`❌ ${oldName}: ${err.message}`);
    errors++;
  }
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    CORRECTION TERMINÉE                        ║
╚═══════════════════════════════════════════════════════════════╝

✅ Renommés: ${renamed}
❌ Erreurs: ${errors}

Relancer build: homey app build
`);
