'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class EsccharsetproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('esccharsetprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\escprober.py');
        this.log('Original file: escprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = EsccharsetproberDevice;
