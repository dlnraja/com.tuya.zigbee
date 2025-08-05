'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LegacywindowserrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('legacywindowserror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\_win32_console.py');
        this.log('Original file: _win32_console.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LegacywindowserrorDevice;
