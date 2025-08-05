'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DriverDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('driver device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\SOL\mesrl.inf');
        this.log('Original file: mesrl.inf');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DriverDevice;
