'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class RlockDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('rlock device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\_collections.py');
        this.log('Original file: _collections.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = RlockDevice;
