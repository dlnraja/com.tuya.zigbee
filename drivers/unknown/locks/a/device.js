'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ADevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('a device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\universaldetector.py');
        this.log('Original file: universaldetector.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ADevice;
