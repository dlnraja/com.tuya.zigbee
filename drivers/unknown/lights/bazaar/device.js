'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BazaarDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('bazaar device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\vcs\bazaar.py');
        this.log('Original file: bazaar.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BazaarDevice;
