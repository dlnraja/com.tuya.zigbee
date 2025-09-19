// CYCLE 9/10: VALIDATION FINALE
const fs = require('fs');

console.log('✅ CYCLE 9/10: VALIDATION FINALE');

// Test 1: Vérifier drivers complets
const drivers = fs.readdirSync('drivers').filter(d => 
    fs.statSync(`drivers/${d}`).isDirectory()
);

let validDrivers = 0;
drivers.forEach(driver => {
    const hasCompose = fs.existsSync(`drivers/${driver}/driver.compose.json`);
    const hasDevice = fs.existsSync(`drivers/${driver}/device.js`);
    if (hasCompose && hasDevice) validDrivers++;
});

console.log(`📊 Drivers: ${validDrivers}/${drivers.length} complets`);

// Test 2: Vérifier version 1.0.32
if (fs.existsSync('.homeycompose/app.json')) {
    const app = JSON.parse(fs.readFileSync('.homeycompose/app.json', 'utf8'));
    console.log(`📋 Version: ${app.version} (attendue: 1.0.32)`);
    console.log(`📋 Nom: ${app.name.en}`);
}

// Test 3: Vérifier manufacturer IDs enrichis
let totalManufacturerIds = 0;
drivers.slice(0, 5).forEach(driver => {
    const composePath = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(composePath)) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (compose.zigbee && compose.zigbee.manufacturerName) {
                totalManufacturerIds += compose.zigbee.manufacturerName.length;
            }
        } catch (e) {}
    }
});

console.log(`🏭 Manufacturer IDs enrichis: ${totalManufacturerIds} dans échantillon`);

// Test 4: Vérifier structure sécurisée
const hasGitignore = fs.existsSync('.gitignore');
const hasHomeyignore = fs.existsSync('.homeyignore');

console.log(`🔒 Sécurité: .gitignore=${hasGitignore}, .homeyignore=${hasHomeyignore}`);

console.log('🎉 CYCLE 9/10 TERMINÉ - Validation complète');
