'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LogDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('log device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\FeedWriter.js');
        this.log('Original file: FeedWriter.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LogDevice;
