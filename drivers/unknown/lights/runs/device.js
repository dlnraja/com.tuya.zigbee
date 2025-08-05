'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class RunsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('runs device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\Metasploit\Metasploit\msf3\data\msfweb\public\javascripts\window.js');
        this.log('Original file: window.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = RunsDevice;
