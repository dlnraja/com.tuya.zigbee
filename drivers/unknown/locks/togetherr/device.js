'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TogetherrDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('togetherr device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\cachecontrol\caches\__pycache__\file_cache.cpython-311.pyc');
        this.log('Original file: file_cache.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TogetherrDevice;
