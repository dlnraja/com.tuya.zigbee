'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CharsetproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('charsetprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\charsetprober.py');
        this.log('Original file: charsetprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CharsetproberDevice;
