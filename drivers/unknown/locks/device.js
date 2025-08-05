'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log(' device initialized');
        this.log('Source: D:\Download\OpCore-Simplify-main\OpCore-Simplify-main\OCK_Files\OpenCorePkg\EFI\OC\Drivers\Rts5260.efi');
        this.log('Original file: Rts5260.efi');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Device;
