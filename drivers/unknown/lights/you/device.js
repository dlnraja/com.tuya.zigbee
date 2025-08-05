'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class YouDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('you device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\homey-zigbeedriver\README.md');
        this.log('Original file: README.md');
        
        // Register capabilities
        
    }
    
    
}

module.exports = YouDevice;
