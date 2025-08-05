'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BadmetadataDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('badmetadata device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\metadata\importlib\_compat.py');
        this.log('Original file: _compat.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BadmetadataDevice;
