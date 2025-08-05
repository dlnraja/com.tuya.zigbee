'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Cp949proberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('cp949prober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\cp949prober.py');
        this.log('Original file: cp949prober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Cp949proberDevice;
