'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CanDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('can device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\formatters\__pycache__\html.cpython-311.pyc');
        this.log('Original file: html.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CanDevice;
