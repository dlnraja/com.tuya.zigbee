'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BoxDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('box device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\box.py');
        this.log('Original file: box.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BoxDevice;
