'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class BuildtrackerDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('buildtracker device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\operations\build\build_tracker.py');
        this.log('Original file: build_tracker.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = BuildtrackerDevice;
