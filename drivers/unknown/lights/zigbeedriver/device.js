'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ZigbeedriverDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('zigbeedriver device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\homey-zigbeedriver\lib\ZigBeeDriver.js');
        this.log('Original file: ZigBeeDriver.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ZigbeedriverDevice;
