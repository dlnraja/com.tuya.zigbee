const { TuyaDriver } = require('homey-tuya');

class TS0202_sensorDriver extends TuyaDriver {
    async onInit() {
        this.log('TS0202_sensor driver initialized');
    }
    
    async onPairListDevices() {
        const devices = [];
        // Logique de découverte des appareils
        return devices;
    }
}

module.exports = TS0202_sensorDriver;