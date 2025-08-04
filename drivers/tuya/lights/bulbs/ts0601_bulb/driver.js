const { TuyaDriver } = require('homey-tuya');

class Ts0601_bulbDriver extends TuyaDriver {
    async onInit() {
        this.log('ts0601_bulb driver initialized');
    }
    
    async onPairListDevices() {
        const devices = [];
        // Logique de découverte des appareils
        return devices;
    }
}

module.exports = Ts0601_bulbDriver;