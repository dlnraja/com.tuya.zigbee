'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log(' device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\.homeycompose\capabilities\thermostat_programming.json');
        this.log('Original file: thermostat_programming.json');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Device;
