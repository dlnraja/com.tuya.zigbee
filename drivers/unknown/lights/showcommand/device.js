'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ShowcommandDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('showcommand device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\commands\show.py');
        this.log('Original file: show.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ShowcommandDevice;
