'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class HttprangerequestunsupportedDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('httprangerequestunsupported device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\network\lazy_wheel.py');
        this.log('Original file: lazy_wheel.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = HttprangerequestunsupportedDevice;
