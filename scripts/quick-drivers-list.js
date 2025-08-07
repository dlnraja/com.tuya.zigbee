const fs = require('fs');
const path = require('path');

console.log('🚀 LISTAGE RAPIDE DES DRIVERS');

function listDrivers(dir, type) {
    const drivers = [];
    
    function scanDirectory(currentDir, category) {
        if (!fs.existsSync(currentDir)) return;
        
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Vérifier si c'est un driver
                const hasDeviceJs = fs.existsSync(path.join(fullPath, 'device.js'));
                const hasDriverJs = fs.existsSync(path.join(fullPath, 'driver.js'));
                const hasComposeJson = fs.existsSync(path.join(fullPath, 'driver.compose.json'));
                
                if (hasDeviceJs || hasDriverJs || hasComposeJson) {
                    drivers.push({
                        name: item,
                        path: fullPath,
                        type: type,
                        category: category,
                        files: {
                            deviceJs: hasDeviceJs,
                            driverJs: hasDriverJs,
                            composeJson: hasComposeJson
                        }
                    });
                } else {
                    // Continuer à scanner
                    scanDirectory(fullPath, item);
                }
            }
        }
    }
    
    scanDirectory(dir, 'root');
    return drivers;
}

// Scanner les drivers
console.log('\n🔍 SCANNING DRIVERS TUYA...');
const tuyaDrivers = listDrivers('drivers/tuya', 'tuya');

console.log('\n🔍 SCANNING DRIVERS ZIGBEE...');
const zigbeeDrivers = listDrivers('drivers/zigbee', 'zigbee');

// Afficher les résultats
console.log('\n📊 RÉSULTATS DU SCAN');
console.log('=' .repeat(40));

console.log(`\n🔌 DRIVERS TUYA (${tuyaDrivers.length}):`);
for (const driver of tuyaDrivers) {
    const status = driver.files.deviceJs && driver.files.driverJs && driver.files.composeJson ? '✅' : '⚠️';
    console.log(`  ${status} ${driver.name} (${driver.category})`);
}

console.log(`\n📡 DRIVERS ZIGBEE (${zigbeeDrivers.length}):`);
for (const driver of zigbeeDrivers) {
    const status = driver.files.deviceJs && driver.files.driverJs && driver.files.composeJson ? '✅' : '⚠️';
    console.log(`  ${status} ${driver.name} (${driver.category})`);
}

console.log(`\n📈 TOTAL: ${tuyaDrivers.length + zigbeeDrivers.length} drivers`);

// Statistiques par catégorie
const tuyaByCategory = {};
const zigbeeByCategory = {};

for (const driver of tuyaDrivers) {
    tuyaByCategory[driver.category] = (tuyaByCategory[driver.category] || 0) + 1;
}

for (const driver of zigbeeDrivers) {
    zigbeeByCategory[driver.category] = (zigbeeByCategory[driver.category] || 0) + 1;
}

console.log('\n📁 RÉPARTITION PAR CATÉGORIE:');
console.log('\n🔌 TUYA:');
for (const [category, count] of Object.entries(tuyaByCategory)) {
    console.log(`  - ${category}: ${count} drivers`);
}

console.log('\n📡 ZIGBEE:');
for (const [category, count] of Object.entries(zigbeeByCategory)) {
    console.log(`  - ${category}: ${count} drivers`);
}

console.log('\n✅ LISTAGE TERMINÉ'); 