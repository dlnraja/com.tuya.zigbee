'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Easy_installDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('easy_install device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\easy_install.py');
        this.log('Original file: easy_install.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Easy_installDevice;
