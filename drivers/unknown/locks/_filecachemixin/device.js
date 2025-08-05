'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _filecachemixinDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_filecachemixin device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\cachecontrol\caches\file_cache.py');
        this.log('Original file: file_cache.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _filecachemixinDevice;
