'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class RequireDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('require device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\depends.py');
        this.log('Original file: depends.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = RequireDevice;
