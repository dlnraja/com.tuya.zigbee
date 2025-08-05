'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NslogininfoDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('nslogininfo device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsLoginInfo.js');
        this.log('Original file: nsLoginInfo.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NslogininfoDevice;
