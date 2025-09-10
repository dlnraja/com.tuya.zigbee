#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Nouvelle structure de dossiers
const categories = {
  'switch': 'switches',
  'sensor': 'sensors',
  'light': 'lights',
  'plug': 'plugs',
  'cover': 'covers',
  'thermostat': 'thermostats',
  'remote': 'remotes'
};

async function migrateDrivers() {
  const driversPath = path.join(__dirname, '..', 'drivers');
  
  // Parcourir tous les dossiers de drivers
  const driverDirs = fs.readdirSync(driversPath)
    .filter(file => fs.statSync(path.join(driversPath, file)).isDirectory());

  for (const dir of driverDirs) {
    const driverPath = path.join(driversPath, dir);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (fs.existsSync(composePath)) {
      const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const deviceType = composeData.deviceType || 'other';
      
      // Déterminer la catégorie
      let category = 'other';
      for (const [key, value] of Object.entries(categories)) {
        if (deviceType.includes(key)) {
          category = value;
          break;
        }
      }
      
      // Créer le dossier de catégorie si nécessaire
      const categoryPath = path.join(driversPath, category);
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath);
      }
      
      // Déplacer le driver dans la catégorie
      const newDriverPath = path.join(categoryPath, dir);
      if (!fs.existsSync(newDriverPath)) {
        fs.renameSync(driverPath, newDriverPath);
        console.log(`Déplacé ${dir} vers ${category}`);
      }
    }
  }
}

migrateDrivers().catch(console.error);
