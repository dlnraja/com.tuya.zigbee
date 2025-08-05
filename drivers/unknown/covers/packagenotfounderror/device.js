'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PackagenotfounderrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('packagenotfounderror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\importlib_metadata\__init__.py');
        this.log('Original file: __init__.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PackagenotfounderrorDevice;
