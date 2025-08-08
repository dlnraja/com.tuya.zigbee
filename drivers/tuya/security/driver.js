const { ZigbeeDevice } = require('homey-meshdriver');

class TuyaSecurity extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Logique spécifique au driver
        console.log('Tuya Security initialized');
        
        // Enregistrer les capacités
        this.registerCapability('alarm_motion', 'cluster');
        this.registerCapability('alarm_contact', 'cluster');
    }
    
    async onSettings(oldSettings, newSettings, changedKeysArr) {
        await super.onSettings(oldSettings, newSettings, changedKeysArr);
        
        // Gestion des paramètres
        console.log('Settings updated:', changedKeysArr);
    }
}

module.exports = TuyaSecurity;