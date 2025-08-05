'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NotDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('not device initialized');
        this.log('Source: D:\Download\Compressed\Realtek UHD Audio Driver DD RC4\Realtek UHD Audio Driver Nahimic PCEE4 DTS X Creative DD DDP ATMOS G RC4\Win64\dtstech51_64.dll');
        this.log('Original file: dtstech51_64.dll');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NotDevice;
