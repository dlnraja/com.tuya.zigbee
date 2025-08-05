'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class MultistatevalueclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('multistatevaluecluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\multistateValue.js');
        this.log('Original file: multistateValue.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = MultistatevalueclusterDevice;
