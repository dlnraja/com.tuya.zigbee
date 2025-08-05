'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class UseDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('use device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\@types\tinycolor2\index.d.ts');
        this.log('Original file: index.d.ts');
        
        // Register capabilities
        
    }
    
    
}

module.exports = UseDevice;
