'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ScriptmakerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('scriptmaker device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\distlib\scripts.py');
        this.log('Original file: scripts.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ScriptmakerDevice;
