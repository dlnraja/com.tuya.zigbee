'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ThermostaticradiatorvalvedriverDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('thermostaticradiatorvalvedriver device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\thermostatic_radiator_valve\driver.js');
        this.log('Original file: driver.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ThermostaticradiatorvalvedriverDevice;
