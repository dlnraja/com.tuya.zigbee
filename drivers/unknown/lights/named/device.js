'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NamedDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('named device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\__pycache__\cmdline.cpython-311.pyc');
        this.log('Original file: cmdline.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NamedDevice;
