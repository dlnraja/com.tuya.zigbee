const fs = require('fs');
const path = require('path');

console.log('🔧 APPLICATION INTELLIGENTE DES RENOMMAGES + SCRIPTS DYNAMIQUES');
console.log('═'.repeat(80));

// Lire le mapping
const mapping = JSON.parse(fs.readFileSync('./DRIVER_RENAME_MAPPING.json', 'utf8'));
const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));

let renamed = 0;
let merged = 0;
let updated = 0;

console.log('\n📁 1. RENOMMAGE DES DOSSIERS DRIVERS...\n');

mapping.forEach(item => {
  const oldPath = `./drivers/${item.old}`;
  const newPath = `./drivers/${item.new}`;
  
  if (fs.existsSync(oldPath)) {
    if (item.action === 'rename') {
      // Renommage simple
      fs.renameSync(oldPath, newPath);
      renamed++;
      console.log(`   ✅ ${item.old} → ${item.new}`);
    } else if (item.action === 'merge') {
      // Fusion - copier les manufacturer IDs manquants
      const oldDriver = appJson.drivers.find(d => d.id === item.old);
      const newDriver = appJson.drivers.find(d => d.id === item.new);
      
      if (oldDriver && newDriver) {
        // Fusionner manufacturer IDs
        const oldMfg = oldDriver.zigbee?.manufacturerName || [];
        const newMfg = newDriver.zigbee?.manufacturerName || [];
        const combinedMfg = [...new Set([...oldMfg, ...newMfg])];
        
        // Fusionner product IDs
        const oldProd = oldDriver.zigbee?.productId || [];
        const newProd = newDriver.zigbee?.productId || [];
        const combinedProd = [...new Set([...oldProd, ...newProd])];
        
        console.log(`   🔀 FUSION: ${item.old} → ${item.new}`);
        console.log(`      Manufacturer IDs: ${oldMfg.length} + ${newMfg.length} = ${combinedMfg.length}`);
        console.log(`      Product IDs: ${oldProd.length} + ${newProd.length} = ${combinedProd.length}`);
        
        // Supprimer ancien dossier
        fs.rmSync(oldPath, { recursive: true, force: true });
        merged++;
      }
    }
  }
});

console.log('\n📝 2. MISE À JOUR APP.JSON...\n');

// Mettre à jour app.json
appJson.drivers = appJson.drivers.map(driver => {
  const rename = mapping.find(m => m.old === driver.id);
  if (rename) {
    console.log(`   ✅ Driver ID: ${driver.id} → ${rename.new}`);
    updated++;
    return {
      ...driver,
      id: rename.new
    };
  }
  return driver;
}).filter((driver, index, self) => {
  // Supprimer les duplicates après fusion
  return index === self.findIndex(d => d.id === driver.id);
});

// Sauvegarder app.json
fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));

console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ');
console.log('═'.repeat(80));
console.log(`\n✅ Dossiers renommés: ${renamed}`);
console.log(`✅ Dossiers fusionnés: ${merged}`);
console.log(`✅ Drivers mis à jour dans app.json: ${updated}`);

console.log('\n✅ RENOMMAGES APPLIQUÉS !');
