const { TuyaDriver } = require('homey-tuya');

class Ts0602_thermostatDriver extends TuyaDriver {
    async onInit() {
        this.log('ts0602_thermostat driver initialized');
    }
    
    async onPairListDevices() {
        const devices = [];
        // Logique de découverte des appareils
        return devices;
    }
}

module.exports = Ts0602_thermostatDriver;