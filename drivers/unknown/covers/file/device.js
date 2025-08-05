'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class FileDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('file device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\operations\install\wheel.py');
        this.log('Original file: wheel.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = FileDevice;
