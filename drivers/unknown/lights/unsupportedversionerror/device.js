'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class UnsupportedversionerrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('unsupportedversionerror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\distlib\version.py');
        this.log('Original file: version.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = UnsupportedversionerrorDevice;
