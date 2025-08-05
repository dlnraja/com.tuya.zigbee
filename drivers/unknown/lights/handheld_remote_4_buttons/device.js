'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Handheld_remote_4_buttonsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('handheld_remote_4_buttons device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\handheld_remote_4_buttons\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Handheld_remote_4_buttonsDevice;
