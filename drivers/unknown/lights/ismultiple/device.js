'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class IsmultipleDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('ismultiple device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\mumath\is-multiple.js');
        this.log('Original file: is-multiple.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = IsmultipleDevice;
