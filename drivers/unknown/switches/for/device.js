'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ForDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('for device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\msvccompiler.py');
        this.log('Original file: msvccompiler.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ForDevice;
