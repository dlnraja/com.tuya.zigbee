'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class 3Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('3 device initialized');
        this.log('Source: D:\Download\Compressed\CH314A Tools Collection ByNSC\AsProgrammer\drivers\FT232\CDM212364_Setup.exe');
        this.log('Original file: CDM212364_Setup.exe');
        
        // Register capabilities
        
    }
    
    
}

module.exports = 3Device;
