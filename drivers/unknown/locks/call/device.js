'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CallDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('call device initialized');
        this.log('Source: D:\Download\Compressed\RockChip_TFT TeaM\RockChip\Rockchip_DriverAssitant_v5.1.1\Driver\x86\xp\DriverCoInstaller.dll');
        this.log('Original file: DriverCoInstaller.dll');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CallDevice;
