'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DevicetemperatureclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('devicetemperaturecluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\deviceTemperature.js');
        this.log('Original file: deviceTemperature.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DevicetemperatureclusterDevice;
