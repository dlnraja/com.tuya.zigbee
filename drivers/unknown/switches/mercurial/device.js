'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class MercurialDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('mercurial device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\vcs\mercurial.py');
        this.log('Original file: mercurial.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = MercurialDevice;
