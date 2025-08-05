'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class InstallationcandidateDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('installationcandidate device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\models\candidate.py');
        this.log('Original file: candidate.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = InstallationcandidateDevice;
