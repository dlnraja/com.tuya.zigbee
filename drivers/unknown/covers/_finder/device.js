'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _finderDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_finder device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\discovery.py');
        this.log('Original file: discovery.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _finderDevice;
