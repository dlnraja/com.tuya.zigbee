'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SuppliedDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('supplied device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\__pycache__\core.cpython-311.pyc');
        this.log('Original file: core.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SuppliedDevice;
