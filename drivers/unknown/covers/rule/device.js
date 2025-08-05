'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class RuleDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('rule device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\rule.py');
        this.log('Original file: rule.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = RuleDevice;
