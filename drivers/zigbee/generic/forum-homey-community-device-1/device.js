const { ZigbeeDevice } = require('homey-meshdriver');

class forum-homey-community-device-1 extends Homey.Device {
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: TS0601 (high)
    // Compatibilité: OK
    // Capabilities supportées: onoff, dim
    // Limitations: 
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