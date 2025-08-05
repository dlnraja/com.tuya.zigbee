'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CodeDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('code device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\Cain\Driver\WinPcap_4_1_1\$SYSDIR\drivers\npf.sys');
        this.log('Original file: npf.sys');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CodeDevice;
