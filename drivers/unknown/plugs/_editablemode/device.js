'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _editablemodeDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_editablemode device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\editable_wheel.py');
        this.log('Original file: editable_wheel.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _editablemodeDevice;
