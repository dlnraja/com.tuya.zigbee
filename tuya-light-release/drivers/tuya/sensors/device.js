'use strict';

const { TuyaDevice } = require('homey-tuya');

class Device extends TuyaDevice {
    async onInit() {
        await super.onInit();
        
        this.log(' device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\water_leak_sensor_tuya\driver.compose.json');
        this.log('Original file: driver.compose.json');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Device;
