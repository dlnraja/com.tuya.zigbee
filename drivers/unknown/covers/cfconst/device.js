'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CfconstDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('cfconst device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\contrib\_securetransport\bindings.py');
        this.log('Original file: bindings.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CfconstDevice;
