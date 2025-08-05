'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TpfnDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('tpfn device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\Metasploit\Metasploit\msf3\external\source\vncdll\winvnc\VideoDriver.cpp');
        this.log('Original file: VideoDriver.cpp');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TpfnDevice;
