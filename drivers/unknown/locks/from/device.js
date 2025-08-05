'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class FromDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('from device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\gui.exe');
        this.log('Original file: gui.exe');
        
        // Register capabilities
        
    }
    
    
}

module.exports = FromDevice;
