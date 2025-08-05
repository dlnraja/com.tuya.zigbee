'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NameDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('name device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pyparsing\common.py');
        this.log('Original file: common.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NameDevice;
