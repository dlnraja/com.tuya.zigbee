'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Gb2312proberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('gb2312prober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\gb2312prober.py');
        this.log('Original file: gb2312prober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Gb2312proberDevice;
