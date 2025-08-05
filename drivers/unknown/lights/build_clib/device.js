'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Build_clibDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('build_clib device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\build_clib.py');
        this.log('Original file: build_clib.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Build_clibDevice;
