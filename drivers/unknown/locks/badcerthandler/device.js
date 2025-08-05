'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BadcerthandlerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('badcerthandler device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsBadCertHandler.js');
        this.log('Original file: nsBadCertHandler.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BadcerthandlerDevice;
