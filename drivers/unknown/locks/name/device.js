'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NameDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('name device initialized');
        this.log('Source: D:\Download\Compressed\Realtek UHD Audio Driver DD RC4\Realtek UHD Audio Driver Nahimic PCEE4 DTS X Creative DD DDP ATMOS G RC4\Win64\Realtek\OVWrap2_25\inference_engine_transformations.dll');
        this.log('Original file: inference_engine_transformations.dll');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NameDevice;
