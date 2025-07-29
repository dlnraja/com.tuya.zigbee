const { ZigbeeDevice } = require('homey-meshdriver');

class homey-apps-device-3 extends Homey.Device {
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: TS0605 (high)
    // Compatibilité: OK
    // Capabilities supportées: alarm_motion
    // Limitations: 
    async onInit() {
        await super.onInit();
        
        this.log('HomeyAppsDevice3 initialized');
        
        // Register capabilities
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
        this.registerCapabilityListener('alarm_motion', async (value) => {
            await this.setCapabilityValue('alarm_motion', value);
        });
    }
    
    async onUninit() {
        this.log('HomeyAppsDevice3 uninitialized');
    }
}

module.exports = HomeyAppsDevice3;