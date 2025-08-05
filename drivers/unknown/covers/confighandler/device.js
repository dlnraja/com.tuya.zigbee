'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ConfighandlerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('confighandler device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\config\setupcfg.py');
        this.log('Original file: setupcfg.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ConfighandlerDevice;
