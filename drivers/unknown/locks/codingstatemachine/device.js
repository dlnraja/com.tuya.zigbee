'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CodingstatemachineDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('codingstatemachine device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\codingstatemachine.py');
        this.log('Original file: codingstatemachine.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CodingstatemachineDevice;
