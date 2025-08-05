'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Utf8proberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('utf8prober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\utf8prober.py');
        this.log('Original file: utf8prober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Utf8proberDevice;
