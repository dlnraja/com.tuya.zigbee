const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

console.log('Liste des dossiers dans le répertoire des drivers:');

try {
  const items = fs.readdirSync(driversDir, { withFileTypes: true });
  
  items.forEach(item => {
    if (item.isDirectory()) {
      const driverPath = path.join(driversDir, item.name);
      const configPath = path.join(driverPath, 'driver.compose.json');
      const hasConfig = fs.existsSync(configPath);
      
      console.log(`\n📁 ${item.name}:`);
      console.log(`   - Chemin: ${driverPath}`);
      console.log(`   - Fichier de configuration: ${hasConfig ? '✅' : '❌'}`);
      
      if (hasConfig) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          console.log(`   - Nom: ${config.name?.en || 'Non défini'}`);
          console.log(`   - ID: ${config.id || 'Non défini'}`);
          console.log(`   - Capabilités: ${config.capabilities?.join(', ') || 'Aucune'}`);
        } catch (error) {
          console.error(`   ❌ Erreur de lecture du fichier de configuration: ${error.message}`);
        }
      }
    }
  });
  
  console.log('\nAnalyse terminée.');
  
} catch (error) {
  console.error('Erreur lors de la lecture du répertoire des drivers:', error.message);
}
