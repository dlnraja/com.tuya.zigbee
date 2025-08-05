'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SpecloaderadapterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('specloaderadapter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\importlib_resources\_adapters.py');
        this.log('Original file: _adapters.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SpecloaderadapterDevice;
