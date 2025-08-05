'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ClassguidDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('classguid device initialized');
        this.log('Source: D:\Download\compresed\miflash_unlock_en_7.6.727.43\driver\win10\android_winusb.inf');
        this.log('Original file: android_winusb.inf');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ClassguidDevice;
