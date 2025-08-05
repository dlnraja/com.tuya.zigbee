'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ContainsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('contains device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\__pycache__\pretty.cpython-311.pyc');
        this.log('Original file: pretty.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ContainsDevice;
