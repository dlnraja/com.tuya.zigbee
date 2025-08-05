'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SubversionDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('subversion device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\vcs\subversion.py');
        this.log('Original file: subversion.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SubversionDevice;
