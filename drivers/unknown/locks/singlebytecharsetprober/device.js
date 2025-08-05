'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SinglebytecharsetproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('singlebytecharsetprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\sbcharsetprober.py');
        this.log('Original file: sbcharsetprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SinglebytecharsetproberDevice;
