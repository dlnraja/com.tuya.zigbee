'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class IfDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('if device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\protocol.py');
        this.log('Original file: protocol.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = IfDevice;
