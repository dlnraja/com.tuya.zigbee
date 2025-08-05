'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PipdeprecationwarningDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('pipdeprecationwarning device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\utils\deprecation.py');
        this.log('Original file: deprecation.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PipdeprecationwarningDevice;
