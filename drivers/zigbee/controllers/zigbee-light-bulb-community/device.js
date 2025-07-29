const { ZigbeeDevice } = require('homey-meshdriver');

class ZigbeeLightBulbCommunity extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('Zigbee Light Bulb Community initialized');
        
        // Light control
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
        
        // Dimming
        this.registerCapabilityListener('dim', async (value) => {
            await this.setCapabilityValue('dim', value);
        });
        
        // Color control
        this.registerCapabilityListener('light_hue', async (value) => {
            await this.setCapabilityValue('light_hue', value);
        });
    }
    
    async onUninit() {
        this.log('Zigbee Light Bulb Community uninitialized');
    }
}

module.exports = ZigbeeLightBulbCommunity;