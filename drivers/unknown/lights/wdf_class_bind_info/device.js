'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Wdf_class_bind_infoDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('wdf_class_bind_info device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\MEI\win10\x86\TEEDriverW10.sys');
        this.log('Original file: TEEDriverW10.sys');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Wdf_class_bind_infoDevice;
