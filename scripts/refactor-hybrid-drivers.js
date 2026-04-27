// scripts/refactor-hybrid-drivers.js
// Suppression du suffixe _hybrid des dossiers de drivers
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔄 Refactoring drivers: suppression du suffixe _hybrid...');

const driversDir = path.join(__dirname, '..', 'drivers');

if (!fs.existsSync(driversDir)) {
  console.log('❌ Dossier drivers/ non trouvé');
  process.exit(1);
}

let renamed = 0;
let errors = 0;

fs.readdirSync(driversDir).forEach(item => {
  const itemPath = path.join(driversDir, item);
  
  if (!fs.statSync(itemPath).isDirectory()) return;
  if (!item.endsWith('_hybrid')) return;
  
  const newName = item.replace(/_hybrid$/, '');
  const newPath = path.join(driversDir, newName);
  
  try {
    fs.renameSync(itemPath, newPath);
    console.log(`📁 ${item} → ${newName}`);
    renamed++;
    
    // Mettre à jour driver.json si présent
    const driverJson = path.join(newPath, 'driver.json');
    if (fs.existsSync(driverJson)) {
      const driver = JSON.parse(fs.readFileSync(driverJson, 'utf8'));
      if (driver.id && driver.id.endsWith('_hybrid')) {
        driver.id = driver.id.replace(/_hybrid$/, '');
        fs.writeFileSync(driverJson, JSON.stringify(driver, null, 2) + '\n');
        console.log(`  📝 driver.json mis à jour: ${driver.id}`);
      }
    }
  } catch (err) {
    console.log(`❌ Erreur pour ${item}: ${err.message}`);
    errors++;
  }
});

console.log(`\n✅ Refactorisation terminée`);
console.log(`   Renommés: ${renamed}`);
console.log(`   Erreurs: ${errors}`);
console.log('\n📋 Prochaines étapes:');
console.log('   1. bash scripts/validate-all.sh');
console.log('   2. git add . && git commit -m "refactor: remove _hybrid suffix"');
console.log('   3. git push');
