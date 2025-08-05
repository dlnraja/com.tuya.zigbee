'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ValidationerrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('validationerror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\config\_validate_pyproject\error_reporting.py');
        this.log('Original file: error_reporting.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ValidationerrorDevice;
