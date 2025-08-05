'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ReferencesDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('references device initialized');
        this.log('Source: D:\Download\Compressed\Realtek UHD Audio Driver DD RC4\Realtek UHD Audio Driver Nahimic PCEE4 DTS X Creative DD DDP ATMOS G RC4\Win64\Realtek\OVWrap2_25\ngraph.dll');
        this.log('Original file: ngraph.dll');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ReferencesDevice;
