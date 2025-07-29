const { ZigbeeDevice } = require('homey-meshdriver');

class homey-apps-device-2 extends Homey.Device {
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: TS0603 (high)
    // Compatibilité: OK
    // Capabilities supportées: onoff, measure_temperature
    // Limitations: 
    async onInit() {
        await super.onInit();
        
        this.log('HomeyAppsDevice2 initialized');
        
        // Register capabilities
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
        this.registerCapabilityListener('measure_temperature', async (value) => {
            await this.setCapabilityValue('measure_temperature', value);
        });
    }
    
    async onUninit() {
        this.log('HomeyAppsDevice2 uninitialized');
    }
}

module.exports = HomeyAppsDevice2;