'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class JohabproberDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('johabprober device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\johabprober.py');
        this.log('Original file: johabprober.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = JohabproberDevice;
