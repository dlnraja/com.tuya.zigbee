'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ThatDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('that device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\contrib\securetransport.py');
        this.log('Original file: securetransport.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ThatDevice;
