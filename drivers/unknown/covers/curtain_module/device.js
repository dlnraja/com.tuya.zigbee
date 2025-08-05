'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Curtain_moduleDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('curtain_module device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\curtain_module\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Curtain_moduleDevice;
