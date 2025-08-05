'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class UnsupportedextensionDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('unsupportedextension device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\contrib\pyopenssl.py');
        this.log('Original file: pyopenssl.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = UnsupportedextensionDevice;
