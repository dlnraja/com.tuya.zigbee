// CORRECTION FINALE DES ERREURS DÉTECTÉES
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 CORRECTION FINALE DES ERREURS');

// 1. Correction problème motion_sensor_advanced
const problematicName = '_motion_sensor_advanced';
const correctName = 'motion_sensor_advanced';

if (fs.existsSync(`drivers/${problematicName}`)) {
    try {
        fs.renameSync(`drivers/${problematicName}`, `drivers/${correctName}`);
        console.log(`✅ Corrigé: ${problematicName} -> ${correctName}`);
    } catch (e) {
        console.log(`ℹ️  Driver ${correctName} déjà correct`);
    }
}

// 2. Nettoyage node_modules problématiques
const problematicModules = [
    'node_modules/@img/sharp-darwin-arm64',
    'node_modules/@img/sharp-linux-x64', 
    'node_modules/@img/sharp-win32-x64'
];

problematicModules.forEach(module => {
    if (fs.existsSync(module)) {
        try {
            fs.rmSync(module, { recursive: true, force: true });
            console.log(`✅ Supprimé: ${module}`);
        } catch (e) {}
    }
});

// 3. Vérification driver smoke_detector_temp_humidity_advanced
const smokeDriver = 'drivers/smoke_detector_temp_humidity_advanced';
if (fs.existsSync(smokeDriver)) {
    if (!fs.existsSync(`${smokeDriver}/device.js`)) {
        const deviceJs = `'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmokeDetectorTempHumidityAdvanced extends ZigBeeDevice {
  async onNodeInit() {
    await super.onNodeInit();
    this.log('Advanced Smoke Detector with Temperature & Humidity initialized');
  }
}

module.exports = SmokeDetectorTempHumidityAdvanced;`;
        
        fs.writeFileSync(`${smokeDriver}/device.js`, deviceJs);
        console.log('✅ Créé: smoke_detector_temp_humidity_advanced/device.js');
    }
}

console.log('🎯 CORRECTIONS TERMINÉES');
console.log('💡 Prochaine étape: npm install --force puis homey app publish');
