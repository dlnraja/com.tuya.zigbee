const { ZigbeeDevice } = require('homey-meshdriver');

class ZigbeeLights extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Logique spécifique au driver
        console.log('Zigbee Lights initialized');
        
        // Enregistrer les capacités
        this.registerCapability('onoff', 'cluster');
        this.registerCapability('dim', 'cluster');
        this.registerCapability('light_hue', 'cluster');
        this.registerCapability('light_saturation', 'cluster');
    }
    
    async onSettings(oldSettings, newSettings, changedKeysArr) {
        await super.onSettings(oldSettings, newSettings, changedKeysArr);
        
        // Gestion des paramètres
        console.log('Settings updated:', changedKeysArr);
    }
}

module.exports = ZigbeeLights;