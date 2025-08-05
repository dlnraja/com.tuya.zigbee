'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Bdist_rpmDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('bdist_rpm device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\bdist_rpm.py');
        this.log('Original file: bdist_rpm.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Bdist_rpmDevice;
