'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class AnaloginputclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('analoginputcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\analogInput.js');
        this.log('Original file: analogInput.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = AnaloginputclusterDevice;
