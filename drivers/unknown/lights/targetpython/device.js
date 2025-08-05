'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TargetpythonDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('targetpython device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\models\target_python.py');
        this.log('Original file: target_python.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TargetpythonDevice;
