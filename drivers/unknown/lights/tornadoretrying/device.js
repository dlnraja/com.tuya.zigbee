'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TornadoretryingDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('tornadoretrying device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\tenacity\tornadoweb.py');
        this.log('Original file: tornadoweb.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TornadoretryingDevice;
