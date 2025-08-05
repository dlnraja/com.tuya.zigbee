'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DevelopDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('develop device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\develop.py');
        this.log('Original file: develop.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DevelopDevice;
