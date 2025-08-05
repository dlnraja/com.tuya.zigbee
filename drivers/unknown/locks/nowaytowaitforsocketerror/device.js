'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NowaytowaitforsocketerrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('nowaytowaitforsocketerror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\util\wait.py');
        this.log('Original file: wait.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NowaytowaitforsocketerrorDevice;
