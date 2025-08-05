'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Latin1proberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('latin1prober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\latin1prober.py');
        this.log('Original file: latin1prober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Latin1proberDevice;
