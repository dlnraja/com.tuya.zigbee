'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SaidDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('said device initialized');
        this.log('Source: D:\Download\Compressed\PYRANA-1.53.401.5-U12-0.9\vendor_new\lib\camera.device@3.2-impl.so');
        this.log('Original file: camera.device@3.2-impl.so');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SaidDevice;
