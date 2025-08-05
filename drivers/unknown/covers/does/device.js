'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DoesDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('does device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\__pycache__\build_meta.cpython-311.pyc');
        this.log('Original file: build_meta.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DoesDevice;
