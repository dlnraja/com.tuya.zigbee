'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class FingerbottuyaDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('fingerbottuya device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\fingerbot\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = FingerbottuyaDevice;
