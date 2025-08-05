'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _ansitokenDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_ansitoken device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\ansi.py');
        this.log('Original file: ansi.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _ansitokenDevice;
