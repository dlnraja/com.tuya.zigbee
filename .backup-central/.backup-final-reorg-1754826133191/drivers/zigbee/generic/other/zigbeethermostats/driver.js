const { ZigbeeDevice } = require('homey-meshdriver');

class ZigbeeThermostats extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Logique spécifique au driver
        console.log('Zigbee Thermostats initialized');
        
        // Enregistrer les capacités
        this.registerCapability('measure_temperature', 'cluster');
        this.registerCapability('target_temperature', 'cluster');
    }
    
    async onSettings(oldSettings, newSettings, changedKeysArr) {
        await super.onSettings(oldSettings, newSettings, changedKeysArr);
        
        // Gestion des paramètres
        console.log('Settings updated:', changedKeysArr);
    }
}

module.exports = ZigbeeThermostats;