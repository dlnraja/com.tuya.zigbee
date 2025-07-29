const { ZigbeeDevice } = require('homey-meshdriver');

class zigbee-temperature-sensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('measure_temperature.Trim()', 'genLevelCtrl');
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        this.on('capability:measure_temperature:changed', this.onCapabilityMeasure_temperatureChanged.bind(this));
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
        async onCapabilityMeasure_temperatureChanged(value) {
        try {
            await this.setCapabilityValue('measure_temperature', value);
            this.log('Measure_temperature capability changed:', value);
        } catch (error) {
            this.error('Error changing Measure_temperature capability:', error);
        }
    }
    
    async onUninit() {
        this.log('Device uninitialized');
    }
}

module.exports = zigbee-temperature-sensorDevice;
