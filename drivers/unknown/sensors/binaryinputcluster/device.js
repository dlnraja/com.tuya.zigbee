'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BinaryinputclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('binaryinputcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\binaryInput.js');
        this.log('Original file: binaryInput.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BinaryinputclusterDevice;
