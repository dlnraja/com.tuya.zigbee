'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class IsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('is device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\util\connection.py');
        this.log('Original file: connection.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = IsDevice;
