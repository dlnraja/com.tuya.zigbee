'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LinksourceDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('linksource device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\index\sources.py');
        this.log('Original file: sources.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LinksourceDevice;
