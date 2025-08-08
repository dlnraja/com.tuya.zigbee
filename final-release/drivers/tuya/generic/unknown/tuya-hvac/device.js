const { TuyaDevice } = require('homey-tuya');
const { TuyaZigbeeDevice } = require('homey-tuya-zigbee');

class tuya-hvac extends ZigbeeDevice {
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: TS0603 (high)
    // Compatibilité: OK
    // Capabilities supportées: onoff, measure_temperature
    // Limitations: 
        // Voltage Management
        async onVoltageChange(voltage) {
            await this.setCapabilityValue('measure_voltage', voltage);
            this.log('Voltage changed to: ' + voltage + 'V');
        }
        // Current Management
        async onAmperageChange(amperage) {
            await this.setCapabilityValue('measure_current', amperage);
            this.log('Amperage changed to: ' + amperage + 'A');
        }
        // Power Management
        async onPowerChange(power) {
            await this.setCapabilityValue('measure_power', power);
            this.log('Power changed to: ' + power + 'W');
        }
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('target_temperature.Trim()', 'genLevelCtrl'); this.registerCapability('measure_temperature.Trim()', 'genLevelCtrl');
        
        // Setup polling
        this.setPollInterval(30);
        
        // Setup listeners
        this.on('capability:onoff:changed', this.onCapabilityOnOffChanged.bind(this));
        this.on('capability:target_temperature:changed', this.onCapabilityTarget_temperatureChanged.bind(this)); this.on('capability:measure_temperature:changed', this.onCapabilityMeasure_temperatureChanged.bind(this));
    }
    
    async onCapabilityOnOffChanged(value) {
        try {
            await this.setCapabilityValue('onoff', value);
            this.log('OnOff capability changed:', value);
        } catch (error) {
            this.error('Error changing OnOff capability:', error);
        }
    }
    
        async onCapabilityTarget_temperatureChanged(value) {
        try {
            await this.setCapabilityValue('target_temperature', value);
            this.log('Target_temperature capability changed:', value);
        } catch (error) {
            this.error('Error changing Target_temperature capability:', error);
        }
    }     async onCapabilityMeasure_temperatureChanged(value) {
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

module.exports = tuya-hvacDevice;






















