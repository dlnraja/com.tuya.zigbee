'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Wdf_class_bind_infoDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('wdf_class_bind_info device initialized');
        this.log('Source: D:\Download\Compressed\CP210x_Universal_Windows_Driver\arm64\silabser.sys');
        this.log('Original file: silabser.sys');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Wdf_class_bind_infoDevice;
