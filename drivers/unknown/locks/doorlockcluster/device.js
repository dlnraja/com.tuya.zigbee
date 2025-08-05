'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DoorlockclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('doorlockcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\doorLock.js');
        this.log('Original file: doorLock.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DoorlockclusterDevice;
