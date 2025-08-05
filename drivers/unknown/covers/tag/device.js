'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TagDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('tag device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\markup.py');
        this.log('Original file: markup.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TagDevice;
