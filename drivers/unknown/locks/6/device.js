'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class 6Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('6 device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\mbcssm.py');
        this.log('Original file: mbcssm.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = 6Device;
