'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class InDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('in device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\utils\compat.py');
        this.log('Original file: compat.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = InDevice;
