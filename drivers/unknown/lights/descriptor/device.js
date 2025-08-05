'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DescriptorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('descriptor device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\distlib\w64-arm.exe');
        this.log('Original file: w64-arm.exe');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DescriptorDevice;
