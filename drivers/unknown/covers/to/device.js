'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ToDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('to device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\utils\misc.py');
        this.log('Original file: misc.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ToDevice;
