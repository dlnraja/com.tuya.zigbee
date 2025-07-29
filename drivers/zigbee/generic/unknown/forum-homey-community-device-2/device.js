const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class forum-homey-community-device-2 extends Homey.Device {
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: TS0604 (high)
    // Compatibilité: OK
    // Capabilities supportées: onoff, measure_humidity
    // Limitations: 
    async onInit() {
        try {
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