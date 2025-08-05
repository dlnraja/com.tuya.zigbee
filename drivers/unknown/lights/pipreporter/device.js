'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PipreporterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('pipreporter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\resolution\resolvelib\reporter.py');
        this.log('Original file: reporter.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PipreporterDevice;
