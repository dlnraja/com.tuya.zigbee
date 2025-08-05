'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SbcsgroupproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('sbcsgroupprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\sbcsgroupprober.py');
        this.log('Original file: sbcsgroupprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SbcsgroupproberDevice;
