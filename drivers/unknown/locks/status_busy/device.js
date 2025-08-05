'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Status_busyDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('status_busy device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\Metasploit\Metasploit\msf3\data\msfweb\public\javascripts\console.js');
        this.log('Original file: console.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Status_busyDevice;
