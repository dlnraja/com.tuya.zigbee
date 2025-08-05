'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TrytocloseDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('trytoclose device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsTryToClose.js');
        this.log('Original file: nsTryToClose.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TrytocloseDevice;
