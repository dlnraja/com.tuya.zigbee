'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class IrrigationcontrollerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('irrigationcontroller device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\smart_garden_irrigation_control\device.js');
        this.log('Original file: device.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = IrrigationcontrollerDevice;
