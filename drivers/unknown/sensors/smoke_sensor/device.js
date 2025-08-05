'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Smoke_sensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('smoke_sensor device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\smoke_sensor3\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Smoke_sensorDevice;
