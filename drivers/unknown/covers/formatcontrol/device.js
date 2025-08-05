'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class FormatcontrolDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('formatcontrol device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\models\format_control.py');
        this.log('Original file: format_control.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = FormatcontrolDevice;
