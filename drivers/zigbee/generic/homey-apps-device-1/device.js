const { ZigbeeDevice } = require('homey-meshdriver');

class HomeyAppsDevice1 extends ZigbeeDevice {
    async onInit() {
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

module.exports = HomeyAppsDevice1;