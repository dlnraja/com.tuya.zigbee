'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _bitDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_bit device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\style.py');
        this.log('Original file: style.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _bitDevice;
