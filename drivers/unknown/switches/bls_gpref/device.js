'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Bls_gprefDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('bls_gpref device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsBlocklistService.js');
        this.log('Original file: nsBlocklistService.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Bls_gprefDevice;
