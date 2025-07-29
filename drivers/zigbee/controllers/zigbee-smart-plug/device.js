const { ZigbeeDevice } = require('homey-meshdriver');

class zigbee-smart-plugDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('measure_power.Trim()', 'genLevelCtrl');
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        this.on('capability:measure_power:changed', this.onCapabilityMeasure_powerChanged.bind(this));
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
        async onCapabilityMeasure_powerChanged(value) {
        try {
            await this.setCapabilityValue('measure_power', value);
            this.log('Measure_power capability changed:', value);
        } catch (error) {
            this.error('Error changing Measure_power capability:', error);
        }
    }
    
    async onUninit() {
        this.log('Device uninitialized');
    }
}

module.exports = zigbee-smart-plugDevice;
