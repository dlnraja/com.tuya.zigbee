'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Amt_setupauditrecordDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('amt_setupauditrecord device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\WMIProvider\ME\MEMofs\AMT_SetupAuditRecord.mof');
        this.log('Original file: AMT_SetupAuditRecord.mof');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Amt_setupauditrecordDevice;
