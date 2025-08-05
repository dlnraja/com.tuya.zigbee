'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SimplyDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('simply device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\__pycache__\utf1632prober.cpython-311.pyc');
        this.log('Original file: utf1632prober.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SimplyDevice;
