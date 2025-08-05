'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PagerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('pager device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\pager.py');
        this.log('Original file: pager.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PagerDevice;
