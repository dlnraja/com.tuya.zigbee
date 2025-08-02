const fs = require('fs');
const path = require('path');

console.log('🧪 Test des nouveaux drivers implémentés...');

const driversDir = path.join(__dirname, 'drivers', 'tuya');
const drivers = fs.readdirSync(driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

console.log('📦 Drivers trouvés: ' + drivers.length);

for (const driver of drivers) {
    const composePath = path.join(driversDir, driver, 'driver.compose.json');
    const devicePath = path.join(driversDir, driver, 'device.js');
    
    if (fs.existsSync(composePath) && fs.existsSync(devicePath)) {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        console.log(`✅ ${driver}: ${compose.name.en}`);
        console.log(`   Capabilities: ${compose.capabilities.join(', ')}`);
        console.log(`   Clusters: ${compose.clusters.join(', ')}`);
    } else {
        console.log(`❌ ${driver}: Fichiers manquants`);
    }
}

console.log('🎉 Test terminé!');