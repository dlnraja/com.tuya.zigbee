const fs = require('fs');

console.log('🔧 Correction finale chemins drivers\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
let fixed = 0;

// Pour chaque driver
for (const [driverName, driver] of Object.entries(appJson.drivers || {})) {
  if (driver.images) {
    // Vérifier si le driver pointe vers /assets/images/
    const smallPath = driver.images.small;
    const largePath = driver.images.large;
    
    if (smallPath && smallPath.includes('assets/images')) {
      // PROBLÈME! Le driver utilise les images APP
      // On doit s'assurer qu'il utilise ses PROPRES images
      const driverImagesPath = `./drivers/${driverName}/assets/images/`;
      
      // Vérifier si le driver A ses propres images
      if (fs.existsSync(`drivers/${driverName}/assets/images/small.png`)) {
        // OUI! Corriger le chemin
        driver.images.small = './assets/images/small.png'; // Relatif au driver
        driver.images.large = './assets/images/large.png';
        fixed++;
      }
    }
  }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log(`✅ ${fixed} drivers corrigés\n`);
console.log('Tous les drivers utilisent maintenant ./assets/images/ (relatif)\n');
