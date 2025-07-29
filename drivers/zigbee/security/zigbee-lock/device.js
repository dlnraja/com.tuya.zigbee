const { ZigbeeDevice } = require('homey-meshdriver');

class zigbee-lockDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('lock.Trim()', 'genLevelCtrl');
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        this.on('capability:lock:changed', this.onCapabilityLockChanged.bind(this));
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
        async onCapabilityLockChanged(value) {
        try {
            await this.setCapabilityValue('lock', value);
            this.log('Lock capability changed:', value);
        } catch (error) {
            this.error('Error changing Lock capability:', error);
        }
    }
    
    async onUninit() {
        this.log('Device uninitialized');
    }
}

module.exports = zigbee-lockDevice;
