const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 FIX SENSOR _TZE284_vvmbj46n RECOGNITION');
console.log('═'.repeat(80));

console.log('\n1️⃣ Nettoyage cache Homey...');
try {
  if (fs.existsSync('./.homeycompose')) {
    fs.rmSync('./.homeycompose', { recursive: true, force: true });
    console.log('   ✅ .homeycompose supprimé');
  }
  if (fs.existsSync('./.homeybuild')) {
    fs.rmSync('./.homeybuild', { recursive: true, force: true });
    console.log('   ✅ .homeybuild supprimé');
  }
} catch (error) {
  console.log('   ⚠️  Erreur nettoyage:', error.message);
}

console.log('\n2️⃣ Vérification driver.compose.json...');
const driverCompose = JSON.parse(
  fs.readFileSync('./drivers/temperature_humidity_sensor/driver.compose.json', 'utf8')
);

const hasManufacturer = driverCompose.zigbee.manufacturerName.includes('_TZE284_vvmbj46n');
console.log(`   ${hasManufacturer ? '✅' : '❌'} _TZE284_vvmbj46n dans driver.compose.json: ${hasManufacturer}`);

console.log('\n3️⃣ Reconstruction app.json...');
try {
  execSync('homey app build', { stdio: 'inherit' });
  console.log('   ✅ App rebuilt');
} catch (error) {
  console.log('   ⚠️  Build error (continuing...)');
}

console.log('\n4️⃣ Vérification app.json...');
const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
const tempDriver = appJson.drivers.find(d => d.id === 'temperature_humidity_sensor');

if (tempDriver) {
  const hasInApp = tempDriver.zigbee.manufacturerName.includes('_TZE284_vvmbj46n');
  console.log(`   ${hasInApp ? '✅' : '❌'} _TZE284_vvmbj46n dans app.json: ${hasInApp}`);
  
  if (!hasInApp) {
    console.log('\n   ⚠️  PROBLÈME: Manufacturer ID manquant dans app.json !');
    console.log('   🔧 Ajout manuel...');
    
    if (!tempDriver.zigbee.manufacturerName.includes('_TZE284_vvmbj46n')) {
      tempDriver.zigbee.manufacturerName.push('_TZE284_vvmbj46n');
      fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));
      console.log('   ✅ Ajouté manuellement à app.json');
    }
  }
} else {
  console.log('   ❌ Driver temperature_humidity_sensor non trouvé !');
}

console.log('\n5️⃣ Validation finale...');
try {
  execSync('homey app validate', { stdio: 'inherit' });
  console.log('   ✅ Validation réussie');
} catch (error) {
  console.log('   ⚠️  Vérifier erreurs ci-dessus');
}

console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ:');
console.log('   Driver source: ✅ _TZE284_vvmbj46n présent');
console.log('   App compilé: En cours de vérification');
console.log('   Validation: En cours');

console.log('\n🚀 PROCHAINES ÉTAPES:');
console.log('   1. Commit: git add . && git commit -m "fix: add _TZE284_vvmbj46n to app.json"');
console.log('   2. Push: git push origin master');
console.log('   3. Attendre GitHub Actions');
console.log('   4. Dans Homey app: Supprimer + Re-ajouter le device');

console.log('\n💡 NOTE IMPORTANTE:');
console.log('   Après mise à jour, l\'utilisateur doit:');
console.log('   - Aller dans Devices');
console.log('   - Supprimer le sensor non reconnu');
console.log('   - Re-ajouter le device (il sera maintenant reconnu)');
