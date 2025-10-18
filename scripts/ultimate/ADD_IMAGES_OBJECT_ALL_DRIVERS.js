const fs = require('fs');
const path = require('path');

console.log('🖼️  AJOUT OBJET IMAGES À TOUS LES DRIVERS\n');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
);

let added = 0;
let skipped = 0;

for (const driverName of drivers) {
  const composeJsonPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    skipped++;
    continue;
  }
  
  try {
    const driver = JSON.parse(fs.readFileSync(composeJsonPath, 'utf8'));
    
    // Vérifier si images object existe déjà ET est correct
    const needsUpdate = !driver.images || 
                        !driver.images.small || 
                        !driver.images.large || 
                        !driver.images.xlarge ||
                        !driver.images.small.includes('/assets/images/') ||
                        !driver.images.large.includes('/assets/images/') ||
                        !driver.images.xlarge.includes('/assets/images/');
    
    if (needsUpdate) {
      // Ajouter ou corriger objet images
      driver.images = {
        small: `./assets/images/small.png`,
        large: `./assets/images/large.png`,
        xlarge: `./assets/images/xlarge.png`
      };
      
      fs.writeFileSync(composeJsonPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
      console.log(`✅ ${driverName}`);
      added++;
    } else {
      skipped++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverName}: ${err.message}`);
  }
}

console.log(`\n📊 Ajouté: ${added}, Skipped: ${skipped}\n`);
console.log('🎉 Done!');
