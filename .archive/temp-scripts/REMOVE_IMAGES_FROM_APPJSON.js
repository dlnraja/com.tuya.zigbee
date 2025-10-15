const fs = require('fs');

console.log('🗑️  SUPPRESSION déclarations images drivers de app.json\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

let removed = 0;
for (const [driverName, driver] of Object.entries(appJson.drivers || {})) {
  if (driver.images) {
    delete driver.images;
    removed++;
  }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));

console.log(`✅ ${removed} déclarations supprimées`);
console.log('   Homey trouvera automatiquement: /drivers/*/assets/images/\n');
console.log('⚠️  NOTE: Cette solution contourne le conflit SDK3\n');
