'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log(' device initialized');
        this.log('Source: D:\Download\OpCore-Simplify-main\OpCore-Simplify-main\OCK_Files\OpenCorePkg\EFI\OC\Drivers\HfsPlusLegacy.efi');
        this.log('Original file: HfsPlusLegacy.efi');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Device;
