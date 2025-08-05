'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class AnalogvalueclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('analogvaluecluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\analogValue.js');
        this.log('Original file: analogValue.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = AnalogvalueclusterDevice;
