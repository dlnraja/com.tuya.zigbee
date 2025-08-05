'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Utf1632proberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('utf1632prober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\utf1632prober.py');
        this.log('Original file: utf1632prober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Utf1632proberDevice;
