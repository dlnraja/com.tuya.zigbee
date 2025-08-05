'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CodecDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('codec device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\webencodings\x_user_defined.py');
        this.log('Original file: x_user_defined.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CodecDevice;
