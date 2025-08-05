'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ExtensionDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('extension device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\extension.py');
        this.log('Original file: extension.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ExtensionDevice;
