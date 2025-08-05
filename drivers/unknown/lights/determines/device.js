'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DeterminesDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('determines device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\locations\__pycache__\__init__.cpython-311.pyc');
        this.log('Original file: __init__.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DeterminesDevice;
