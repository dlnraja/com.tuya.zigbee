'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class MultistateinputclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('multistateinputcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\multistateInput.js');
        this.log('Original file: multistateInput.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = MultistateinputclusterDevice;
