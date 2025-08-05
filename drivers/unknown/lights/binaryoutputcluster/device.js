'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BinaryoutputclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('binaryoutputcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\binaryOutput.js');
        this.log('Original file: binaryOutput.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BinaryoutputclusterDevice;
