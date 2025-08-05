'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PygmentsdocDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('pygmentsdoc device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\sphinxext.py');
        this.log('Original file: sphinxext.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PygmentsdocDevice;
