const { ZigbeeDevice } = require('homey-meshdriver');

class zigbee-contact-sensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('alarm_contact.Trim()', 'genLevelCtrl');
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        this.on('capability:alarm_contact:changed', this.onCapabilityAlarm_contactChanged.bind(this));
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
        async onCapabilityAlarm_contactChanged(value) {
        try {
            await this.setCapabilityValue('alarm_contact', value);
            this.log('Alarm_contact capability changed:', value);
        } catch (error) {
            this.error('Error changing Alarm_contact capability:', error);
        }
    }
    
    async onUninit() {
        this.log('Device uninitialized');
    }
}

module.exports = zigbee-contact-sensorDevice;
