'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class MyzigbeedeviceDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('myzigbeedevice device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\homey-zigbeedriver\assets\driver\zigbee\driver.js');
        this.log('Original file: driver.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = MyzigbeedeviceDevice;
