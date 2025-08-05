'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SpinnerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('spinner device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\spinner.py');
        this.log('Original file: spinner.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SpinnerDevice;
