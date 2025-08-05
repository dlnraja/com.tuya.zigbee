'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ShouldDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('should device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\util\__pycache__\url.cpython-311.pyc');
        this.log('Original file: url.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ShouldDevice;
