const { ZigbeeDevice } = require('homey-meshdriver');

class ZigbeeOnoff extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Logique spécifique au driver
        console.log('Zigbee Onoff initialized');
        
        // Enregistrer les capacités
        this.registerCapability('onoff', 'cluster');
    }
    
    async onSettings(oldSettings, newSettings, changedKeysArr) {
        await super.onSettings(oldSettings, newSettings, changedKeysArr);
        
        // Gestion des paramètres
        console.log('Settings updated:', changedKeysArr);
    }
}

module.exports = ZigbeeOnoff;