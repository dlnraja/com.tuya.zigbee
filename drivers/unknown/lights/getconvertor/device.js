'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class GetconvertorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('getconvertor device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\color-space\index.js');
        this.log('Original file: index.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = GetconvertorDevice;
