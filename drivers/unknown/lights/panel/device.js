'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PanelDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('panel device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\panel.py');
        this.log('Original file: panel.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PanelDevice;
