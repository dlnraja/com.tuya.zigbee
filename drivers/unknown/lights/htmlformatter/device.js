'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class HtmlformatterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('htmlformatter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\formatters\html.py');
        this.log('Original file: html.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = HtmlformatterDevice;
