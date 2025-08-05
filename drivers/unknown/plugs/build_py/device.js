'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Build_pyDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('build_py device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\build_py.py');
        this.log('Original file: build_py.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Build_pyDevice;
