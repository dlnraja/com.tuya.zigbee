'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class OutdoorplugDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('outdoorplug device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\outdoor_plug\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = OutdoorplugDevice;
