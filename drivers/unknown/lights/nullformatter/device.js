'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NullformatterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('nullformatter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\formatters\other.py');
        this.log('Original file: other.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NullformatterDevice;
