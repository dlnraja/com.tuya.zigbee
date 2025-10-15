const fs = require('fs');

console.log('🗑️  Suppression déclarations images drivers dans app.json\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
let removed = 0;

// Pour chaque driver
for (const [driverName, driver] of Object.entries(appJson.drivers || {})) {
  if (driver.images) {
    // Supprimer la déclaration images du driver
    // Homey utilisera automatiquement /drivers/*/assets/images/
    delete driver.images;
    removed++;
  }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log(`✅ ${removed} déclarations images supprimées\n`);
console.log('Homey utilisera maintenant /drivers/*/assets/images/ automatiquement\n');
