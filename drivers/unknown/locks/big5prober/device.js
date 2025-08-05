'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Big5proberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('big5prober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\big5prober.py');
        this.log('Original file: big5prober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Big5proberDevice;
