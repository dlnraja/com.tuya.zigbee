const fs = require('fs');

console.log('🔧 Suppression déclarations images de TOUS les drivers\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
let removed = 0;

// Supprimer "images" de chaque driver
for (const [driverName, driver] of Object.entries(appJson.drivers || {})) {
  if (driver.images) {
    delete driver.images;
    removed++;
    console.log(`  ✓ ${driverName}`);
  }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));

console.log(`\n✅ ${removed} drivers - images déclarations supprimées`);
console.log('   Homey utilisera /drivers/*/assets/images/ automatiquement\n');
console.log('⚠️  NOTE: Si validation échoue avec "images required",');
console.log('   cela signifie que Homey SDK3 FORCE les déclarations\n');
