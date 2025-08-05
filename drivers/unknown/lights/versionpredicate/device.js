'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class VersionpredicateDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('versionpredicate device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\versionpredicate.py');
        this.log('Original file: versionpredicate.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = VersionpredicateDevice;
