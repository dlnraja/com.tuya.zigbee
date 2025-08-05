'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Cim_jobDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('cim_job device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\WMIProvider\ME\s\Core\CIM_Job.mof');
        this.log('Original file: CIM_Job.mof');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Cim_jobDevice;
