'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class WindowtitleDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('windowtitle device initialized');
        this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\WMIProvider\ME\html\cover.html');
        this.log('Original file: cover.html');
        
        // Register capabilities
        
    }
    
    
}

module.exports = WindowtitleDevice;
