const fs = require('fs');
const path = require('path');

// Configuration
const DRIVER_PATH = path.join(__dirname, 'drivers', 'plugs-TS011F');

// Fonction pour analyser un driver
function analyzeDriver(driverPath) {
  console.log(`\n🔍 Analyse du driver: ${path.basename(driverPath)}`);
  
  // Vérifier la structure du dossier
  console.log('\n📂 Structure du dossier:');
  const items = fs.readdirSync(driverPath, { withFileTypes: true });
  items.forEach(item => {
    console.log(`- ${item.name} (${item.isDirectory() ? 'dossier' : 'fichier'})`);
  });
  
  // Vérifier le fichier de configuration
  const configPath = path.join(driverPath, 'driver.compose.json');
  if (fs.existsSync(configPath)) {
    try {
      console.log('\n⚙️  Fichier de configuration trouvé');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      console.log('\n📋 Configuration:');
      console.log(`- ID: ${config.id || 'Non défini'}`);
      console.log(`- Nom: ${JSON.stringify(config.name || {})}`);
      console.log(`- Classe: ${config.class || 'Non définie'}`);
      console.log(`- Capabilités: ${JSON.stringify(config.capabilities || [])}`);
      
      if (config.zigbee) {
        console.log('\n📡 Configuration Zigbee:');
        console.log(`- Fabricant: ${JSON.stringify(config.zigbee.manufacturerName || [])}`);
        console.log(`- ID Produit: ${JSON.stringify(config.zigbee.productId || [])}`);
        
        if (config.zigbee.endpoints) {
          console.log('Endpoints:');
          Object.entries(config.zigbee.endpoints).forEach(([endpoint, clusters]) => {
            console.log(`  - ${endpoint}: ${JSON.stringify(clusters)}`);
          });
        }
      }
      
      // Vérifier les icônes
      if (config.images) {
        console.log('\n🖼️  Icônes:');
        ['small', 'large'].forEach(size => {
          const iconPath = path.join(driverPath, config.images[size] || '');
          const exists = fs.existsSync(iconPath);
          console.log(`- ${size}: ${config.images[size]} (${exists ? '✅' : '❌'})`);
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du fichier de configuration:', error.message);
      return false;
    }
  } else {
    console.error('❌ Fichier de configuration introuvable');
    return false;
  }
}

// Vérifier si le dossier du driver existe
if (fs.existsSync(DRIVER_PATH)) {
  console.log(`\n🚀 Début de l'analyse du driver: ${DRIVER_PATH}`);
  analyzeDriver(DRIVER_PATH);
} else {
  console.error(`❌ Le dossier du driver est introuvable: ${DRIVER_PATH}`);
  console.log('\n📌 Liste des drivers disponibles:');
  
  const driversDir = path.join(__dirname, 'drivers');
  fs.readdirSync(driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .forEach(dirent => {
      console.log(`- ${dirent.name}`);
    });
}
