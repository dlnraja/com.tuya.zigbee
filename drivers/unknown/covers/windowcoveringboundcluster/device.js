'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class WindowcoveringboundclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('windowcoveringboundcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\lib\WindowCoveringBoundCluster.js');
        this.log('Original file: WindowCoveringBoundCluster.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = WindowcoveringboundclusterDevice;
