'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class WincolorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('wincolor device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\colorama\winterm.py');
        this.log('Original file: winterm.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = WincolorDevice;
