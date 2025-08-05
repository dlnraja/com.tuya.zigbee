'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ClassDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('class device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\traceback.py');
        this.log('Original file: traceback.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ClassDevice;
