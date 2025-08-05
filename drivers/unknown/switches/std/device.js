'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class StdDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('std device initialized');
        this.log('Source: D:\Download\Compressed\Realtek UHD Audio Driver DD RC4\Realtek UHD Audio Driver Nahimic PCEE4 DTS X Creative DD DDP ATMOS G RC4\Win64\Realtek\OVWrap2_25\GNAPlugin.dll');
        this.log('Original file: GNAPlugin.dll');
        
        // Register capabilities
        
    }
    
    
}

module.exports = StdDevice;
