const { TuyaDevice } = require('homey-tuya');

class tuya-irrigationDevice extends TuyaDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
    
    
    async onUninit() {
        this.log('Device uninitialized');
    }
}

module.exports = tuya-irrigationDevice;
