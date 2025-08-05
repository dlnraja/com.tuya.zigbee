'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LocalfsadapterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('localfsadapter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\network\session.py');
        this.log('Original file: session.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LocalfsadapterDevice;
