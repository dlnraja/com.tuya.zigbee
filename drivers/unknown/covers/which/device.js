'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class WhichDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('which device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\BoundCluster.js');
        this.log('Original file: BoundCluster.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = WhichDevice;
