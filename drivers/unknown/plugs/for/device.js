'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ForDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('for device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\WMIProvider\ME\MEMofs\OOB_Service.mof');
        this.log('Original file: OOB_Service.mof');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ForDevice;
