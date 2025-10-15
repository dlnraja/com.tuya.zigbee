const fs = require('fs');
const path = require('path');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath).filter(d => 
  fs.statSync(path.join(driversPath, d)).isDirectory()
);

console.log(`🔍 Vérification ${drivers.length} drivers...\n`);

let missing = [];

drivers.forEach(driver => {
  const smallPath = path.join(driversPath, driver, 'assets', 'images', 'small.png');
  const largePath = path.join(driversPath, driver, 'assets', 'images', 'large.png');
  
  if (!fs.existsSync(smallPath) || !fs.existsSync(largePath)) {
    missing.push(driver);
  }
});

if (missing.length === 0) {
  console.log('✅ TOUS les drivers ont leurs images personnalisées!');
  console.log(`   ${drivers.length} drivers × 2 images = ${drivers.length * 2} images OK\n`);
} else {
  console.log(`❌ ${missing.length} drivers sans images:`);
  missing.forEach(d => console.log(`   - ${d}`));
  console.log();
}

fs.unlinkSync(__filename);
