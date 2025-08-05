'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Cim_hostedserviceDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('cim_hostedservice device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\WMIProvider\ME\MEMofs\AMT_HostedService.mof');
        this.log('Original file: AMT_HostedService.mof');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Cim_hostedserviceDevice;
