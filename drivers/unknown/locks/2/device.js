'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class 2Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('2 device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\certifi\cacert.pem');
        this.log('Original file: cacert.pem');
        
        // Register capabilities
        
    }
    
    
}

module.exports = 2Device;
