const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class homey-apps-device-1 extends Homey.Device {
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: GENERIC_ONOFF (high)
    // Compatibilité: OK
    // Capabilities supportées: onoff
    // Limitations: 
    async onInit() {
        try {
        await super.onInit();
        
        this.log('HomeyAppsDevice1 initialized');
        
        // Register capabilities
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
    }
    
    async onUninit() {
        this.log('HomeyAppsDevice1 uninitialized');
    }
}


    // Méthodes de fallback pour firmware inconnu
    async onInit() {
        try {
        await super.onInit();
        this.log('Driver en mode fallback - compatibilité limitée');
        this.setWarning('Firmware non reconnu - fonctionnalités limitées');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('Paramètres mis à jour en mode fallback');
    }

module.exports = homey-apps-device-1;