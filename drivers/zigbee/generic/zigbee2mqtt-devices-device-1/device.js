const { ZigbeeDevice } = require('homey-meshdriver');

class Zigbee2mqttDevicesDevice1 extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('Zigbee2mqttDevicesDevice1 initialized');
        
        // Register capabilities
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
    }
    
    async onUninit() {
        this.log('Zigbee2mqttDevicesDevice1 uninitialized');
    }
}

module.exports = Zigbee2mqttDevicesDevice1;