'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ObjectDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('object device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\contrib\_securetransport\__pycache__\bindings.cpython-311.pyc');
        this.log('Original file: bindings.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ObjectDevice;
