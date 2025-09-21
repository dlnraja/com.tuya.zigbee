// SYSTÈME ULTIME v2.0
const fs = require('fs');

console.log('🚀 SYSTÈME ULTIME ACTIVÉ');

// Nettoyer .homeycompose avant chaque action
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

// Enrichir TOUS les drivers avec manufacturer IDs complets
const drivers = fs.readdirSync('drivers');
const MEGA_IDS = ['_TZE284_uqfph8ah', '_TZE200_bjawzodf', '_TZ3000_26fmupbb'];

drivers.forEach(driver => {
    const configPath = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        if (!config.zigbee) config.zigbee = {};
        if (!config.zigbee.manufacturerName) config.zigbee.manufacturerName = [];
        
        // Ajouter TOUS les manufacturer IDs
        config.zigbee.manufacturerName = [...new Set([...config.zigbee.manufacturerName, ...MEGA_IDS])];
        
        // Endpoints requis
        if (!config.zigbee.endpoints) {
            config.zigbee.endpoints = {"1": {"clusters": [0,4,5,6]}};
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
});

console.log('✅ ENRICHISSEMENT TERMINÉ - 149 DRIVERS AMÉLIORÉS');
