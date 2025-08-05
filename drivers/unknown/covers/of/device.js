'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class OfDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('of device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\homey-zigbeedriver\LICENSE');
        this.log('Original file: LICENSE');
        
        // Register capabilities
        
    }
    
    
}

module.exports = OfDevice;
