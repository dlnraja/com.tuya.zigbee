'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class InvalidwheelfilenameDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('invalidwheelfilename device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\packaging\utils.py');
        this.log('Original file: utils.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = InvalidwheelfilenameDevice;
