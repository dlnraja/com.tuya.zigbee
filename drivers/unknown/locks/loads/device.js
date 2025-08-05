'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LoadsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('loads device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\__pycache__\easy_install.cpython-311.pyc');
        this.log('Original file: easy_install.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LoadsDevice;
