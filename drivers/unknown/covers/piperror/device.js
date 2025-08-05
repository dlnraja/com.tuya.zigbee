'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PiperrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('piperror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\exceptions.py');
        this.log('Original file: exceptions.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PiperrorDevice;
