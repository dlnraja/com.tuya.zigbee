'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class AsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('as device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\mumath\README.md');
        this.log('Original file: README.md');
        
        // Register capabilities
        
    }
    
    
}

module.exports = AsDevice;
