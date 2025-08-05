'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BaseadapterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('baseadapter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\requests\adapters.py');
        this.log('Original file: adapters.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BaseadapterDevice;
