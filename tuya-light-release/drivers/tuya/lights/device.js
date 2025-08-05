'use strict';

const { TuyaDevice } = require('homey-tuya');

class Device extends TuyaDevice {
    async onInit() {
        await super.onInit();
        
        this.log(' device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\app.json');
        this.log('Original file: app.json');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Device;
