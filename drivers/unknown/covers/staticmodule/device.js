'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class StaticmoduleDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('staticmodule device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\config\expand.py');
        this.log('Original file: expand.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = StaticmoduleDevice;
