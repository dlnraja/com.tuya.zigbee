'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class IsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('is device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\__pycache__\response.cpython-311.pyc');
        this.log('Original file: response.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = IsDevice;
