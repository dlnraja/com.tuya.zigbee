'use strict';

const { ZigbeeDevice } = require('homey-zigbee');

class Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log(' device initialized');
        this.log('Source: D:\Download\tuya_zigbee_cursor_rebuild (2).md');
        this.log('Original file: tuya_zigbee_cursor_rebuild (2).md');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Device;
