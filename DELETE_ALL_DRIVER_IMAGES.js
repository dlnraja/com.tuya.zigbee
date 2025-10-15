const fs = require('fs');
const path = require('path');

console.log('🗑️  SUPPRESSION de TOUTES les images personnalisées drivers\n');
console.log('   Homey utilisera icon.svg par défaut\n');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath).filter(d => 
  fs.statSync(path.join(driversPath, d)).isDirectory()
);

let deleted = 0;

drivers.forEach(driver => {
  const imagesPath = path.join(driversPath, driver, 'assets', 'images');
  
  if (fs.existsSync(imagesPath)) {
    try {
      fs.rmSync(imagesPath, { recursive: true, force: true });
      console.log(`  ✓ ${driver}`);
      deleted++;
    } catch (err) {
      console.error(`  ✗ ${driver}: ${err.message}`);
    }
  }
});

console.log(`\n✅ ${deleted} dossiers /drivers/*/assets/images/ supprimés`);
console.log('   Homey utilisera icon.svg de chaque driver\n');
