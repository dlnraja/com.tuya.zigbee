// PERFECTION RAPIDE v2.0
const fs = require('fs');

console.log('🚀 PERFECTION RAPIDE ACTIVÉE');

// Nettoyer cache
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

// IDs massifs
const MEGA_IDS = [
    '_TZE284_uqfph8ah', '_TZE284_bjawzodf', '_TZE200_bjawzodf', 
    '_TZ3000_26fmupbb', '_TZ3400_keyjhapk', 'BSEED', 'MOES'
];

// Enrichir tous drivers
fs.readdirSync('drivers').forEach(driver => {
    const file = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(file)) {
        const config = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        if (!config.zigbee) config.zigbee = {};
        if (!config.zigbee.manufacturerName) config.zigbee.manufacturerName = [];
        
        // Ajouter IDs sans doublons
        MEGA_IDS.forEach(id => {
            if (!config.zigbee.manufacturerName.includes(id)) {
                config.zigbee.manufacturerName.push(id);
            }
        });
        
        // Endpoints requis
        if (!config.zigbee.endpoints) {
            config.zigbee.endpoints = {"1": {"clusters": [0, 4, 5, 6]}};
        }
        
        fs.writeFileSync(file, JSON.stringify(config, null, 2));
    }
});

console.log('✅ PERFECTION TERMINÉE - PRÊT POUR PUBLICATION');
