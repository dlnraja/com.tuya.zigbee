'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class RecursivelyDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('recursively device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\glob.py');
        this.log('Original file: glob.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = RecursivelyDevice;
