'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class SvgformatterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('svgformatter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\formatters\svg.py');
        this.log('Original file: svg.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = SvgformatterDevice;
