const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class custom-lightDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('dim.Trim()', 'genLevelCtrl'); this.registerCapability('measure_power.Trim()', 'genLevelCtrl');
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        this.on('capability:dim:changed', this.onCapabilityDimChanged.bind(this)); this.on('capability:measure_power:changed', this.onCapabilityMeasure_powerChanged.bind(this));
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
        async onCapabilityDimChanged(value) {
        try {
            await this.setCapabilityValue('dim', value);
            this.log('Dim capability changed:', value);
        } catch (error) {
            this.error('Error changing Dim capability:', error);
        }
    }     async onCapabilityMeasure_powerChanged(value) {
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

module.exports = custom-lightDevice;

