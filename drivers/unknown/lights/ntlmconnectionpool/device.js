'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NtlmconnectionpoolDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('ntlmconnectionpool device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\contrib\ntlmpool.py');
        this.log('Original file: ntlmpool.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NtlmconnectionpoolDevice;
