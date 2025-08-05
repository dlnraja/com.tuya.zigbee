'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class StepizeDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('stepize device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\tinygradient\browser.js.map');
        this.log('Original file: browser.js.map');
        
        // Register capabilities
        
    }
    
    
}

module.exports = StepizeDevice;
