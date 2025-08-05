'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class RemotenotfounderrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('remotenotfounderror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\vcs\versioncontrol.py');
        this.log('Original file: versioncontrol.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = RemotenotfounderrorDevice;
