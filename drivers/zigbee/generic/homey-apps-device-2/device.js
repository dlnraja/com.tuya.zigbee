const { ZigbeeDevice } = require('homey-meshdriver');

class HomeyAppsDevice2 extends ZigbeeDevice {
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