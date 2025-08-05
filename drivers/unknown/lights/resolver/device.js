'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ResolverDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('resolver device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\resolution\resolvelib\resolver.py');
        this.log('Original file: resolver.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ResolverDevice;
