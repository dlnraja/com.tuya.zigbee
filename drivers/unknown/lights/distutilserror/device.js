'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DistutilserrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('distutilserror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\errors.py');
        this.log('Original file: errors.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DistutilserrorDevice;
