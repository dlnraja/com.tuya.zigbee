'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BuildenvironmentDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('buildenvironment device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pep517\envbuild.py');
        this.log('Original file: envbuild.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BuildenvironmentDevice;
