'use strict';

const { ZigbeeDevice } = require('homey-zigbee');

class Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log(' device initialized');
        this.log('Source: D:\Download\fold\tuya_zigbee_cursor_full_bundle (1).txt');
        this.log('Original file: tuya_zigbee_cursor_full_bundle (1).txt');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Device;
