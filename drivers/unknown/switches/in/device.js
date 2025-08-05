'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class InDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('in device initialized');
        this.log('Source: D:\Download\Compressed\CP210x_Universal_Windows_Driver\x86\silabser.sys');
        this.log('Original file: silabser.sys');
        
        // Register capabilities
        
    }
    
    
}

module.exports = InDevice;
