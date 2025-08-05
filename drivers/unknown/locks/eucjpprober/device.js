'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class EucjpproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('eucjpprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\eucjpprober.py');
        this.log('Original file: eucjpprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = EucjpproberDevice;
