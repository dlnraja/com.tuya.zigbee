'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ExceptDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('except device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\__pycache__\py36compat.cpython-311.pyc');
        this.log('Original file: py36compat.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ExceptDevice;
