'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NssetdefaultbrowserDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('nssetdefaultbrowser device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsSetDefaultBrowser.js');
        this.log('Original file: nsSetDefaultBrowser.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NssetdefaultbrowserDevice;
