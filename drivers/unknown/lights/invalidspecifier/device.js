'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class InvalidspecifierDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('invalidspecifier device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\packaging\specifiers.py');
        this.log('Original file: specifiers.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = InvalidspecifierDevice;
