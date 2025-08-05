'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class IrcformatterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('ircformatter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\formatters\irc.py');
        this.log('Original file: irc.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = IrcformatterDevice;
