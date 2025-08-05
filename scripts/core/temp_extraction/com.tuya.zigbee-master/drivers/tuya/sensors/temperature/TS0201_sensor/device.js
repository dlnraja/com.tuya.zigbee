const { TuyaDevice } = require('homey-tuya');

class TS0201_sensorDevice extends TuyaDevice {
    async onInit() {
        this.log('TS0201_sensor device initialized');
        
        // Configuration des capacités selon le type
        await this.setCapabilityValue('measure_temperature', 0);
        
        this.log('TS0201_sensor device ready');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('TS0201_sensor settings updated');
    }
}

module.exports = TS0201_sensorDevice;