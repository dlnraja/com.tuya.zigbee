'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Pep440warningDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('pep440warning device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pkg_resources\__init__.py');
        this.log('Original file: __init__.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Pep440warningDevice;
