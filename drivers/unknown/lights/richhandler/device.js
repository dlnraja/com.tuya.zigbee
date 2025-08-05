'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class RichhandlerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('richhandler device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\logging.py');
        this.log('Original file: logging.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = RichhandlerDevice;
