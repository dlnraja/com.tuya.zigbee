'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class FloodsensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('floodsensor device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\flood_sensor\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = FloodsensorDevice;
