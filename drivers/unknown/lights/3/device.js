'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class 3Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('3 device initialized');
        this.log('Source: D:\Download\Compressed\CH314A Tools Collection ByNSC\AsProgrammer\drivers\AVRISPMK2\avrisp_mkii.cat');
        this.log('Original file: avrisp_mkii.cat');
        
        // Register capabilities
        
    }
    
    
}

module.exports = 3Device;
