'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class EdgeDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('edge device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\_ratio.py');
        this.log('Original file: _ratio.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = EdgeDevice;
