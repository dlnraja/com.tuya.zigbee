'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _muslversionDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_muslversion device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\packaging\_musllinux.py');
        this.log('Original file: _musllinux.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _muslversionDevice;
