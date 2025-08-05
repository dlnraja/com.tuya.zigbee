'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class OfDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('of device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\__pycache__\exceptions.cpython-311.pyc');
        this.log('Original file: exceptions.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = OfDevice;
