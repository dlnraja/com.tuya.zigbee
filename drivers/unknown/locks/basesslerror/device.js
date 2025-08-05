'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BasesslerrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('basesslerror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\connection.py');
        this.log('Original file: connection.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BasesslerrorDevice;
