'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class HasrootdomainDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('hasrootdomain device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsPrivateBrowsingService.js');
        this.log('Original file: nsPrivateBrowsingService.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = HasrootdomainDevice;
