'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _refreshthreadDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_refreshthread device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\live.py');
        this.log('Original file: live.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _refreshthreadDevice;
