'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BaseresolverDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('baseresolver device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\resolution\base.py');
        this.log('Original file: base.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BaseresolverDevice;
