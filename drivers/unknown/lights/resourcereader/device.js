'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ResourcereaderDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('resourcereader device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\importlib_resources\abc.py');
        this.log('Original file: abc.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ResourcereaderDevice;
