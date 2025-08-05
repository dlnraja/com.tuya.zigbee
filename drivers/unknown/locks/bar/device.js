'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BarDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('bar device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\bar.py');
        this.log('Original file: bar.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BarDevice;
