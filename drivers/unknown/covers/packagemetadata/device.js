'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PackagemetadataDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('packagemetadata device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\importlib_metadata\_meta.py');
        this.log('Original file: _meta.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PackagemetadataDevice;
