'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class StringioDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('stringio device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\msgpack\fallback.py');
        this.log('Original file: fallback.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = StringioDevice;
