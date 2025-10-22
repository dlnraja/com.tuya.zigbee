const fs = require('fs');
const path = require('path');

// Chemin vers le dossier des pilotes
const driversDir = path.join(__dirname, '..', 'drivers');

// Fonction pour mettre à jour un fichier de pilote
function updateDriverFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const driver = JSON.parse(content);
    
    // Mettre à jour les métadonnées du pilote
    driver.metadata = driver.metadata || {};
    driver.metadata.app = {
      id: 'com.dlnraja.tuya.zigbee',
      name: 'Universal Tuya Zigbee',
      version: '4.1.3',
      api: {
        min: 3,
        max: 3
      }
    };
    
    // Sauvegarder les modifications
    fs.writeFileSync(filePath, JSON.stringify(driver, null, 2));
    console.log(`Updated: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Parcourir tous les dossiers de pilotes
function updateAllDrivers() {
  const driverDirs = fs.readdirSync(driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(driversDir, dirent.name));

  let updated = 0;
  let errors = 0;

  console.log(`Found ${driverDirs.length} driver directories`);
  
  for (const dir of driverDirs) {
    const driverFile = path.join(dir, 'driver.compose.json');
    if (fs.existsSync(driverFile)) {
      if (updateDriverFile(driverFile)) {
        updated++;
      } else {
        errors++;
      }
    }
  }

  console.log(`\nUpdate complete!`);
  console.log(`- Updated: ${updated} drivers`);
  console.log(`- Errors: ${errors} drivers`);
}

// Exécuter la mise à jour
updateAllDrivers();
