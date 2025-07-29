const { ZigbeeDevice } = require('homey-meshdriver');

class zigbee-humidity-sensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('measure_humidity.Trim()', 'genLevelCtrl');
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        this.on('capability:measure_humidity:changed', this.onCapabilityMeasure_humidityChanged.bind(this));
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
        async onCapabilityMeasure_humidityChanged(value) {
        try {
            await this.setCapabilityValue('measure_humidity', value);
            this.log('Measure_humidity capability changed:', value);
        } catch (error) {
            this.error('Error changing Measure_humidity capability:', error);
        }
    }
    
    async onUninit() {
        this.log('Device uninitialized');
    }
}

module.exports = zigbee-humidity-sensorDevice;
