'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class MydeviceDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('mydevice device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\README.md');
        this.log('Original file: README.md');
        
        // Register capabilities
        
    }
    
    
}

module.exports = MydeviceDevice;
