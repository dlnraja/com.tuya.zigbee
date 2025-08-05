'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LoginmanagerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('loginmanager device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsLoginManager.js');
        this.log('Original file: nsLoginManager.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LoginmanagerDevice;
