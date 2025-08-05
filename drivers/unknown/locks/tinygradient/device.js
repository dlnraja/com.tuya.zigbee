'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TinygradientDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('tinygradient device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\tinygradient\types.d.ts');
        this.log('Original file: types.d.ts');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TinygradientDevice;
