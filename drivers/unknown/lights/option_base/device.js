'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Option_baseDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('option_base device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\setopt.py');
        this.log('Original file: setopt.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Option_baseDevice;
