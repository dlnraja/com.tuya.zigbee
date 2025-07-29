const { ZigbeeDevice } = require('homey-meshdriver');

class ForumHomeyCommunityDevice2 extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('ForumHomeyCommunityDevice2 initialized');
        
        // Register capabilities
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
        this.registerCapabilityListener('measure_humidity', async (value) => {
            await this.setCapabilityValue('measure_humidity', value);
        });
    }
    
    async onUninit() {
        this.log('ForumHomeyCommunityDevice2 uninitialized');
    }
}

module.exports = ForumHomeyCommunityDevice2;