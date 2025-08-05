'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class MbcsgroupproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('mbcsgroupprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\mbcsgroupprober.py');
        this.log('Original file: mbcsgroupprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = MbcsgroupproberDevice;
