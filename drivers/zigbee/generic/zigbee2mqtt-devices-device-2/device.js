const { ZigbeeDevice } = require('homey-meshdriver');

class Zigbee2mqttDevicesDevice2 extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('Zigbee2mqttDevicesDevice2 initialized');
        
        // Register capabilities
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
        this.registerCapabilityListener('measure_temperature', async (value) => {
            await this.setCapabilityValue('measure_temperature', value);
        });
    }
    
    async onUninit() {
        this.log('Zigbee2mqttDevicesDevice2 uninitialized');
    }
}

module.exports = Zigbee2mqttDevicesDevice2;