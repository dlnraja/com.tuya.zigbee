'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DebugDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('debug device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\index.js');
        this.log('Original file: index.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DebugDevice;
