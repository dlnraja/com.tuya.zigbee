'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DecodesDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('decodes device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\lib\TuyaHelpers.js');
        this.log('Original file: TuyaHelpers.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DecodesDevice;
