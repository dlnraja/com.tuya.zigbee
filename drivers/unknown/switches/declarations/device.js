'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DeclarationsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('declarations device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Scripts\Activate.ps1');
        this.log('Original file: Activate.ps1');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DeclarationsDevice;
