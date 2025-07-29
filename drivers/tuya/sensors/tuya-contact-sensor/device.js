const { TuyaDevice } = require('homey-tuya');

class tuya-contact-sensorDevice extends ZigbeeDevice {
    // Voltage, Amperage, and Battery Management
    async onBatteryLow() {
        await this.setCapabilityValue('alarm_battery', true);
        this.log('Battery low detected');
    }
    
    async onBatteryCritical() {
        await this.setCapabilityValue('alarm_battery', true);
        this.log('Battery critical - replacement needed');
    }
    
    async onVoltageChange(voltage) {
        await this.setCapabilityValue('measure_voltage', voltage);
        this.log('Voltage changed to: ' + voltage + 'V');
    }
    
    async onAmperageChange(amperage) {
        await this.setCapabilityValue('measure_current', amperage);
        this.log('Amperage changed to: ' + amperage + 'A');
    }
    
    async onPowerChange(power) {
        await this.setCapabilityValue('measure_power', power);
        this.log('Power changed to: ' + power + 'W');
    }
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

module.exports = tuya-contact-sensorDevice;





























