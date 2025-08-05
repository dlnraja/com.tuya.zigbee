'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ThemeDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('theme device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\theme.py');
        this.log('Original file: theme.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ThemeDevice;
