'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ClassguidDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('classguid device initialized');
        this.log('Source: D:\Download\Compressed\RockChip_TFT TeaM\RockChip\Rockchip_DriverAssitant_v5.1.1\ADBDriver\android_winusb.inf');
        this.log('Original file: android_winusb.inf');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ClassguidDevice;
