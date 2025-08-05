'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class OrDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('or device initialized');
        this.log('Source: D:\Download\crb_340\crb_340\Binaries\java\legal\jdk.crypto.ec\ecc.md');
        this.log('Original file: ecc.md');
        
        // Register capabilities
        
    }
    
    
}

module.exports = OrDevice;
