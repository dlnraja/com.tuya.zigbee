const { ZigbeeDevice } = require('homey-meshdriver');

class ForumHomeyCommunityDevice1 extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('ForumHomeyCommunityDevice1 initialized');
        
        // Register capabilities
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
        this.registerCapabilityListener('dim', async (value) => {
            await this.setCapabilityValue('dim', value);
        });
    }
    
    async onUninit() {
        this.log('ForumHomeyCommunityDevice1 uninitialized');
    }
}

module.exports = ForumHomeyCommunityDevice1;