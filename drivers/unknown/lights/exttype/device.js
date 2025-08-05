'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ExttypeDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('exttype device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\msgpack\ext.py');
        this.log('Original file: ext.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ExttypeDevice;
