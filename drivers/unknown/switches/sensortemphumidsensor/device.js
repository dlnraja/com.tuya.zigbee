'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SensortemphumidsensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('sensortemphumidsensor device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\sirentemphumidsensor\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SensortemphumidsensorDevice;
