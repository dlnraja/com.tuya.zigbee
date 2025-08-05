'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class WindowcoveringDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('windowcovering device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\windowCovering.js');
        this.log('Original file: windowCovering.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = WindowcoveringDevice;
