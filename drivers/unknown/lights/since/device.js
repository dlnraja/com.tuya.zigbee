'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SinceDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('since device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\commands\__pycache__\cache.cpython-311.pyc');
        this.log('Original file: cache.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SinceDevice;
