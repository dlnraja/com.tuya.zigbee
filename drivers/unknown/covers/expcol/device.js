'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ExpcolDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('expcol device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\WMIProvider\ME\html\indexframe.html');
        this.log('Original file: indexframe.html');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ExpcolDevice;
