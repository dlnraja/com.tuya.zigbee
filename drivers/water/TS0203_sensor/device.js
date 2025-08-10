const { TuyaDevice } = require('homey-tuya');

class TS0203_sensorDevice extends TuyaDevice {
    async onInit() {
        this.log('TS0203_sensor device initialized');
        
        // Configuration des capacités selon le type
        await this.setCapabilityValue('measure_temperature', 0);
        
        this.log('TS0203_sensor device ready');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('TS0203_sensor settings updated');
    }
}

module.exports = TS0203_sensorDevice;