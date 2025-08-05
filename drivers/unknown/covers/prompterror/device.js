'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PrompterrorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('prompterror device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\rich\prompt.py');
        this.log('Original file: prompt.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PrompterrorDevice;
