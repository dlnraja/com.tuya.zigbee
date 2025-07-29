const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class zigbee2mqtt-devices-device-2 extends Homey.Device {
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: TS0603 (high)
    // Compatibilité: OK
    // Capabilities supportées: onoff, measure_temperature
    // Limitations: 
    async onInit() {
        try {
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