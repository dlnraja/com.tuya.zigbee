'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class StasheduninstallpathsetDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('stasheduninstallpathset device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\req\req_uninstall.py');
        this.log('Original file: req_uninstall.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = StasheduninstallpathsetDevice;
