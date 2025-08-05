'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ControlDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('control device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\control.py');
        this.log('Original file: control.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ControlDevice;
