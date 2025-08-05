'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class FilereaderDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('filereader device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\importlib_resources\readers.py');
        this.log('Original file: readers.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = FilereaderDevice;
