'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class CodeforeventDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('codeforevent device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\Metasploit\Metasploit\msf3\data\msfweb\public\javascripts\effects.js');
        this.log('Original file: effects.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = CodeforeventDevice;
