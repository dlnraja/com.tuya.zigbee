'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BasecacheDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('basecache device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\cachecontrol\cache.py');
        this.log('Original file: cache.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BasecacheDevice;
