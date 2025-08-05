'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DistributionDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('distribution device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\dist.py');
        this.log('Original file: dist.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DistributionDevice;
