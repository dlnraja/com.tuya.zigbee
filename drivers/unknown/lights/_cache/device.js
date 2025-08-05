'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _cacheDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_cache device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\distlib\database.py');
        this.log('Original file: database.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _cacheDevice;
