'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class OrderedsetDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('orderedset device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\ordered_set.py');
        this.log('Original file: ordered_set.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = OrderedsetDevice;
