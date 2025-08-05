'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ReturningDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('returning device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\__pycache__\package_index.cpython-311.pyc');
        this.log('Original file: package_index.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ReturningDevice;
