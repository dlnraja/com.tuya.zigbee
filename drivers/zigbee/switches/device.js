'use strict';

const { ZigbeeDevice } = require('homey-zigbee');

class Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log(' device initialized');
        this.log('Source: D:\Download\Compressed\x86_64-pc-windows-gnu\tool_config_files\build-repo-builds\plugins\VirtualSMC.json');
        this.log('Original file: VirtualSMC.json');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Device;
