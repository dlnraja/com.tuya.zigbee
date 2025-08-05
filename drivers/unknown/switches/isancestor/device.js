'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class IsancestorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('isancestor device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\modules\Microformats.js');
        this.log('Original file: Microformats.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = IsancestorDevice;
