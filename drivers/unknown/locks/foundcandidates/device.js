'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class FoundcandidatesDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('foundcandidates device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\resolution\resolvelib\found_candidates.py');
        this.log('Original file: found_candidates.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = FoundcandidatesDevice;
