'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SjisproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('sjisprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\sjisprober.py');
        this.log('Original file: sjisprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SjisproberDevice;
