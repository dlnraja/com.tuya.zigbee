'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Lcdtemphumidsensor2Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('lcdtemphumidsensor2 device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\lcdtemphumidsensor_2\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Lcdtemphumidsensor2Device;
