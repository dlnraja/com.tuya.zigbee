'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Retry_baseDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('retry_base device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\tenacity\retry.py');
        this.log('Original file: retry.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Retry_baseDevice;
