'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class FunctionDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('function device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsWebHandlerApp.js');
        this.log('Original file: nsWebHandlerApp.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = FunctionDevice;
