'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class HereDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('here device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\log.py');
        this.log('Original file: log.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = HereDevice;
