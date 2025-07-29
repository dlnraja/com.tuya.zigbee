const { TuyaDevice } = require('homey-tuya');

class tuya-motion-sensorDevice extends TuyaDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('alarm_motion.Trim()', 'genLevelCtrl');
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        this.on('capability:alarm_motion:changed', this.onCapabilityAlarm_motionChanged.bind(this));
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
        async onCapabilityAlarm_motionChanged(value) {
        try {
            await this.setCapabilityValue('alarm_motion', value);
            this.log('Alarm_motion capability changed:', value);
        } catch (error) {
            this.error('Error changing Alarm_motion capability:', error);
        }
    }
    
    async onUninit() {
        this.log('Device uninitialized');
    }
}

module.exports = tuya-motion-sensorDevice;
