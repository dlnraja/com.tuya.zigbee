// QUICK FIX ULTIME
const fs = require('fs');

console.log('🚀 QUICK FIX DÉMARRÉ');

// Nettoyer cache
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

// IDs à ajouter
const IDS = ['_TZE284_uqfph8ah', '_TZE200_bjawzodf', '_TZ3000_26fmupbb'];

// Fixer drivers
const drivers = fs.readdirSync('drivers');
drivers.forEach(driver => {
    const file = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(file)) {
        const config = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        if (!config.zigbee) config.zigbee = {};
        if (!config.zigbee.manufacturerName) config.zigbee.manufacturerName = [];
        
        config.zigbee.manufacturerName.push(...IDS);
        
        if (!config.zigbee.endpoints) {
            config.zigbee.endpoints = {"1": {"clusters": [0,4,5,6]}};
        }
        
        fs.writeFileSync(file, JSON.stringify(config, null, 2));
    }
});

console.log('✅ QUICK FIX TERMINÉ');
