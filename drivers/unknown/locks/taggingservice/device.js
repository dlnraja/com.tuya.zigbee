'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TaggingserviceDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('taggingservice device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsTaggingService.js');
        this.log('Original file: nsTaggingService.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TaggingserviceDevice;
