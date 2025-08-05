'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class MultibytecharsetproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('multibytecharsetprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\mbcharsetprober.py');
        this.log('Original file: mbcharsetprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = MultibytecharsetproberDevice;
