'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class InstallDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('install device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\install.py');
        this.log('Original file: install.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = InstallDevice;
