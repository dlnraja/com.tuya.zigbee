'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class NoemojiDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('noemoji device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\emoji.py');
        this.log('Original file: emoji.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = NoemojiDevice;
