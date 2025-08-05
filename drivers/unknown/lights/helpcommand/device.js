'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class HelpcommandDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('helpcommand device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\commands\help.py');
        this.log('Original file: help.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = HelpcommandDevice;
