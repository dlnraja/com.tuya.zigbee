'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LoginmanagerpromptfactoryDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('loginmanagerpromptfactory device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsLoginManagerPrompter.js');
        this.log('Original file: nsLoginManagerPrompter.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LoginmanagerpromptfactoryDevice;
