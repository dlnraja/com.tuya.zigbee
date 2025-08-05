'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BasedDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('based device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\__pycache__\dep_util.cpython-311.pyc');
        this.log('Original file: dep_util.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BasedDevice;
