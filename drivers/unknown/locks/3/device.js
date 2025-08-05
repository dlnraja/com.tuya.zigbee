'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class 3Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('3 device initialized');
        this.log('Source: D:\Download\Compressed\RockChip_TFT TeaM\RockChip\Rockchip_DriverAssitant_v5.1.1\Driver\x86\win81\rockusb.sys');
        this.log('Original file: rockusb.sys');
        
        // Register capabilities
        
    }
    
    
}

module.exports = 3Device;
