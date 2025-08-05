'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NameDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('name device initialized');
        this.log('Source: D:\Download\crb_340\crb_340\Binaries\java\legal\java.xml\xalan.md');
        this.log('Original file: xalan.md');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NameDevice;
