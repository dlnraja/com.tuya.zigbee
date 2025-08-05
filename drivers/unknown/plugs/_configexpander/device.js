'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _configexpanderDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_configexpander device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\config\pyprojecttoml.py');
        this.log('Original file: pyprojecttoml.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _configexpanderDevice;
