'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CallbackfilewrapperDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('callbackfilewrapper device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\cachecontrol\filewrapper.py');
        this.log('Original file: filewrapper.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CallbackfilewrapperDevice;
