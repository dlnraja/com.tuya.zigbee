'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class InstallerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('installer device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\namespaces.py');
        this.log('Original file: namespaces.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = InstallerDevice;
