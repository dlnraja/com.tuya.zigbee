const { TuyaDriver } = require('homey-tuya');

class TS0001_switchDriver extends TuyaDriver {
    async onInit() {
        this.log('TS0001_switch driver initialized');
    }
    
    async onPairListDevices() {
        const devices = [];
        // Logique de découverte des appareils
        return devices;
    }
}

module.exports = TS0001_switchDriver;