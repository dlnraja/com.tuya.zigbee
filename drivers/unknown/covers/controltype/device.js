'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ControltypeDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('controltype device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\segment.py');
        this.log('Original file: segment.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ControltypeDevice;
