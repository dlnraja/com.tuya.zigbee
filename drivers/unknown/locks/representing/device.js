'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class RepresentingDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('representing device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\WMIProvider\ME\MEMofs\ME_System.mof');
        this.log('Original file: ME_System.mof');
        
        // Register capabilities
        
    }
    
    
}

module.exports = RepresentingDevice;
