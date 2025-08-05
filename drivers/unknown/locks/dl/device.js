'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DlDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('dl device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\Metasploit\Metasploit\lib\ruby\gems\1.9.1\gems\sqlite3-ruby-1.2.5\lib\sqlite3\driver\dl\driver.rb');
        this.log('Original file: driver.rb');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DlDevice;
