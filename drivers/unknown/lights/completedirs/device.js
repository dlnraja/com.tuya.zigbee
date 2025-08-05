'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CompletedirsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('completedirs device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\zipp.py');
        this.log('Original file: zipp.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CompletedirsDevice;
