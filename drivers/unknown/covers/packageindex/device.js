'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PackageindexDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('packageindex device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\distlib\index.py');
        this.log('Original file: index.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PackageindexDevice;
