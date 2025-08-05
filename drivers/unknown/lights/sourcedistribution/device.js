'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SourcedistributionDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('sourcedistribution device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\distributions\sdist.py');
        this.log('Original file: sdist.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SourcedistributionDevice;
