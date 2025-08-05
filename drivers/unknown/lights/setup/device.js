'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SetupDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('setup device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\debug\src\common.js');
        this.log('Original file: common.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SetupDevice;
