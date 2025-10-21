const fs = require('fs');
const path = require('path');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath).filter(d => 
  fs.statSync(path.join(driversPath, d)).isDirectory()
);

console.log(`🔍 ${drivers.length} drivers...\n`);

let missing = [];
drivers.forEach(driver => {
  const small = path.join(driversPath, driver, 'assets', 'images', 'small.png');
  const large = path.join(driversPath, driver, 'assets', 'images', 'large.png');
  
  if (!fs.existsSync(small) || !fs.existsSync(large)) {
    missing.push(driver);
  }
});

if (missing.length === 0) {
  console.log(`✅ ${drivers.length} drivers OK`);
} else {
  console.log(`❌ ${missing.length} manquants:`);
  missing.slice(0, 5).forEach(d => console.log(`   ${d}`));
}
