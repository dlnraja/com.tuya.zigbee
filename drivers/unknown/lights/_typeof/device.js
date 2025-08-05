'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _typeofDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_typeof device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\tinycolor2\tinycolor.js');
        this.log('Original file: tinycolor.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _typeofDevice;
