'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LinktypeDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('linktype device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\index\package_finder.py');
        this.log('Original file: package_finder.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LinktypeDevice;
